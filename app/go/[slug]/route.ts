import { NextResponse, after } from 'next/server'
import { q, one } from '@/lib/db'
import { clientIp, visitorHash, looksLikeBot } from '@/lib/hash'

/**
 * Redirect first, count afterwards.
 *
 * The click count is the thing that justifies a second payment, so it has to be
 * both fast and honest. `after()` runs once the response is already on its way,
 * so the visitor waits for nothing, and the unique index on
 * (listing, visitor, hour) means the same person reloading does not inflate it.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const listing = await one<{ id: string; url: string }>(
    `select id, url from listings where slug = $1 and status = 'live'`,
    [slug],
  )
  if (!listing) return NextResponse.redirect(new URL('/', req.url), 307)

  const ua = req.headers.get('user-agent') ?? ''
  const who = visitorHash(clientIp(req.headers), ua)
  const bot = looksLikeBot(ua)

  after(async () => {
    // Bot rows are kept but excluded from the count, so a number that looks
    // wrong later can actually be explained.
    const inserted = await q(
      `insert into clicks (listing_id, visitor_hash, hour_bucket, is_bot)
       values ($1, $2, date_trunc('hour', now()), $3)
       on conflict do nothing
       returning listing_id`,
      [listing.id, who, bot],
    )
    if (inserted.length > 0 && !bot) {
      await q(`update listings set click_count = click_count + 1 where id = $1`, [listing.id])
    }
  })

  const res = NextResponse.redirect(listing.url, 307)
  res.headers.set('Cache-Control', 'no-store')
  return res
}
