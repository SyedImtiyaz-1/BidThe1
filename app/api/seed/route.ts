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
const SEED: [slug: string, host: string, title: string, tagline: string, category: string, kind: string, cents: number, days: number, clicks: number][] = [
  ['northwind-labs', 'northwindlabs.example', 'Northwind Labs', 'Model evaluation harnesses for teams shipping to production.', 'ai', 'website', 84100, 21, 6180],
  ['quillstream', 'quillstream.example', 'Quillstream', 'Turn a repository into documentation people actually read.', 'developer', 'website', 62000, 12, 4102],
  ['tideline', 'tideline.example', 'Tideline', 'Attribution for teams that sell in long, messy cycles.', 'marketing', 'website', 41500, 9, 3315],
  ['glassbox-ui', 'glassbox.example', 'Glassbox UI', 'A component library that stops arguing with your design tokens.', 'design', 'website', 28900, 30, 2871],
  ['amberdesk', 'apps.apple.com/id900000001', 'Amberdesk', 'Inbox triage that works offline and forgets nothing.', 'productivity', 'app', 19000, 6, 2012],
  ['ledgerkite', 'ledgerkite.example', 'Ledgerkite', 'Bookkeeping for freelancers who invoice in four currencies.', 'finance', 'website', 12500, 15, 1884],
  ['mara-okonkwo', 'linkedin.com/in/mara-okonkwo-demo', 'Mara Okonkwo', 'Writes about shipping infrastructure at small companies.', 'people', 'profile', 9400, 4, 1502],
  ['paperclip-fm', 'play.google.com/com.paperclip.demo', 'Paperclip FM', 'Podcast clipping, on a phone, in about nine seconds.', 'ai', 'app', 7250, 11, 1190],
  ['sedgewick', 'x.com/sedgewick_demo', '@sedgewick_demo', 'Notes on type systems and the people who love them.', 'people', 'profile', 5100, 18, 903],
  ['harborline', 'harborline.example', 'Harborline', 'Status pages that say what broke, not that something broke.', 'developer', 'website', 3499, 2, 640],
  ['cindermark', 'cindermark.example', 'Cindermark', 'Brand systems for companies too small to have a brand team.', 'design', 'website', 1800, 25, 410],
  ['ollie-vance', 'linkedin.com/in/ollie-vance-demo', 'Ollie Vance', 'Fractional CFO. Explains runway without a spreadsheet.', 'people', 'profile', 999, 7, 233],
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
  for (const [slug, host, title, tagline, category, kind, cents, days, clicks] of SEED) {
    const listing = await q<{ id: string }>(
      `insert into listings
         (listing_key, slug, url, host, title, tagline, category, kind, status,
          total_minor, peak_minor, click_count, first_reached_at, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'live', $9, $9, $10,
               now() - ($11 || ' days')::interval, now() - ($11 || ' days')::interval)
       on conflict (listing_key) do nothing
       returning id`,
      [host, slug, `https://${host}`, host.split('/')[0], title, tagline, category, kind, cents, clicks, String(days)],
    )
    const id = listing[0]?.id
    if (!id) continue
    added++
    // A matching payment, so /stats and the daily boards agree with the board.
    await q(
      `insert into payments (listing_id, provider, provider_ref, amount_minor,
                             base_currency, display_currency, status, created_at)
       values ($1, 'seed', $2, $3, 'USD', 'USD', 'confirmed',
               now() - ($4 || ' days')::interval)
       on conflict (provider, provider_ref) do nothing`,
      [id, `seed_${slug}`, cents, String(days)],
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
