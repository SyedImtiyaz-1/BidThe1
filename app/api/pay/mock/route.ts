import { NextResponse } from 'next/server'
import { one, num } from '@/lib/db'
import { applyPayment, dodoConfigured } from '@/lib/payments'

/**
 * Stand-in for the real gateway so the whole loop is testable before the Dodo
 * account is approved. It switches itself off the moment Dodo keys exist, so it
 * cannot be left enabled by accident in production.
 */
export async function POST(req: Request) {
  if (dodoConfigured()) {
    return NextResponse.json({ error: 'Not available.' }, { status: 404 })
  }

  const { orderId, listingId } = (await req.json().catch(() => ({}))) as {
    orderId?: string
    listingId?: string
  }
  if (!orderId || !listingId) {
    return NextResponse.json({ error: 'Missing order.' }, { status: 400 })
  }

  // The amount is encoded in the stand-in order id, so the browser still cannot
  // choose what it pays.
  const amountMinor = Number(orderId.split('_')[2])
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
    return NextResponse.json({ error: 'Bad order.' }, { status: 400 })
  }

  const listing = await one<Record<string, any>>(`select id from listings where id = $1`, [listingId])
  if (!listing) return NextResponse.json({ error: 'Unknown listing.' }, { status: 404 })

  const applied = await applyPayment({
    listingId,
    provider: 'mock',
    providerRef: orderId,
    amountMinor,
  })

  return NextResponse.json({ ok: true, totalMinor: applied ? applied.totalMinor : null })
}
