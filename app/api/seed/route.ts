import { NextResponse } from 'next/server'
import { q } from '@/lib/db'

/**
 * Demo data, for development and for previewing the board with something on it.
 *
 * Gated on ADMIN_TOKEN so it cannot be triggered by a visitor. Every entry is
 * invented: no real company, product or person appears here, because a listing
 * states that somebody paid for a rank and saying that about a real party who
 * did not is a claim this route has no business making.
 *
 * `?reset=1` removes everything it created and nothing else. Seeded rows are
 * tagged by their payment provider, so a real payment is never touched.
 */
/**
 * Placed by day offset rather than hours ago, so the shape holds whenever this
 * runs. An hours-ago offset lands wherever the clock happens to be: seeded at
 * 01:00 UTC, "three hours ago" is yesterday and today's board comes out empty.
 *
 * dayOffset 0 is today, 1 is yesterday. minuteOfDay places it inside that day,
 * clamped so nothing is ever stamped in the future.
 */
const SEED: [slug: string, host: string, title: string, tagline: string, category: string, kind: string, cents: number, dayOffset: number, minuteOfDay: number, clicks: number][] = [
  ['northwind-labs', 'northwindlabs.example', 'Northwind Labs', 'Model evaluation harnesses for teams shipping to production.', 'ai', 'website', 84100, 0, 40, 6180],
  ['quillstream', 'quillstream.example', 'Quillstream', 'Turn a repository into documentation people actually read.', 'developer', 'website', 62000, 0, 25, 4102],
  ['tideline', 'tideline.example', 'Tideline', 'Attribution for teams that sell in long, messy cycles.', 'marketing', 'website', 41500, 0, 8, 3315],
  ['glassbox-ui', 'glassbox.example', 'Glassbox UI', 'A component library that stops arguing with your design tokens.', 'design', 'website', 28900, 1, 1180, 2871],
  ['amberdesk', 'apps.apple.com/id900000001', 'Amberdesk', 'Inbox triage that works offline and forgets nothing.', 'productivity', 'app', 19000, 1, 900, 2012],
  ['ledgerkite', 'ledgerkite.example', 'Ledgerkite', 'Bookkeeping for freelancers who invoice in four currencies.', 'finance', 'website', 12500, 1, 610, 1884],
  ['mara-okonkwo', 'linkedin.com/in/mara-okonkwo-demo', 'Mara Okonkwo', 'Writes about shipping infrastructure at small companies.', 'people', 'profile', 9400, 1, 240, 1502],
  ['paperclip-fm', 'play.google.com/com.paperclip.demo', 'Paperclip FM', 'Podcast clipping, on a phone, in about nine seconds.', 'ai', 'app', 7250, 2, 1020, 1190],
  ['sedgewick', 'x.com/sedgewick_demo', '@sedgewick_demo', 'Notes on type systems and the people who love them.', 'people', 'profile', 5100, 2, 430, 903],
  ['harborline', 'harborline.example', 'Harborline', 'Status pages that say what broke, not that something broke.', 'developer', 'website', 3499, 4, 760, 640],
  ['cindermark', 'cindermark.example', 'Cindermark', 'Brand systems for companies too small to have a brand team.', 'design', 'website', 1800, 7, 520, 410],
  ['ollie-vance', 'linkedin.com/in/ollie-vance-demo', 'Ollie Vance', 'Fractional CFO. Explains runway without a spreadsheet.', 'people', 'profile', 999, 12, 300, 233],
]

export async function POST(req: Request) {
  const token = process.env.ADMIN_TOKEN
  const url = new URL(req.url)
  if (!token || url.searchParams.get('token') !== token) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  if (url.searchParams.get('reset')) {
    // Only what this route made. A real payment is never in this set.
    const gone = await q<{ slug: string }>(
      `delete from listings where id in (
         select listing_id from payments where provider = 'seed'
       ) returning slug`,
    )
    return NextResponse.json({ removed: gone.length, slugs: gone.map((r) => r.slug) })
  }

  let added = 0
  for (const [slug, host, title, tagline, category, kind, cents, dayOffset, minuteOfDay, clicks] of SEED) {
    // Inside the target UTC day, never in the future.
    const [{ at }] = await q<{ at: string }>(
      `select least(
                now() - interval '4 minutes',
                (date_trunc('day', now() at time zone 'utc') at time zone 'utc')
                  - ($1 || ' days')::interval + ($2 || ' minutes')::interval
              ) as at`,
      [String(dayOffset), String(minuteOfDay)],
    )
    const listing = await q<{ id: string }>(
      `insert into listings
         (listing_key, slug, url, host, title, tagline, category, kind, status,
          total_minor, peak_minor, click_count, first_reached_at, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'live', $9, $9, $10, $11, $11)
       on conflict (listing_key) do nothing
       returning id`,
      [host, slug, `https://${host}`, host.split('/')[0], title, tagline, category, kind, cents, clicks, at],
    )
    const id = listing[0]?.id
    if (!id) continue
    added++
    // A matching payment, so /stats and the daily boards agree with the board.
    await q(
      `insert into payments (listing_id, provider, provider_ref, amount_minor,
                             base_currency, display_currency, status, created_at)
       values ($1, 'seed', $2, $3, 'USD', 'USD', 'confirmed',
               $4)
       on conflict (provider, provider_ref) do nothing`,
      [id, `seed_${slug}`, cents, at],
    )
  }

  const total = await q<{ n: string; sum: string }>(
    `select count(*)::int as n, coalesce(sum(total_minor),0) as sum
       from listings where status = 'live'`,
  )
  return NextResponse.json({
    added,
    onBoard: Number(total[0]?.n ?? 0),
    totalCents: Number(total[0]?.sum ?? 0),
    note: 'Invented listings. Remove with ?reset=1.',
  })
}
