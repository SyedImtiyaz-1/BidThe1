import { q, one, num } from './db'
import { MIN_FIRST_PAYMENT_MINOR, MIN_PAYMENT_MINOR, STEP_MINOR } from './config'

export type BoardRow = {
  id: string
  slug: string
  title: string
  tagline: string
  icon_url: string | null
  host: string
  category: string
  url: string
  total_minor: number
  today_minor: number
  click_count: number
  created_at: string
  rank: number
}

function shape(r: Record<string, any>): BoardRow {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    tagline: r.tagline ?? '',
    icon_url: r.icon_url,
    host: r.host,
    category: r.category,
    url: r.url,
    total_minor: num(r.total_minor),
    today_minor: num(r.today_minor),
    click_count: num(r.click_count),
    created_at: r.created_at,
    rank: num(r.rank),
  }
}

/**
 * Rank is computed here and stored nowhere.
 *
 * That is the whole concurrency story. Two people paying in the same second
 * both succeed, both totals land, and the order falls out of the numbers. There
 * is no rank column to lock, so there is no race to lose.
 *
 * Ties go to whoever reached the total first, which is why paying exactly what
 * the leader paid does not take the lead.
 */
export async function getBoard(opts: {
  scope: 'all' | 'today' | 'day'
  day?: string
  category?: string
  limit?: number
  offset?: number
}): Promise<BoardRow[]> {
  const { scope, day, category, limit = 50, offset = 0 } = opts
  const cat = category && category !== 'all' ? category : null

  // One UTC calendar day, frozen once the day closes. No archive table and no
  // nightly job: the ledger already holds every payment with its timestamp.
  if (scope === 'day') {
    const rows = await q(
      `with spend as (
         select p.listing_id,
                sum(p.amount_minor) as day_minor,
                min(p.created_at)   as first_at
           from payments p
          where p.status = 'confirmed'
            and (p.created_at at time zone 'utc')::date = $1::date
          group by p.listing_id
       )
       select l.*, s.day_minor as today_minor,
              row_number() over (order by s.day_minor desc, s.first_at asc) as rank
         from listings l
         join spend s on s.listing_id = l.id
        where l.status = 'live'
          and ($2::text is null or l.category = $2::text)
        order by s.day_minor desc, s.first_at asc
        limit $3 offset $4`,
      [day, cat, limit, offset],
    )
    return rows.map(shape)
  }

  if (scope === 'today') {
    const rows = await q(
      `with today as (
         select p.listing_id,
                sum(p.amount_minor) as today_minor,
                min(p.created_at)   as first_today
           from payments p
          where p.status = 'confirmed'
            and p.created_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc')
          group by p.listing_id
       )
       select l.*, t.today_minor,
              row_number() over (
                order by t.today_minor desc, t.first_today asc
              ) as rank
         from listings l
         join today t on t.listing_id = l.id
        where l.status = 'live'
          and ($1::text is null or l.category = $1::text)
        order by t.today_minor desc, t.first_today asc
        limit $2 offset $3`,
      [cat, limit, offset],
    )
    return rows.map(shape)
  }

  const rows = await q(
    `select l.*,
            coalesce((
              select sum(p.amount_minor) from payments p
               where p.listing_id = l.id
                 and p.status = 'confirmed'
                 and p.created_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc')
            ), 0) as today_minor,
            row_number() over (
              order by l.total_minor desc, l.first_reached_at asc
            ) as rank
       from listings l
      where l.status = 'live'
        and ($1::text is null or l.category = $1::text)
      order by l.total_minor desc, l.first_reached_at asc
      limit $2 offset $3`,
    [cat, limit, offset],
  )
  return rows.map(shape)
}

export async function countListings(category?: string): Promise<number> {
  const cat = category && category !== 'all' ? category : null
  const r = await one<{ n: string }>(
    `select count(*)::int as n from listings
      where status = 'live' and ($1::text is null or category = $1::text)`,
    [cat],
  )
  return num(r?.n)
}

/** The listing currently at the top, which sets the price of the top. */
export async function getLeader(category?: string): Promise<BoardRow | null> {
  const rows = await getBoard({ scope: 'all', category, limit: 1 })
  return rows[0] ?? null
}

export async function getListingBySlug(slug: string) {
  return one<Record<string, any>>(
    `select * from listings where slug = $1 and status = 'live'`,
    [slug],
  )
}

export async function findListingByHost(host: string) {
  return one<Record<string, any>>(
    `select * from listings where host = $1 and status = 'live'`,
    [host],
  )
}

/**
 * What it costs to take the top, given what this listing has already paid.
 *
 * Top-ups accumulate, so a listing sitting at ₹500 with the leader at ₹1,000
 * pays ₹501 and not ₹1,001. Charging the full amount again is the single most
 * common way a clone of this mechanic makes returning customers feel cheated.
 */
export function priceToLead(leaderTotalMinor: number, myTotalMinor: number): number {
  const gap = leaderTotalMinor - myTotalMinor + STEP_MINOR
  const floor = myTotalMinor > 0 ? MIN_PAYMENT_MINOR : MIN_FIRST_PAYMENT_MINOR
  return Math.max(floor, gap)
}

/** Where a listing would land if it paid this much right now. */
export async function projectedRank(
  listingId: string | null,
  myTotalMinor: number,
  payMinor: number,
): Promise<number> {
  const newTotal = myTotalMinor + payMinor
  const r = await one<{ n: string }>(
    `select count(*)::int as n from listings
      where status = 'live'
        and total_minor >= $1
        and ($2::uuid is null or id <> $2::uuid)`,
    [newTotal, listingId],
  )
  return num(r?.n) + 1
}

/**
 * Every live total, highest first, for working out on the client what rank a
 * given amount would buy. Just the numbers, and they are all public on the
 * board anyway, so nothing is disclosed that a reader cannot already see.
 */
export async function getTotals(category?: string, limit = 5000): Promise<number[]> {
  const cat = category && category !== 'all' ? category : null
  const rows = await q<{ total_minor: string }>(
    `select total_minor from listings
      where status = 'live'
        and total_minor > 0
        and ($1::text is null or category = $1::text)
      order by total_minor desc
      limit $2`,
    [cat, limit],
  )
  return rows.map((r) => num(r.total_minor))
}

export type Day = { day: string; totalMinor: number; listings: number; payments: number }

/** Every UTC day that saw a payment, newest first. */
export async function getDays(limit = 60): Promise<Day[]> {
  const rows = await q<Record<string, any>>(
    `select (created_at at time zone 'utc')::date as day,
            sum(amount_minor)                     as total_minor,
            count(distinct listing_id)::int       as listings,
            count(*)::int                         as payments
       from payments
      where status = 'confirmed'
      group by 1
      order by 1 desc
      limit $1`,
    [limit],
  )
  return rows.map((r) => ({
    day: typeof r.day === 'string' ? r.day.slice(0, 10) : new Date(r.day).toISOString().slice(0, 10),
    totalMinor: num(r.total_minor),
    listings: num(r.listings),
    payments: num(r.payments),
  }))
}

export type CategoryStat = { slug: string; listings: number; totalMinor: number; top: string | null }

export async function getCategoryStats(): Promise<CategoryStat[]> {
  const rows = await q<Record<string, any>>(
    `select l.category,
            count(*)::int             as listings,
            coalesce(sum(l.total_minor), 0) as total_minor,
            (select l2.title from listings l2
              where l2.category = l.category and l2.status = 'live'
              order by l2.total_minor desc, l2.first_reached_at asc
              limit 1) as top
       from listings l
      where l.status = 'live'
      group by l.category`,
  )
  return rows.map((r) => ({
    slug: r.category,
    listings: num(r.listings),
    totalMinor: num(r.total_minor),
    top: r.top ?? null,
  }))
}

export type Stats = { online: number; visitorsToday: number; listings: number; totalMinor: number }

/**
 * Cached for ten seconds per instance.
 *
 * The nav counters run on every single page render, and "online" is already a
 * five-minute window, so a ten second cache costs no accuracy and removes a
 * round trip from most requests.
 */
let statsCache: { at: number; value: Stats } | null = null

export async function getStats(): Promise<Stats> {
  if (statsCache && Date.now() - statsCache.at < 10_000) return statsCache.value
  const value = await readStats()
  statsCache = { at: Date.now(), value }
  return value
}

/**
 * Real numbers or no numbers. A fabricated "13 online" is textbook false
 * urgency under the CCPA dark-pattern guidelines, and this operator is in
 * India and squarely in scope.
 */
async function readStats(): Promise<Stats> {
  const r = await one<Record<string, any>>(
    `select
       (select count(*)::int from presence
         where last_seen > now() - interval '5 minutes')            as online,
       (select count(*)::int from presence
         where day = (now() at time zone 'utc')::date)              as visitors_today,
       (select count(*)::int from listings where status = 'live')   as listings,
       (select coalesce(sum(total_minor), 0) from listings
         where status = 'live')                                     as total_minor`,
  )
  return {
    online: num(r?.online),
    visitorsToday: num(r?.visitors_today),
    listings: num(r?.listings),
    totalMinor: num(r?.total_minor),
  }
}
