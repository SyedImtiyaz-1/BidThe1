import Link from 'next/link'
import { getCategoryStats } from '@/lib/rank'
import { getRates } from '@/lib/fx'
import { getDisplayCurrency } from '@/lib/session'
import { convertFromBase, formatMoney } from '@/lib/money'
import { PICKABLE_CATEGORIES } from '@/lib/config'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Categories' }

export default async function Page() {
  const [stats, { rates }, currency] = await Promise.all([
    getCategoryStats(), getRates(), getDisplayCurrency(),
  ])
  const rate = rates[currency] ?? 1
  const by = new Map(stats.map((s) => [s.slug, s]))

  return (
    <div className="wrap prose" style={{ maxWidth: 860 }}>
      <h1>Categories</h1>
      <p className="lead">
        Every category is its own board. Being first overall is expensive; being first in a
        category is not.
      </p>

      <div className="cat-grid">
        {PICKABLE_CATEGORIES.map((c) => {
          const s = by.get(c.slug)
          return (
            <Link key={c.slug} href={`/?category=${c.slug}`} className="cat-card">
              <span className="cat-name">{c.label}</span>
              <span className="cat-count num">
                {s ? `${s.listings} ${s.listings === 1 ? 'listing' : 'listings'}` : 'Empty'}
              </span>
              <span className="cat-top">
                {s?.top ? <>#1 {s.top}</> : 'Nobody has claimed this one'}
              </span>
              <span className="cat-total num">
                {s ? formatMoney(convertFromBase(s.totalMinor, currency, rate), currency) : '—'}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
