import { NextResponse } from 'next/server'
import { one } from '@/lib/db'

const BLANK =
  'data:image/svg+xml,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"/>')

/**
 * Icons are served from our own origin rather than hotlinked. A fifty row board
 * that hotlinks would fire fifty third-party requests on every render, and it
 * would leak every visitor to whoever hosts the icons.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const listing = await one<{ icon_url: string | null }>(
    `select icon_url from listings where slug = $1`,
    [slug],
  )

  if (!listing?.icon_url) return NextResponse.redirect(BLANK)

  try {
    const res = await fetch(listing.icon_url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return NextResponse.redirect(BLANK)
    return new NextResponse(res.body, {
      headers: {
        'content-type': res.headers.get('content-type') ?? 'image/x-icon',
        'cache-control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    })
  } catch {
    return NextResponse.redirect(BLANK)
  }
}
