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
  kind: string
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
    kind: r.kind ?? 'website',
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
  kind?: string
  limit?: number
  offset?: number
}): Promise<BoardRow[]> {
  const { scope, day, category, kind, limit = 50, offset = 0 } = opts
  const cat = category && category !== 'all' ? category : null
  // Narrowing by kind renumbers, exactly as narrowing by category does: what
  // you are looking at is a board, so its first row is #1.
  const knd = kind && kind !== 'all' ? kind : null

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
          and ($5::text is null or l.kind = $5::text)
        order by s.day_minor desc, s.first_at asc
        limit $3 offset $4`,
      [day, cat, limit, offset, knd],
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
          and ($4::text is null or l.kind = $4::text)
        order by t.today_minor desc, t.first_today asc
        limit $2 offset $3`,
      [cat, limit, offset, knd],
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
        and ($4::text is null or l.kind = $4::text)
      order by l.total_minor desc, l.first_reached_at asc
      limit $2 offset $3`,
    [cat, limit, offset, knd],
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

/** Any status. The return page has to find a listing nobody has paid for yet. */
export async function findListingBySlugAny(slug: string) {
  return one<Record<string, any>>(`select * from listings where slug = $1`, [slug])
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
 * Top-ups accumulate, so a listing sitting at $500 with the leader at $1,000
 * pays $501 and not $1,001. Charging the full amount again is the single most
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
/**
 * Totals for every category at once, each sorted high to low, plus an `all`
 * bucket.
 *
 * The hero answers "what rank does this amount buy" on every keystroke, and it
 * answers it for the category in the dropdown, not the whole board. That is
 * one array per category. Fetching them in one pass and partitioning in
 * memory costs a single round trip; fetching them per category costs nine.
 */
export async function getTotalsByCategory(
  kind?: string,
  limit = 5000,
): Promise<Record<string, number[]>> {
  const knd = kind && kind !== 'all' ? kind : null
  const rows = await q<{ category: string; total_minor: string }>(
    `select category, total_minor from listings
      where status = 'live' and total_minor > 0
        and ($2::text is null or kind = $2::text)
      order by total_minor desc
      limit $1`,
    [limit, knd],
  )
  // The query is already sorted, so every partition comes out sorted too.
  const out: Record<string, number[]> = { all: [] }
  for (const r of rows) {
    const v = num(r.total_minor)
    out.all.push(v)
    ;(out[r.category] ??= []).push(v)
  }
  return out
}

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

export type CategoryTop = { slug: string; title: string; amountMinor: number }
export type CategoryBoard = {
  slug: string
  listings: number
  claims: number
  lastClaimAt: string | null
  totalMinor: number
  top: CategoryTop[]
}

/**
 * Every category as its own small board: how many listings, how many claims,
 * when the last one landed, and the three holding the top.
 *
 * Scoped, because "most active" means nothing on an all-time table that one
 * large payment locks forever. Today's figures are the ones that move.
 *
 * Two queries rather than one: the aggregates group over payments and the top
 * three window over listings, and forcing those into a single statement costs
 * more in a cross join than it saves in a round trip.
 */
export async function getCategoryBoards(
  scope: 'all' | 'today' = 'all',
  perCategory = 3,
): Promise<CategoryBoard[]> {
  const today = scope === 'today'

  const [tops, acts] = await Promise.all([
    q<Record<string, any>>(
      `with amt as (
         select l.id, l.category, l.slug, l.title, l.first_reached_at,
                case when $1::bool then coalesce((
                       select sum(p.amount_minor) from payments p
                        where p.listing_id = l.id and p.status = 'confirmed'
                          and p.created_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc')
                     ), 0)
                     else l.total_minor end as amount
           from listings l
          where l.status = 'live'
       ),
       ranked as (
         select *, row_number() over (
                     partition by category order by amount desc, first_reached_at asc
                   ) as rn
           from amt where amount > 0
       )
       select category, slug, title, amount, rn,
              count(*) over (partition by category)::int as listings,
              sum(amount) over (partition by category)   as cat_total
         from ranked
        where rn <= $2
        order by category, rn`,
      [today, perCategory],
    ),
    q<Record<string, any>>(
      `select l.category,
              count(*)::int      as claims,
              max(p.created_at)  as last_at
         from payments p
         join listings l on l.id = p.listing_id
        where p.status = 'confirmed'
          and l.status = 'live'
          and (not $1::bool or p.created_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc'))
        group by l.category`,
      [today],
    ),
  ])

  const act = new Map(acts.map((r) => [r.category as string, r]))
  const out = new Map<string, CategoryBoard>()

  for (const r of tops) {
    const slug = r.category as string
    let entry = out.get(slug)
    if (!entry) {
      const a = act.get(slug)
      entry = {
        slug,
        listings: num(r.listings),
        claims: a ? num(a.claims) : 0,
        lastClaimAt: a?.last_at ? new Date(a.last_at).toISOString() : null,
        totalMinor: num(r.cat_total),
        top: [],
      }
      out.set(slug, entry)
    }
    entry.top.push({ slug: r.slug, title: r.title, amountMinor: num(r.amount) })
  }

  return [...out.values()]
}

export type Standing = { rank: number; count: number }
export type Neighbour = { slug: string; title: string; amountMinor: number; rank: number }
export type ListingDetail = {
  listing: Record<string, any>
  overall: Standing | null
  category: Standing | null
  todayOverall: Standing | null
  todayCategory: Standing | null
  todayMinor: number
  lastClaimedAt: string | null
  neighbours: Neighbour[]
}

/**
 * Everything the product page says about one listing, in three statements.
 *
 * Ranks are never stored, so each standing is a window over the live board:
 * overall and within the category, all-time and since midnight UTC. The
 * neighbours come out of the same all-time window, two either side in the
 * category, which is what makes "also in Design" honest rather than a
 * hand-picked set.
 */
export async function getListingDetail(slug: string): Promise<ListingDetail | null> {
  const listing = await one<Record<string, any>>(
    `select * from listings where slug = $1 and status = 'live'`,
    [slug],
  )
  if (!listing) return null

  const [allTime, today, last] = await Promise.all([
    q<Record<string, any>>(
      `with ranked as (
         select l.id, l.slug, l.title, l.total_minor, l.category,
                row_number() over (order by l.total_minor desc, l.first_reached_at asc) as overall_rank,
                count(*)     over ()                                                   as overall_count,
                row_number() over (partition by l.category
                                   order by l.total_minor desc, l.first_reached_at asc) as cat_rank,
                count(*)     over (partition by l.category)                            as cat_count
           from listings l
          where l.status = 'live' and l.total_minor > 0
       ),
       me as (select * from ranked where id = $1)
       select r.*, (r.id = me.id) as is_me
         from ranked r, me
        where r.category = me.category
          and r.cat_rank between me.cat_rank - 2 and me.cat_rank + 2
        order by r.cat_rank`,
      [listing.id],
    ),
    q<Record<string, any>>(
      `with today as (
         select p.listing_id, sum(p.amount_minor) as today_minor, min(p.created_at) as first_today
           from payments p
          where p.status = 'confirmed'
            and p.created_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc')
          group by p.listing_id
       ),
       ranked as (
         select l.id, l.category, t.today_minor,
                row_number() over (order by t.today_minor desc, t.first_today asc) as overall_rank,
                count(*)     over ()                                               as overall_count,
                row_number() over (partition by l.category
                                   order by t.today_minor desc, t.first_today asc) as cat_rank,
                count(*)     over (partition by l.category)                        as cat_count
           from listings l
           join today t on t.listing_id = l.id
          where l.status = 'live'
       )
       select * from ranked where id = $1`,
      [listing.id],
    ),
    one<{ last_at: string | null }>(
      `select max(created_at) as last_at from payments where listing_id = $1 and status = 'confirmed'`,
      [listing.id],
    ),
  ])

  const me = allTime.find((r) => r.is_me)
  const t = today[0]
  return {
    listing,
    overall: me ? { rank: num(me.overall_rank), count: num(me.overall_count) } : null,
    category: me ? { rank: num(me.cat_rank), count: num(me.cat_count) } : null,
    todayOverall: t ? { rank: num(t.overall_rank), count: num(t.overall_count) } : null,
    todayCategory: t ? { rank: num(t.cat_rank), count: num(t.cat_count) } : null,
    todayMinor: t ? num(t.today_minor) : 0,
    lastClaimedAt: last?.last_at ? new Date(last.last_at).toISOString() : null,
    neighbours: allTime
      .filter((r) => !r.is_me)
      .map((r) => ({ slug: r.slug, title: r.title, amountMinor: num(r.total_minor), rank: num(r.cat_rank) })),
  }
}

/** Every live listing slug, for the sitemap. */
export async function getLiveSlugs(limit = 5000): Promise<{ slug: string; updated: string }[]> {
  const rows = await q<{ slug: string; updated: string }>(
    `select l.slug, coalesce(l.first_reached_at, l.created_at) as updated
       from listings l where l.status = 'live' and l.total_minor > 0
      order by l.total_minor desc limit $1`,
    [limit],
  )
  return rows.map((r) => ({ slug: r.slug, updated: new Date(r.updated).toISOString() }))
}
