import Link from 'next/link'
import Money from './Money'
import { Trophy } from './icons'
import { getBoard } from '@/lib/rank'

/**
 * The board you are not looking at.
 *
 * It opens on whichever scope the page is not showing, so the two are never
 * the same list twice. Its own link switches the rail and nothing else:
 * following it should not move the board somebody is reading.
 */
export default async function SideRail({
  scope,
  flipHref,
}: {
  scope: 'all' | 'today'
  flipHref: string
}) {
  const rows = await getBoard({ scope, limit: 10 })

  const title = scope === 'today' ? 'Today’s ranking' : 'All-time ranking'
  const href = flipHref
  const empty =
    scope === 'today'
      ? 'Nobody has claimed a rank since midnight UTC.'
      : 'Nothing on the board yet.'

  return (
    <aside>
      <div className="rail-head">
        <span className="rail-title">
          {scope === 'today' ? <span className="rail-dot" aria-hidden /> : <Trophy />}
          {title}
        </span>
        <Link href={href} className="rail-link">See all ›</Link>
      </div>

      {rows.length === 0 ? (
        <p className="rail-empty">{empty}</p>
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
              <Money minor={scope === 'today' ? r.today_minor : r.total_minor} />
            </span>
          </Link>
        ))
      )}
    </aside>
  )
}
