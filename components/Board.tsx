import Link from 'next/link'
import Money from './Money'
import type { BoardRow } from '@/lib/rank'
import { unitsToBeat, unitsToBase } from '@/lib/money'
import { CATEGORIES, MIN_FIRST_PAYMENT_MINOR } from '@/lib/config'
import ClaimTab from './ClaimTab'
import CategoryIcon from './CategoryIcon'
import KindBadge from './KindBadge'
import { ArrowRight, Sparkle } from './icons'

const CATEGORY_LABEL = new Map<string, string>(CATEGORIES.map((c) => [c.slug, c.label]))

export default function Board({
  rows,
  scope,
  justClaimed,
}: {
  rows: BoardRow[]
  scope: 'all' | 'today' | 'day'
  justClaimed?: string
}) {

  if (rows.length === 0) {
    return (
      <div className="empty">
        <Sparkle size={28} />
        <h3>No listings here yet.</h3>
        <p>The first one takes #1 for the minimum.</p>
        <a href="#claim" className="btn">List your product</a>
      </div>
    )
  }

  return (
    <>
      <ul className="board">
        {rows.map((r) => {
          const shown = scope === 'all' ? r.total_minor : r.today_minor
          const podium = r.rank <= 3

          // Ties lose, so taking a rank means exceeding what that listing
          // holds, not matching it: a row showing $433 is taken with $434.
          const takeUnits = unitsToBeat(shown, MIN_FIRST_PAYMENT_MINOR)
          return (
            <li
              key={r.id}
              className={
                `row${podium ? ' podium' : ''}` +
                (justClaimed === r.slug ? ' just-claimed' : '')
              }
              style={{ viewTransitionName: `row-${r.slug}` }}
            >
              <ClaimTab minor={unitsToBase(takeUnits)} />

              <span className="rank num">#{r.rank}</span>

              <img className="ico" src={`/icon/${r.slug}`} alt="" loading="lazy" width={40} height={40} />

              <div className="row-main">
                <div className="row-head">
                  <a
                    className="row-title"
                    href={`/go/${r.slug}`}
                    rel="sponsored nofollow noopener"
                    target="_blank"
                  >
                    {r.title}
                  </a>
                  <span className="row-money">
                    <Money minor={shown} />
                  </span>
                </div>
                {r.tagline && <div className="row-tag">{r.tagline}</div>}
                <div className="row-meta">
                  <Link href={`/?category=${r.category}`} className="row-cat">
                    <CategoryIcon slug={r.category} size={13} />
                    {CATEGORY_LABEL.get(r.category) ?? r.category}
                  </Link>
                  <span className="sep">·</span>
                  <KindBadge kind={r.kind} />
                  <span className="sep">·</span>
                  <span className="host-cell">{r.host}</span>
                  <span className="sep">·</span>
                  <span className="num">{r.click_count.toLocaleString('en-US')} clicks</span>
                  <span className="sep">·</span>
                  <Link href={`/product/${r.slug}`} className="details">Details <ArrowRight size={12} /></Link>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
