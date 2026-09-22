import Link from 'next/link'
import Money from './Money'
import type { BoardRow } from '@/lib/rank'
import { convertFromBase, unitsToBeat, unitsToBase, unitMinor } from '@/lib/money'
import { CATEGORIES, MIN_FIRST_PAYMENT_MINOR } from '@/lib/config'
import ClaimTab from './ClaimTab'
import CategoryIcon from './CategoryIcon'
import { ArrowRight, Sparkle } from './icons'
import type { Rates } from '@/lib/fx'

const CATEGORY_LABEL = new Map<string, string>(CATEGORIES.map((c) => [c.slug, c.label]))

export default function Board({
  rows,
  scope,
  currency,
  rates,
  nextPrice,
  justClaimed,
}: {
  rows: BoardRow[]
  scope: 'all' | 'today' | 'day'
  currency: string
  rates: Rates
  nextPrice: number
  justClaimed?: string
}) {
  const rate = rates[currency] ?? 1

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
          // holds, not matching it. Priced in whole units of the currency on
          // screen, because a row showing $433 has to be beaten by $434: a ₹1
          // step is about a cent, and a cent is invisible here.
          const takeUnits = unitsToBeat(shown, currency, rate, MIN_FIRST_PAYMENT_MINOR)
          return (
            <li
              key={r.id}
              className={
                `row${podium ? ' podium' : ''}` +
                (justClaimed === r.slug ? ' just-claimed' : '')
              }
              style={{ viewTransitionName: `row-${r.slug}` }}
            >
              <ClaimTab
                baseMinor={unitsToBase(takeUnits, currency, rate)}
                displayMinor={takeUnits * unitMinor(currency)}
                currency={currency}
              />

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
                    <Money minor={convertFromBase(shown, currency, rate)} currency={currency} />
                  </span>
                </div>
                {r.tagline && <div className="row-tag">{r.tagline}</div>}
                <div className="row-meta">
                  <Link href={`/?category=${r.category}`} className="row-cat">
                    <CategoryIcon slug={r.category} size={13} />
                    {CATEGORY_LABEL.get(r.category) ?? r.category}
                  </Link>
                  <span className="sep">·</span>
                  <span>{r.host}</span>
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
