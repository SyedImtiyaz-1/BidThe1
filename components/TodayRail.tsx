import Link from 'next/link'
import Money from './Money'
import { Trophy } from './icons'
import { getBoard } from '@/lib/rank'

export default async function TodayRail() {
  const rows = await getBoard({ scope: 'today', limit: 10 })

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
            <span className="rail-rank num">#{r.rank}</span>
            <img
              className="ico"
              style={{ width: 26, height: 26, borderRadius: 7 }}
              src={`/icon/${r.slug}`}
              alt=""
              loading="lazy"
            />
            <span className="rail-name">{r.title}</span>
            <span className="rail-amt">
              <Money minor={r.today_minor} />
            </span>
          </Link>
        ))
      )}
    </aside>
  )
}
