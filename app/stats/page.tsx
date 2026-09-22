import { one, num } from '@/lib/db'
import { getStats } from '@/lib/rank'
import { getRates } from '@/lib/fx'
import { getDisplayCurrency } from '@/lib/session'
import { convertFromBase, formatMoney } from '@/lib/money'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Live stats' }

export default async function Page() {
  const [stats, { rates }, currency] = await Promise.all([
    getStats(),
    getRates(),
    getDisplayCurrency(),
  ])
  const extra = await one<Record<string, any>>(
    `select
       (select coalesce(sum(click_count), 0) from listings where status = 'live') as clicks,
       (select count(*)::int from payments where status = 'confirmed')            as payments`,
  )

  const rate = rates[currency] ?? 1
  const clicks = num(extra?.clicks)
  const perClick = clicks > 0 ? Math.round(stats.totalMinor / clicks) : 0

  const cells: [string, string][] = [
    ['Listings live', stats.listings.toLocaleString('en-US')],
    ['Paid in total', formatMoney(convertFromBase(stats.totalMinor, currency, rate), currency)],
    ['Payments taken', num(extra?.payments).toLocaleString('en-US')],
    ['Clicks delivered', clicks.toLocaleString('en-US')],
    ['Average per click', perClick > 0 ? formatMoney(convertFromBase(perClick, currency, rate), currency, { decimals: true }) : '—'],
    ['Online now', stats.online.toLocaleString('en-US')],
    ['Visitors today', stats.visitorsToday.toLocaleString('en-US')],
  ]

  return (
    <div className="wrap prose">
      <h1>Live stats</h1>
      <p className="lead">
        Read straight from the database on every request. Nothing here is rounded up for effect.
      </p>

      <div className="stat-grid">
        {cells.map(([k, v]) => (
          <div className="stat" key={k}>
            <div className="k">{k}</div>
            <div className="v num">{v}</div>
          </div>
        ))}
      </div>

      <h2>How these are counted</h2>
      <p>
        Online means sessions active in the last five minutes. Visitors today means unique
        sessions since 00:00 UTC. Clicks exclude known crawlers and count once per visitor per
        listing per hour. Amounts are shown in {currency}, converted from rupees at today&rsquo;s
        rate.
      </p>
    </div>
  )
}
