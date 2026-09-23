import { NextResponse } from 'next/server'
import { one } from '@/lib/db'

/**
 * A letter mark, drawn from the listing's own name.
 *
 * Plenty of real sites ship no favicon, and a blank square on the board reads
 * as broken rather than as missing. The colour is derived from the slug, so a
 * listing keeps the same mark for as long as it exists and two neighbours
 * rarely collide.
 */
function monogram(title: string, slug: string): string {
  const letters =
    (title.replace(/^@/, '').match(/\p{L}\p{L}?/u)?.[0] ?? '?').toUpperCase().slice(0, 2)

  let h = 0
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) % 360

  const bg = `oklch(0.88 0.06 ${h})`
  const fg = `oklch(0.34 0.10 ${h})`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">` +
    `<rect width="96" height="96" rx="20" fill="${bg}"/>` +
    `<text x="50%" y="50%" dy=".34em" text-anchor="middle" fill="${fg}" ` +
    `font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" ` +
    `font-size="${letters.length > 1 ? 40 : 48}" font-weight="700" ` +
    `letter-spacing="-1">${letters}</text></svg>`
  return svg
}

function svgResponse(svg: string) {
  return new NextResponse(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=604800, stale-while-revalidate=86400',
    },
  })
}

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
  const listing = await one<{ icon_url: string | null; title: string }>(
    `select icon_url, title from listings where slug = $1`,
    [slug],
  )
  if (!listing) return new NextResponse('not found', { status: 404 })

  const fallback = () => svgResponse(monogram(listing.title ?? slug, slug))
  if (!listing.icon_url) return fallback()

  try {
    const res = await fetch(listing.icon_url, { signal: AbortSignal.timeout(5000) })
    // A favicon service answers 200 with a placeholder for a host it cannot
    // reach, and some hosts answer with an HTML error page. Neither is an icon.
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !type.startsWith('image/')) return fallback()
    return new NextResponse(res.body, {
      headers: {
        'content-type': type,
        'cache-control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    })
  } catch {
    return fallback()
  }
}
