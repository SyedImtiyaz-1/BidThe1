const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'

export type Meta = {
  url: string
  key: string
  host: string
  title: string
  tagline: string
  iconUrl: string | null
  category?: string
  kind: ListingKind
}

export type ListingKind = 'website' | 'app'

/** App stores are apps. Everything else, including an X profile, is a website. */
export function listingKind(u: URL): ListingKind {
  const host = u.hostname.replace(/^www\./, '')
  return host === 'apps.apple.com' || host === 'play.google.com' ? 'app' : 'website'
}

export function normalizeUrl(input: string): URL | null {
  let raw = input.trim()
  if (!raw) return null

  // An @handle means X, which is how the reference sites take social listings.
  if (raw.startsWith('@')) raw = `https://x.com/${raw.slice(1)}`
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`

  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    // No bare IPs. They are almost never a real product and often a probe.
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname)) return null
    if (!u.hostname.includes('.')) return null
    u.protocol = 'https:'
    u.hash = ''
    return u
  } catch {
    return null
  }
}

/**
 * Hosts where the PATH identifies the product, not the domain.
 *
 * Without this, every X handle collapses into one listing for `x.com` and every
 * iOS app into one listing for `apps.apple.com`, so the second person to pay
 * would be topping up a stranger's rank.
 */
const MULTI_TENANT = new Set([
  'x.com', 'twitter.com', 'apps.apple.com', 'play.google.com', 'github.com',
  'gumroad.com', 'producthunt.com', 'medium.com', 'substack.com', 'youtube.com',
  'linkedin.com', 'instagram.com', 'tiktok.com', 'reddit.com', 't.me',
  'itch.io', 'notion.site', 'lemonsqueezy.com', 'npmjs.com', 'discord.gg',
  'chromewebstore.google.com', 'marketplace.visualstudio.com',
])

/**
 * The identity of a listing. Two submissions with the same key are the same
 * product and the second one tops up the first.
 */
export function listingKey(u: URL): string {
  const host = u.hostname.replace(/^www\./, '')

  if (host === 'apps.apple.com') {
    const id = u.pathname.match(/\/id(\d+)/)?.[1]
    if (id) return `apps.apple.com/id${id}`
  }
  if (host === 'play.google.com') {
    const id = u.searchParams.get('id')
    if (id) return `play.google.com/${id}`
  }
  if (MULTI_TENANT.has(host)) {
    const seg = u.pathname.split('/').filter(Boolean)[0]
    if (seg) return `${host}/${seg.toLowerCase()}`
  }
  return host
}

/** stripe.com -> stripe, apps.apple.com -> apps-apple */
export function slugFromHost(host: string): string {
  const base = host
    .replace(/^www\./, '')
    .replace(/\.(com|io|so|app|ai|dev|co|net|org|in|lol|xyz|me|sh|to|gg)$/i, '')
    .replace(/\./g, '-')
  return slugify(base) || slugify(host)
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'listing'
  )
}

/**
 * Page titles are usually "Brand | Tagline that repeats the whole pitch". The
 * board already has a tagline column, so keep the brand and drop the tail.
 */
function cleanTitle(raw: string, host: string): string {
  let t = raw.trim()
  if (!t) return host
  if (t.length > 34) {
    const first = t.split(/\s+[|\u2013\u2014\u00b7\u2022]\s+|\s+-\s+/)[0].trim()
    if (first.length >= 2) t = first
  }
  return t.slice(0, 60)
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function metaTag(html: string, prop: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return decodeEntities(m[1]).trim()
  }
  return null
}

/**
 * Apple's lookup endpoint is free, needs no key, and returns the title, icon,
 * description and genre in one call. App Store submissions therefore need zero
 * typing, which is the single biggest conversion lever on the submit form.
 */
async function fromAppStore(u: URL): Promise<Meta | null> {
  const id = u.pathname.match(/\/id(\d+)/)?.[1]
  if (!id) return null
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${id}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { results?: any[] }
    const app = json.results?.[0]
    if (!app) return null
    return {
      url: app.trackViewUrl || u.toString(),
      key: listingKey(u),
      host: 'apps.apple.com',
      kind: 'app' as const,
      title: cleanTitle(app.trackName || u.hostname, 'apps.apple.com'),
      tagline: (app.description || '').split('\n')[0].slice(0, 180),
      iconUrl: app.artworkUrl512 || app.artworkUrl100 || null,
      category: 'apps',
    }
  } catch {
    return null
  }
}

/**
 * Favicons come from DuckDuckGo. Clearbit's logo API is dead as of late 2025,
 * logo.dev needs a token, and Google's endpoint returns a generic globe with a
 * 200 status on failure, so you cannot tell a miss from a hit.
 */
/** On X the handle is the product, not whatever x.com serves to a scraper. */
function handleTitle(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, '')
  if (host !== 'x.com' && host !== 'twitter.com') return null
  const seg = u.pathname.split('/').filter(Boolean)[0]
  return seg ? `@${seg}` : null
}

export function faviconUrl(host: string): string {
  return `https://icons.duckduckgo.com/ip3/${host}.ico`
}

export async function fetchMeta(input: string): Promise<Meta | null> {
  const u = normalizeUrl(input)
  if (!u) return null

  if (u.hostname.endsWith('apps.apple.com')) {
    const app = await fromAppStore(u)
    if (app) return app
  }

  const host = u.hostname.replace(/^www\./, '')
  const fallback: Meta = {
    url: u.toString(),
    key: listingKey(u),
    kind: listingKind(u),
    host,
    title: host,
    tagline: '',
    iconUrl: faviconUrl(host),
  }

  try {
    const res = await fetch(u.toString(), {
      headers: { 'user-agent': UA, accept: 'text/html,*/*' },
      signal: AbortSignal.timeout(6000),
      redirect: 'follow',
    })
    if (!res.ok) return fallback

    // Cap the body. Some pages are megabytes and none of it is in <head>.
    const reader = res.body?.getReader()
    let html = ''
    if (reader) {
      const decoder = new TextDecoder()
      let read = 0
      while (read < 120_000) {
        const { done, value } = await reader.read()
        if (done) break
        read += value.byteLength
        html += decoder.decode(value, { stream: true })
        if (html.includes('</head>')) break
      }
      reader.cancel().catch(() => {})
    }

    const title =
      metaTag(html, 'og:site_name') ||
      metaTag(html, 'og:title') ||
      decodeEntities(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? '').trim() ||
      host

    const tagline =
      metaTag(html, 'og:description') || metaTag(html, 'description') || ''

    return {
      url: u.toString(),
      key: listingKey(u),
      kind: listingKind(u),
      host,
      title: handleTitle(u) ?? cleanTitle(title, host),
      tagline: tagline.slice(0, 180),
      iconUrl: faviconUrl(host),
    }
  } catch {
    return fallback
  }
}
