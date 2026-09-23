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

export type ListingKind = 'website' | 'app' | 'profile'

/**
 * Hosts where the page is, by definition, an app listing.
 *
 * itunes.apple.com is the old Apple domain and still in circulation.
 * TestFlight is a build of an app, which is close enough for a filter.
 */
const APP_STORE_HOSTS = new Set([
  'apps.apple.com',
  'itunes.apple.com',
  'testflight.apple.com',
  'play.google.com',
  'apps.microsoft.com',
  'microsoft.com',
  'f-droid.org',
  'galaxystore.samsung.com',
  'appgallery.huawei.com',
  'apkpure.com',
  'setapp.com',
])

/**
 * Hosts where a listing is a person or an account rather than a product.
 *
 * A profile is worth listing in its own right: a creator buying rank for their
 * own handle is the same trade as a company buying it for a landing page.
 */
const PROFILE_HOSTS = new Set([
  'x.com', 'twitter.com', 'linkedin.com', 'instagram.com', 'threads.net',
  'tiktok.com', 'youtube.com', 'github.com', 'substack.com', 'medium.com',
])

/**
 * How many path segments identify one account on a platform.
 *
 * One is the usual case: instagram.com/nasa. LinkedIn needs two, because every
 * profile lives under /in and every company under /company, and keying on the
 * first segment alone put every person on the site into a single listing that
 * each new claimant would take from the last.
 */
const KEY_DEPTH: Record<string, number> = {
  'linkedin.com': 2,
}

/** True when the URL is a store page for an app. */
export function isAppStoreUrl(u: URL): boolean {
  const host = u.hostname.replace(/^www\./, '')
  if (host === 'microsoft.com') return u.pathname.startsWith('/store/apps')
  return APP_STORE_HOSTS.has(host)
}

/**
 * What sort of thing a URL points at, before the page has been read.
 *
 * A store link is an app. Everything else starts as a website, because most
 * apps are submitted by their own marketing site and the host alone cannot
 * tell those from anything else. `kindFromHtml` refines this once the page is
 * in hand, and the submitter can override both.
 */
export function listingKind(u: URL): ListingKind {
  if (isAppStoreUrl(u)) return 'app'
  const host = u.hostname.replace(/^www\./, '')
  // A bare platform domain is that company's website; a path under it is
  // somebody's account there.
  if (PROFILE_HOSTS.has(host) && u.pathname.split('/').filter(Boolean).length) return 'profile'
  return 'website'
}

/**
 * The page's own declaration that it has an app behind it.
 *
 * Apple's Smart App Banner and Facebook's App Links are the two conventions
 * that stuck, and a product with an app almost always ships one or the other
 * so that phones deep-link into it. That makes them a far better signal than
 * the domain: raycast.com is a Mac app whose URL says nothing of the sort.
 */
export function kindFromHtml(html: string): ListingKind | null {
  for (const tag of [
    'apple-itunes-app',
    'al:ios:app_store_id',
    'al:ios:url',
    'al:android:package',
    'al:android:url',
    'google-play-app',
  ]) {
    if (metaTag(html, tag)) return 'app'
  }
  // A store link in the page body is weaker than a meta tag but still clear.
  if (/https?:\/\/(?:apps\.apple\.com\/[^"'\s]*\/id\d|play\.google\.com\/store\/apps\/details)/i.test(html)) {
    return 'app'
  }
  return null
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
    const segs = u.pathname.split('/').filter(Boolean).slice(0, KEY_DEPTH[host] ?? 1)
    if (segs.length) return `${host}/${segs.join('/').toLowerCase()}`
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
    // Numeric first, decimal and hex, or a title like htmx's "<&#x2F;> htmx"
    // comes through with the escape still in it.
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Last, so an escaped ampersand cannot revive the entity beside it.
    .replace(/&amp;/g, '&')
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
/**
 * On a platform the handle is the listing, not whatever the site serves a
 * scraper. These pages answer a crawler with a login wall or a generic app
 * name, so the URL is the more reliable source.
 */
function handleTitle(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, '')
  const segs = u.pathname.split('/').filter(Boolean)
  if (!segs.length) return null
  const first = segs[0]

  if (host === 'x.com' || host === 'twitter.com') return `@${first}`
  if (host === 'instagram.com' || host === 'threads.net') return `@${first}`
  // TikTok and YouTube already carry the @ in the path.
  if (host === 'tiktok.com' || host === 'youtube.com') {
    return first.startsWith('@') ? first : `@${first}`
  }
  if (host === 'linkedin.com' && (first === 'in' || first === 'company') && segs[1]) {
    // A LinkedIn slug is the name with the words hyphenated, and often a
    // disambiguating suffix that means nothing to a reader.
    return segs[1]
      .split('-')
      .filter((w) => !/^[0-9a-f]{4,}$/i.test(w))
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
      .slice(0, 60) || null
  }
  if (host === 'github.com') return first
  return null
}

/**
 * The page's own title, unless it is the platform's rather than the account's.
 *
 * LinkedIn and GitHub put the real name in og:title, which beats anything the
 * URL can offer. X and Instagram return their own branding, so the handle is
 * the better answer there.
 */
function pickTitle(u: URL, fetched: string, host: string): string {
  const handle = handleTitle(u)
  if (!handle) return fetched
  const generic =
    !fetched ||
    fetched === host ||
    looksLikeWall(fetched) ||
    /^(x|twitter|instagram|linkedin|tiktok|youtube|threads|github|substack|medium)\b/i.test(fetched)
  if (generic) return handle
  // "Anthropic | LinkedIn" is the account's name with the platform's stapled
  // on. cleanTitle only splits long titles, so short ones keep the suffix.
  return fetched
    .replace(
      /\s*[|\u2013\u2014\u00b7\u2022-]\s*(x|twitter|instagram|linkedin|tiktok|youtube|threads|github|substack|medium)\s*$/i,
      '',
    )
    .trim() || handle
}

/** Login walls and app names, which is what these hosts serve a crawler. */
function looksLikeWall(text: string): boolean {
  return /log ?in|sign ?up|sign ?in|create an account|see posts, photos/i.test(text)
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

    // Cap the body, then stop at </head>, which on an ordinary site arrives
    // within a few KB. The ceiling has to clear the worst case though: the
    // Play Store buries its og tags at byte 948,000 of a 1.2MB head, and at
    // 120KB we never reached them, so every Play Store listing came out titled
    // "play.google.com" with a generic favicon. The whole page downloads in
    // under half a second and is read once per listing, not once per view.
    const reader = res.body?.getReader()
    let html = ''
    if (reader) {
      const decoder = new TextDecoder()
      let read = 0
      while (read < 1_400_000) {
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

    let tagline = metaTag(html, 'og:description') || metaTag(html, 'description') || ''
    // A platform that refused us shows its login copy rather than the account.
    if (looksLikeWall(tagline)) tagline = ''

    // The URL wins whenever it is definitive. Only a plain website has to ask
    // the page, and it has to be asked carefully: every social platform ships
    // App Links tags so phones deep-link into its own mobile app, which read
    // as "this is an app" and turned every profile into one.
    const urlKind = listingKind(u)
    const kind = urlKind !== 'website' ? urlKind : kindFromHtml(html) ?? 'website'

    // On a store page og:image is the app's own icon, which is square and
    // exactly what the board wants. Everywhere else it is a wide social card,
    // so the favicon stays the better choice.
    const ogImage = isAppStoreUrl(u) ? metaTag(html, 'og:image') : null
    const finalTitle = pickTitle(u, cleanTitle(title, host), host)

    return {
      url: u.toString(),
      key: listingKey(u),
      kind,
      host,
      title: finalTitle,
      // A description that only repeats the name says nothing twice.
      tagline: tagline.trim().toLowerCase() === finalTitle.toLowerCase() ? '' : tagline.slice(0, 180),
      iconUrl: ogImage ?? faviconUrl(host),
    }
  } catch {
    return fallback
  }
}
