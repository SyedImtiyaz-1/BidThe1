import { createHash } from 'node:crypto'

/**
 * A fixed-width, non-reversible key for one visitor for one day. Raw IPs are
 * never stored, which keeps click dedupe and presence counting out of most of
 * the personal-data conversation for no extra work.
 */
export function visitorHash(ip: string, ua: string): string {
  const salt = process.env.HASH_SALT || 'rung-dev-salt'
  const day = new Date().toISOString().slice(0, 10)
  return createHash('sha256').update(`${ip}|${ua}|${salt}|${day}`).digest('hex').slice(0, 32)
}

export function clientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    '0.0.0.0'
  )
}

const BOT_RE =
  /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|headlesschrome|python-requests|curl\/|wget|go-http-client|axios|node-fetch|scrapy|semrush|ahrefs|mj12|dotbot/i

export function looksLikeBot(ua: string): boolean {
  return !ua || BOT_RE.test(ua)
}
