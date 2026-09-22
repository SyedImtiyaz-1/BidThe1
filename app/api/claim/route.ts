import { NextResponse } from 'next/server'
import { q, one, num } from '@/lib/db'
import { fetchMeta, slugFromHost } from '@/lib/meta'
import { createOrder } from '@/lib/payments'
import { getLeader, priceToLead, projectedRank } from '@/lib/rank'
import { MAX_PAYMENT_MINOR, MIN_FIRST_PAYMENT_MINOR, MIN_PAYMENT_MINOR, PICKABLE_CATEGORIES } from '@/lib/config'
import { clientIp, visitorHash } from '@/lib/hash'

const RATE_LIMIT = 12

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    url?: string
    category?: string
    kind?: string
    amountMinor?: number
  }

  const ip = clientIp(req.headers)
  const who = visitorHash(ip, req.headers.get('user-agent') ?? '')

  // Cheap per-visitor ceiling. Enough to stop a loop, not enough to annoy.
  const recent = await one<{ n: string }>(
    `select count(*)::int as n from listings
      where created_at > now() - interval '1 hour' and slug like $1`,
    [`%-${who.slice(0, 6)}`],
  )
  if (num(recent?.n) > RATE_LIMIT) {
    return NextResponse.json({ error: 'Too many attempts. Try again in an hour.' }, { status: 429 })
  }

  const meta = await fetchMeta(body.url ?? '')
  if (!meta) {
    return NextResponse.json(
      { error: 'That does not look like a working link. Use https and a real domain.' },
      { status: 400 },
    )
  }

  if (!PICKABLE_CATEGORIES.some((c) => c.slug === body.category)) {
    return NextResponse.json({ error: 'Choose a category.' }, { status: 400 })
  }
  const category = body.category!

  // Detection is a default, not a verdict. Whoever is paying knows whether
  // they are selling an app, so their answer wins when they give one.
  const kind = body.kind === 'app' || body.kind === 'website' ? body.kind : meta.kind

  // One listing per product. The key is the host for an ordinary site, but
  // carries a path segment for platforms like x.com and apps.apple.com, where
  // the host alone would merge every product on the platform into one row.
  let listing = await one<Record<string, any>>(
    `select * from listings where listing_key = $1 and status in ('live','pending')`,
    [meta.key],
  )

  if (!listing) {
    const base = slugFromHost(meta.key.includes('/') ? meta.key.replace('/', '-') : meta.host)
    const taken = await q<{ slug: string }>(
      `select slug from listings where slug = $1 or slug like $2`,
      [base, `${base}-%`],
    )
    const slug = taken.length === 0 ? base : `${base}-${taken.length + 1}`

    // `do update` rather than `do nothing` so a concurrent submission of the
    // same product returns the existing row instead of failing the request.
    listing = await one<Record<string, any>>(
      `insert into listings
         (listing_key, slug, url, host, title, tagline, icon_url, category, kind, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       on conflict (listing_key) do update set url = listings.url
       returning *`,
      [meta.key, slug, meta.url, meta.host, meta.title, meta.tagline, meta.iconUrl, category, kind],
    )
  }

  if (!listing) {
    return NextResponse.json({ error: 'Could not create the listing.' }, { status: 500 })
  }

  const myTotal = num(listing.total_minor)
  const leader = await getLeader()

  /**
   * The price is computed here and never taken from the request. A price posted
   * by the browser is a free rank.
   */
  const suggested = priceToLead(leader?.total_minor ?? 0, myTotal)
  const asked = Number(body.amountMinor)
  const floor = myTotal > 0 ? MIN_PAYMENT_MINOR : MIN_FIRST_PAYMENT_MINOR
  const amountMinor = Number.isFinite(asked) && asked >= floor
    ? Math.min(Math.round(asked), MAX_PAYMENT_MINOR)
    : suggested

  const rankProjected = await projectedRank(listing.id, myTotal, amountMinor)
  const origin = new URL(req.url).origin
  const order = await createOrder({
    listingId: listing.id,
    amountMinor,
    returnUrl: `${origin}/?claimed=${encodeURIComponent(listing.slug)}`,
  })

  return NextResponse.json({
    listingId: listing.id,
    title: listing.title,
    amountMinor,
    rankProjected,
    order,
  })
}
