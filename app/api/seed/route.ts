import { NextResponse } from 'next/server'
import { q } from '@/lib/db'
import { faviconUrl, slugify } from '@/lib/meta'

/**
 * Nobody pays to be number one of nothing, so the board needs to be plausible
 * before a stranger sees it. Gated on ADMIN_TOKEN.
 */
const SEED = [
  ['cursor.com',     'Cursor',           'The AI code editor built to make you extraordinarily productive.', 'ai',           8415000, 60785, 21],
  ['linear.app',     'Linear',           'Plan and build products. Issue tracking that stays out of the way.', 'productivity', 6200000, 41220, 28],
  ['resend.com',     'Resend',           'The email API for developers. Send from your own domain in minutes.', 'developer',   4150000, 33104, 35],
  ['framer.com',     'Framer',           'Design and publish a real site without writing the front end.',      'design',       2899900, 28770, 12],
  ['posthog.com',    'PostHog',          'Product analytics, session replay and feature flags in one place.',  'developer',    1900000, 24011, 44],
  ['raycast.com',    'Raycast',          'A launcher that replaces a dozen small apps on your Mac.',           'productivity', 1250000, 19884,  9],
  ['supabase.com',   'Supabase',         'Postgres with auth, storage and realtime, on a free tier.',          'developer',     940000, 17220, 52],
  ['figma.com',      'Figma',            'Design, prototype and hand off in the browser.',                     'design',        725000, 14903, 31],
  ['notion.so',      'Notion',           'Docs, wikis and light databases in one workspace.',                  'productivity',  510000, 11470, 17],
  ['zerodha.com',    'Zerodha',          'Flat fee broking. India largest retail brokerage by volume.',        'finance',       400000,  9312, 61],
  ['dodopayments.com','Dodo Payments',   'Merchant of record for global sales. One integration, tax handled.',  'finance',       320000,  8004,  6],
  ['cal.com',        'Cal.com',          'Open source scheduling you can host yourself.',                      'productivity',  249900,  6650, 25],
  ['tally.so',       'Tally',            'Forms that work like a doc. Free for unlimited responses.',          'marketing',     180000,  5121, 40],
  ['plausible.io',   'Plausible',        'Privacy friendly analytics. No cookies, 1 KB script.',               'marketing',      99900,  3980, 14],
  ['hey.com',        'HEY',              'Email that is opinionated about what belongs in an inbox.',          'other',          79900,  2410, 48],
  ['excalidraw.com', 'Excalidraw',       'Hand drawn style whiteboarding that loads instantly.',               'design',         49900,  1702,  3],
] as const

export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'nope' }, { status: 401 })
  }

  // ?reset=1 wipes first. Handy while building, and the only way to re-run the
  // seed once listings exist.
  if (new URL(req.url).searchParams.get('reset') === '1') {
    await q(`delete from payments where provider = 'seed'`)
    await q(`delete from listings where id not in (select listing_id from payments)`)
  }

  let inserted = 0
  for (const [host, title, tagline, category, totalMinor, clicks, daysAgo] of SEED) {
    const existing = await q(`select id from listings where host = $1`, [host])
    if (existing.length > 0) continue

    const rows = await q<{ id: string }>(
      `insert into listings
         (listing_key, slug, url, host, title, tagline, icon_url, category, status,
          total_minor, peak_minor, click_count, first_reached_at, created_at)
       values ($3,$1,$2,$3,$4,$5,$6,$7,'live',$8,$8,$9,
               now() - ($10 || ' days')::interval,
               now() - ($10 || ' days')::interval)
       returning id`,
      [
        slugify(title), `https://${host}`, host, title, tagline,
        faviconUrl(host), category, totalMinor, clicks, String(daysAgo),
      ],
    )
    const id = rows[0]?.id
    if (!id) continue

    // A matching ledger row so the reconciliation query balances and today's
    // board has something in it.
    const today = daysAgo % 4 === 0
    await q(
      `insert into payments (listing_id, provider, provider_ref, amount_minor, status, created_at)
       values ($1, 'seed', $2, $3, 'confirmed',
               case when $4 then greatest(
                      date_trunc('day', now() at time zone 'utc') at time zone 'utc'
                        + interval '30 seconds',
                      now() - interval '6 hours')
                    else now() - ($5 || ' days')::interval end)`,
      [id, `seed_${host}`, totalMinor, today, String(daysAgo)],
    )
    inserted++
  }

  return NextResponse.json({ ok: true, inserted })
}
