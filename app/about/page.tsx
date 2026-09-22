import Link from 'next/link'
import { SITE_DOMAIN, BUSINESS } from '@/lib/config'
import { one, num } from '@/lib/db'
import { getStats, getLeader } from '@/lib/rank'
import { formatMoney } from '@/lib/money'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'About' }

export default async function Page() {
  const [stats, leader] = await Promise.all([getStats(), getLeader()])
  const extra = await one<Record<string, any>>(
    `select
       (select coalesce(sum(click_count), 0) from listings where status = 'live') as clicks,
       (select count(*)::int from listings
         where status = 'live'
           and created_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc'))
                                                                                  as new_today,
       (select coalesce(sum(amount_minor), 0) from payments
         where status = 'confirmed'
           and created_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc'))
                                                                                  as today_minor`,
  )

  const money = (m: number) => formatMoney(m)

  const cells: [string, string, string?][] = [
    [money(stats.totalMinor), 'paid in total'],
    [stats.visitorsToday.toLocaleString('en-US'), 'visitors today'],
    [num(extra?.clicks).toLocaleString('en-US'), 'clicks delivered'],
    [leader ? money(leader.total_minor) : '—', 'highest rank so far', leader?.title],
    [stats.listings.toLocaleString('en-US'), 'listed products'],
    [num(extra?.new_today).toLocaleString('en-US'), 'products added today'],
    [money(num(extra?.today_minor)), 'paid today'],
  ]

  return (
    <div className="wrap prose" style={{ maxWidth: 780 }}>
      <h1>About</h1>
      <p className="lead">
        {SITE_DOMAIN} is a leaderboard where position is bought. That is the whole product.
      </p>
      <p>
        No ads, no API keys, no revenue share, no editorial panel deciding who deserves the top
        spot. You pay, you rank. Everyone can see exactly what every position cost, which is more
        honest than most advertising and considerably more interesting than a pretend
        meritocracy.
      </p>

      <h2>Where it stands right now</h2>
      <p>These are read from the database on every request. Nothing here is rounded up.</p>

      <div className="stat-grid">
        {cells.map(([v, k, sub]) => (
          <div className="stat" key={k}>
            <div className="v num">{v}</div>
            <div className="k">{k}</div>
            {sub && <div className="k" style={{ marginTop: 2 }}>{sub}</div>}
          </div>
        ))}
      </div>

      <h2>What makes it different</h2>
      <p>
        Every row shows the money paid divided by the visitors delivered, so a rank is a
        measurable ad buy rather than a vanity purchase. There is a board for every UTC day, not just an all-time table that one large payment
        can lock forever.
      </p>

      <h2>Who runs it</h2>
      <p>
        {BUSINESS.legalName} from Maharashtra, India.{' '}
        <a href={`https://x.com/${BUSINESS.x}`} rel="noopener">@{BUSINESS.x}</a> on X, or{' '}
        <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>. The full details are on the{' '}
        <Link href="/imprint">imprint</Link> page and the mechanics are on{' '}
        <Link href="/rules">rules</Link>.
      </p>
    </div>
  )
}
