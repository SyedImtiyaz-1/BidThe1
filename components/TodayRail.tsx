import Link from 'next/link'
import Money from './Money'
import { Trophy } from './icons'
import { getBoard } from '@/lib/rank'
import { convertFromBase } from '@/lib/money'
import type { Rates } from '@/lib/fx'

export default async function TodayRail({
  currency,
  rates,
}: {
  currency: string
  rates: Rates
}) {
  const rows = await getBoard({ scope: 'today', limit: 10 })
  const rate = rates[currency] ?? 1

  return (
    <aside>
      <div className="rail-head">
        <span className="rail-title"><Trophy /> Today&rsquo;s ranking</span>
        <Link href="/?scope=today" className="rail-link">See all ›</Link>
      </div>

      {rows.length === 0 ? (
        <p className="rail-empty">Nobody has claimed a rank since midnight UTC.</p>
      ) : (
        rows.map((r) => (
          <Link
            key={r.id}
            href={`/go/${r.slug}`}
            className="rail-row"
            rel="sponsored nofollow noopener"
            prefetch={false}
          >
            <span className="rail-rank num">{r.rank}</span>
            <img
              className="ico"
              style={{ width: 28, height: 28, borderRadius: 8 }}
              src={`/icon/${r.slug}`}
              alt=""
              loading="lazy"
            />
            <span className="rail-name">{r.title}</span>
            <span className="rail-amt">
              <Money minor={convertFromBase(r.today_minor, currency, rate)} currency={currency} />
            </span>
          </Link>
        ))
      )}
    </aside>
  )
}
