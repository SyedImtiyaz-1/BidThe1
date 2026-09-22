import { NextResponse } from 'next/server'
import { applyPayment, restorePayment, reversePayment, verifyWebhook } from '@/lib/payments'

/**
 * The only thing that credits money.
 *
 * The browser is redirected back from Dodo's hosted checkout, but that redirect
 * is presentation. Anything the client reports can be replayed or fabricated,
 * so the board moves on a signed webhook or it does not move.
 */
export async function POST(req: Request) {
  // Raw body. Re-serialised JSON does not byte-match what was signed.
  const raw = await req.text()

  if (!verifyWebhook(raw, req.headers)) {
    return NextResponse.json({ error: 'bad signature' }, { status: 400 })
  }

  let event: any
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'bad body' }, { status: 400 })
  }

  const type: string = event?.type ?? ''
  const data = event?.data ?? {}

  // Money going backwards. A refunded or charged-back listing has to drop to
  // whatever its remaining money buys, or the board shows a rank nobody paid
  // for. Totals are a running sum, so this is a subtraction, not a delete.
  const paymentId: string | undefined = data.payment_id

  // Money leaves us: take the rank down with it.
  const TAKES_MONEY = new Set([
    'refund.succeeded',
    'dispute.opened',
    'dispute.lost',
    'dispute.accepted',
  ])

  // Money stays with us after all: put the rank back. A dispute that is won,
  // cancelled or expired never cost us anything.
  const GIVES_IT_BACK = new Set([
    'dispute.won',
    'dispute.cancelled',
    'dispute.expired',
  ])

  if (paymentId && TAKES_MONEY.has(type)) {
    await reversePayment(paymentId, 'dodo', type.startsWith('refund.') ? 'refunded' : 'disputed')
    return NextResponse.json({ ok: true })
  }

  if (paymentId && GIVES_IT_BACK.has(type)) {
    await restorePayment(paymentId, 'dodo')
    return NextResponse.json({ ok: true })
  }

  // refund.failed, dispute.challenged, payment.failed and payment.cancelled all
  // need no action: nothing was ever credited, or nothing has moved yet.
  if (type.startsWith('refund.') || type.startsWith('dispute.')) {
    return NextResponse.json({ ok: true, noop: type })
  }

  if (type !== 'payment.succeeded') {
    // Acknowledge everything else so Dodo stops retrying it.
    return NextResponse.json({ ok: true, ignored: type })
  }

  const meta = data.metadata ?? {}
  const listingId: string | undefined = meta.listing_id

  /**
   * Credit the amount we asked for, carried in metadata, not the total Dodo
   * reports. Dodo is a merchant of record and may settle in another currency,
   * in which case its reported total is in that currency's minor unit. Treating
   * USD cents as paise would inflate a rank by roughly 85 times.
   */
  const amountMinor = Number(meta.amount_minor)

  if (!listingId || !paymentId || !Number.isFinite(amountMinor) || amountMinor <= 0) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }

  // Duplicate deliveries land on the unique index and change nothing.
  await applyPayment({
    listingId,
    provider: 'dodo',
    providerRef: paymentId,
    amountMinor,
    displayCurrency: data.currency ?? undefined,
    displayMinor: Number.isFinite(Number(data.total_amount)) ? Number(data.total_amount) : null,
  })

  return NextResponse.json({ ok: true })
}
