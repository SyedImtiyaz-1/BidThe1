import { createHmac, timingSafeEqual } from 'node:crypto'
import { q, num } from './db'
import { BASE_CURRENCY } from './config'

export type ApplyInput = {
  listingId: string
  provider: string
  providerRef: string
  amountMinor: number
  displayCurrency?: string
  displayMinor?: number | null
  fxRate?: number | null
  rankQuoted?: number | null
}

/**
 * One statement does atomicity and webhook idempotency at once.
 *
 * The unique index on (provider, provider_ref) means a retried or duplicated
 * webhook inserts nothing, the CTE yields no rows, and the update never runs.
 * No application-level "have I seen this event" bookkeeping, and no transaction
 * needed, which also means it works over drivers that cannot do interactive
 * transactions.
 *
 * Returns null when the event was already processed.
 *
 * Do not "improve" this by reading the inserted payment row back inside the
 * same statement. CTE sub-statements share one snapshot, so the outer query
 * would see nothing and every real payment would be misread as a duplicate.
 * It works because the UPDATE targets a different table from the INSERT.
 */
export async function applyPayment(
  input: ApplyInput,
): Promise<{ listingId: string; totalMinor: number } | null> {
  const rows = await q<{ id: string; total_minor: string }>(
    `with applied as (
       insert into payments (
         listing_id, provider, provider_ref, amount_minor, base_currency,
         display_currency, display_minor, fx_rate, rank_quoted, status
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confirmed')
       on conflict (provider, provider_ref) do nothing
       returning listing_id, amount_minor
     )
     update listings l
        set total_minor      = l.total_minor + a.amount_minor,
            -- publish a pending listing, but never resurrect one that was
            -- hidden by moderation: a Rs 99 top-up must not undo a takedown
            status           = case when l.status = 'pending' then 'live' else l.status end,
            first_reached_at = case
                                 when l.total_minor + a.amount_minor > l.peak_minor
                                 then now() else l.first_reached_at
                               end,
            peak_minor       = greatest(l.peak_minor, l.total_minor + a.amount_minor)
       from applied a
      where l.id = a.listing_id
      returning l.id, l.total_minor`,
    [
      input.listingId,
      input.provider,
      input.providerRef,
      input.amountMinor,
      BASE_CURRENCY,
      input.displayCurrency ?? BASE_CURRENCY,
      input.displayMinor ?? null,
      input.fxRate ?? null,
      input.rankQuoted ?? null,
    ],
  )

  const row = rows[0]
  if (!row) return null
  return { listingId: row.id, totalMinor: num(row.total_minor) }
}

/**
 * The published refund policy promises money back in four situations, and a
 * chargeback can arrive whether we like it or not. Both have to move the board,
 * or a refunded listing keeps a rank it no longer paid for.
 */
export async function reversePayment(
  providerRef: string,
  provider: string,
  status: 'refunded' | 'disputed',
  amountMinor?: number,
): Promise<{ listingId: string; totalMinor: number } | null> {
  const rows = await q<{ id: string; total_minor: string }>(
    `with reversed as (
       update payments
          set status = $3
        where provider = $2 and provider_ref = $1 and status = 'confirmed'
        returning listing_id, coalesce($4::bigint, amount_minor) as amount_minor
     )
     update listings l
        set total_minor = greatest(0, l.total_minor - r.amount_minor),
            peak_minor  = greatest(0, l.total_minor - r.amount_minor)
       from reversed r
      where l.id = r.listing_id
      returning l.id, l.total_minor`,
    [providerRef, provider, status, amountMinor ?? null],
  )
  const row = rows[0]
  if (!row) return null
  return { listingId: row.id, totalMinor: num(row.total_minor) }
}

/**
 * Put a reversed payment back on the board.
 *
 * A dispute is not a refund. It can be won, cancelled or left to expire, and in
 * every one of those cases the money stays with us, so the rank has to come
 * back. Without this a listing that won its dispute would sit demoted forever.
 *
 * Guarded on status = 'disputed' so a genuine refund is never resurrected.
 */
export async function restorePayment(
  providerRef: string,
  provider: string,
): Promise<{ listingId: string; totalMinor: number } | null> {
  const rows = await q<{ id: string; total_minor: string }>(
    `with restored as (
       update payments
          set status = 'confirmed'
        where provider = $2 and provider_ref = $1 and status = 'disputed'
        returning listing_id, amount_minor
     )
     update listings l
        set total_minor      = l.total_minor + r.amount_minor,
            first_reached_at = case
                                 when l.total_minor + r.amount_minor > l.peak_minor
                                 then now() else l.first_reached_at
                               end,
            peak_minor       = greatest(l.peak_minor, l.total_minor + r.amount_minor)
       from restored r
      where l.id = r.listing_id
      returning l.id, l.total_minor`,
    [providerRef, provider],
  )
  const row = rows[0]
  if (!row) return null
  return { listingId: row.id, totalMinor: num(row.total_minor) }
}

export function dodoConfigured(): boolean {
  return Boolean(process.env.DODO_API_KEY && process.env.DODO_PRODUCT_ID)
}

function dodoBase(): string {
  return process.env.DODO_MODE === 'live'
    ? 'https://live.dodopayments.com'
    : 'https://test.dodopayments.com'
}

export type Order =
  | { provider: 'dodo'; orderId: string; checkoutUrl: string; amountMinor: number }
  | { provider: 'mock'; orderId: string; amountMinor: number }

/**
 * Dodo when the keys are present, a local stand-in when they are not.
 *
 * The stand-in exists so the whole loop is testable before the merchant account
 * is approved. Nothing downstream knows the difference: both paths end at
 * applyPayment with a provider reference.
 */
export async function createOrder(args: {
  listingId: string
  amountMinor: number
  returnUrl?: string
  notes?: Record<string, string>
}): Promise<Order> {
  if (!dodoConfigured()) {
    return {
      provider: 'mock',
      orderId: `mock_${args.listingId.slice(0, 8)}_${args.amountMinor}_${Date.now()}`,
      amountMinor: args.amountMinor,
    }
  }

  const res = await fetch(`${dodoBase()}/checkouts`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.DODO_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      product_cart: [
        {
          product_id: process.env.DODO_PRODUCT_ID,
          quantity: 1,
          // Pay-what-you-want amount, in the smallest unit. This is set by the
          // server so the buyer cannot choose their own price.
          amount: args.amountMinor,
        },
      ],
      billing_currency: BASE_CURRENCY,
      return_url: args.returnUrl,
      // The ledger credits from metadata, never from the amount Dodo reports.
      // If Dodo settles in a different currency its reported total is in that
      // currency's minor unit, and crediting that as paise would be wrong by
      // roughly a factor of 85.
      metadata: {
        listing_id: args.listingId,
        amount_minor: String(args.amountMinor),
        base_currency: BASE_CURRENCY,
        ...args.notes,
      },
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    throw new Error(`dodo checkout failed: ${res.status} ${await res.text()}`)
  }

  const session = (await res.json()) as {
    session_id: string
    checkout_url: string | null
    payment_id: string | null
  }

  if (!session.checkout_url) {
    throw new Error('dodo returned no checkout url')
  }

  return {
    provider: 'dodo',
    orderId: session.session_id,
    checkoutUrl: session.checkout_url,
    amountMinor: args.amountMinor,
  }
}

/**
 * Standard Webhooks verification, which is what Dodo implements.
 *
 * The signed content is `id.timestamp.body` and the secret is base64 after its
 * `whsec_` prefix. Verify against the RAW body: parsing the JSON first and
 * re-serialising it produces different bytes and the signature will not match.
 */
export function verifyWebhook(rawBody: string, headers: Headers): boolean {
  const secret = process.env.DODO_WEBHOOK_SECRET
  const id = headers.get('webhook-id')
  const timestamp = headers.get('webhook-timestamp')
  const header = headers.get('webhook-signature')
  if (!secret || !id || !timestamp || !header) return false

  // Reject replays. Standard Webhooks suggests a five minute window.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > 300) return false

  const key = secret.startsWith('whsec_')
    ? Buffer.from(secret.slice(6), 'base64')
    : Buffer.from(secret, 'utf8')

  const expected = createHmac('sha256', key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest('base64')

  // The header is a space-separated list of `v1,<signature>` pairs.
  for (const part of header.split(' ')) {
    const [version, signature] = part.split(',')
    if (version !== 'v1' || !signature) continue
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(signature, 'utf8')
    if (a.length === b.length && timingSafeEqual(a, b)) return true
  }
  return false
}

export type Reconciled =
  | { state: 'applied'; listingId: string; totalMinor: number }
  | { state: 'already'; listingId: string }
  | { state: 'not_succeeded'; status: string }
  | { state: 'unknown' }

const reconciled = new Map<string, { at: number; result: Reconciled }>()

/**
 * Ask Dodo about one payment and credit it if it succeeded.
 *
 * The webhook is the normal path, and it stays the normal path. But a webhook
 * can arrive late, be rejected by a stale secret, or be misconfigured, and the
 * buyer is standing on the return page while that plays out. So the return
 * page asks Dodo directly.
 *
 * Dodo's authenticated API is the source of truth here, not the query string.
 * The payment id from the URL only says which record to look up; every field
 * that moves money comes from Dodo's response. Idempotent through the unique
 * index in applyPayment, so a webhook landing a second later credits nothing
 * twice. Results are held for a minute so a reload does not become an API
 * call per refresh.
 */
export async function reconcileDodoPayment(paymentId: string): Promise<Reconciled> {
  if (!dodoConfigured() || !/^pay_[A-Za-z0-9_-]{6,64}$/.test(paymentId)) return { state: 'unknown' }

  const hit = reconciled.get(paymentId)
  if (hit && Date.now() - hit.at < 60_000) return hit.result

  const res = await fetch(`${dodoBase()}/payments/${paymentId}`, {
    headers: { authorization: `Bearer ${process.env.DODO_API_KEY}` },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  })
  if (!res.ok) return { state: 'unknown' }

  const p = (await res.json()) as {
    status?: string
    currency?: string
    total_amount?: number
    metadata?: Record<string, string>
  }

  let result: Reconciled
  if (p.status !== 'succeeded') {
    result = { state: 'not_succeeded', status: p.status ?? 'unknown' }
  } else {
    const listingId = p.metadata?.listing_id
    const amountMinor = Number(p.metadata?.amount_minor)
    if (!listingId || !Number.isFinite(amountMinor) || amountMinor <= 0) {
      result = { state: 'unknown' }
    } else {
      const applied = await applyPayment({
        listingId,
        provider: 'dodo',
        providerRef: paymentId,
        amountMinor,
        displayCurrency: p.currency ?? undefined,
        displayMinor: Number.isFinite(Number(p.total_amount)) ? Number(p.total_amount) : null,
      })
      result = applied ? { state: 'applied', ...applied } : { state: 'already', listingId }
    }
  }
  // Hold only the terminal answers. A transient error or a payment still
  // processing is asked again on the next load rather than remembered.
  if (result.state === 'applied' || result.state === 'already') {
    reconciled.set(paymentId, { at: Date.now(), result })
  }
  return result
}

/**
 * The same thing, when all we know is which listing the buyer came back for.
 *
 * The return URL should carry the payment id, but a redirect is the one part
 * of the flow we do not control, so this does not depend on it. Dodo's recent
 * payments are scanned for succeeded ones tagged with this listing and each is
 * applied. Idempotent for the same reason as above. Volume makes a page of
 * twenty more than enough; when it does not, the payment id path is the one
 * that carries the load.
 */
export async function reconcileListing(listingId: string): Promise<Reconciled> {
  if (!dodoConfigured() || !/^[0-9a-f-]{36}$/.test(listingId)) return { state: 'unknown' }

  const res = await fetch(`${dodoBase()}/payments?page_size=20`, {
    headers: { authorization: `Bearer ${process.env.DODO_API_KEY}` },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  })
  if (!res.ok) return { state: 'unknown' }

  const page = (await res.json()) as {
    items?: { payment_id: string; status?: string; metadata?: Record<string, string> }[]
  }
  const mine = (page.items ?? []).filter(
    (p) => p.status === 'succeeded' && p.metadata?.listing_id === listingId,
  )
  if (mine.length === 0) {
    const pending = (page.items ?? []).find((p) => p.metadata?.listing_id === listingId)
    return pending ? { state: 'not_succeeded', status: pending.status ?? 'unknown' } : { state: 'unknown' }
  }

  let result: Reconciled = { state: 'already', listingId }
  for (const p of mine) {
    const r = await reconcileDodoPayment(p.payment_id)
    if (r.state === 'applied') result = r
  }
  return result
}
