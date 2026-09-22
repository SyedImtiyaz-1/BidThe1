import Link from 'next/link'
import Money from './Money'
import type { BoardRow } from '@/lib/rank'
import { convertFromBase } from '@/lib/money'
import { BASE_CURRENCY, CATEGORIES, STEP_MINOR, MIN_FIRST_PAYMENT_MINOR } from '@/lib/config'
import ClaimTab from './ClaimTab'
import type { Rates } from '@/lib/fx'

const CATEGORY_LABEL = new Map<string, string>(CATEGORIES.map((c) => [c.slug, c.label]))

function age(iso: string): string {
  const d = Date.now() - new Date(iso).getTime()
  const day = 86_400_000
  if (d < day) return 'today'
  if (d < 2 * day) return 'yesterday'
  if (d < 14 * day) return `${Math.floor(d / day)} days ago`
  if (d < 60 * day) return `${Math.floor(d / (7 * day))} weeks ago`
  return `${Math.floor(d / (30 * day))} months ago`
}

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
    return <p className="empty">Nothing here yet. Be the first.</p>
  }

  return (
    <>
      {/* Above the first row, same size as the row titles. Not the footer and
          not a tooltip: undisclosed paid ranking is blacklisted outright by EU
          UCPD Annex I point 11a, with no consumer-harm test attached. */}
      <p className="disclosure">
        <strong>Paid rankings.</strong> Every listing is an advertisement. Position is set only
        by the amount paid, highest first. No editorial judgement, no votes.{' '}
        <Link href="/rules">How ranking works</Link>
      </p>

      <ul className="board">
        {rows.map((r) => {
          const shown = scope === 'all' ? r.total_minor : r.today_minor
          const podium = r.rank <= 3

          // Ties lose, so taking a rank means exceeding what that listing
          // holds, not matching it. One step above is the cheapest amount that
          // does it.
          const takeThisRank = Math.max(MIN_FIRST_PAYMENT_MINOR, shown + STEP_MINOR)
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
                baseMinor={takeThisRank}
                displayMinor={convertFromBase(takeThisRank, currency, rate, 'ceil')}
                currency={currency}
              />

              <span className="rank num">{r.rank}</span>

              <img className="ico" src={`/icon/${r.slug}`} alt="" loading="lazy" width={40} height={40} />

              <div className="row-main">
                <a
                  className="row-title"
                  href={`/go/${r.slug}`}
                  rel="sponsored nofollow noopener"
                  target="_blank"
                >
                  {r.title}
                </a>
                {r.tagline && <div className="row-tag">{r.tagline}</div>}
                <div className="row-meta">
                  <Link href={`/?category=${r.category}`}>
                    {CATEGORY_LABEL.get(r.category) ?? r.category}
                  </Link>
                  <span className="sep">·</span>
                  <span>{age(r.created_at)}</span>
                  <span className="sep">·</span>
                  <span>{r.host}</span>
                  <span className="sep">·</span>
                  <span className="num">{r.click_count.toLocaleString('en-US')} clicks</span>
                  {r.click_count > 0 && shown > 0 && (
                    <>
                      <span className="sep">·</span>
                      {/* The number that turns a rank into an ad buy. */}
                      <span className="num">
                        <Money
                          minor={convertFromBase(Math.round(shown / r.click_count), currency, rate)}
                          currency={currency}
                          decimals
                        />{' '}
                        a click
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="row-money">
                <Money minor={convertFromBase(shown, currency, rate)} currency={currency} />
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
