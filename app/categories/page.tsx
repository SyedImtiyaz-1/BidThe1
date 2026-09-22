import Link from 'next/link'
import Money from '@/components/Money'
import { Trophy, Clock } from '@/components/icons'
import CategoryIcon from '@/components/CategoryIcon'
import { getCategoryBoards } from '@/lib/rank'
import { getRates } from '@/lib/fx'
import { getDisplayCurrency } from '@/lib/session'
import { convertFromBase, unitsToBeat, unitMinor } from '@/lib/money'
import { PICKABLE_CATEGORIES, MIN_FIRST_PAYMENT_MINOR } from '@/lib/config'
import { ago } from '@/lib/time'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Categories',
  description:
    'Every category is its own board. See where ranks are being claimed, who holds the top spot, and what it costs to take it.',
}

const LABEL = new Map<string, string>(PICKABLE_CATEGORIES.map((c) => [c.slug, c.label]))

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>
}) {
  const sp = await searchParams
  const scope: 'all' | 'today' = sp.scope === 'today' ? 'today' : 'all'

  const [boards, { rates }, currency] = await Promise.all([
    getCategoryBoards(scope), getRates(), getDisplayCurrency(),
  ])
  const rate = rates[currency] ?? 1
  const by = new Map(boards.map((b) => [b.slug, b]))

  // Hottest means claims first and recency second: a category with four claims
  // today outranks one with four claims that all landed last month.
  const hottest = [...boards]
    .filter((b) => b.claims > 0)
    .sort((a, b) =>
      b.claims - a.claims ||
      new Date(b.lastClaimAt ?? 0).getTime() - new Date(a.lastClaimAt ?? 0).getTime(),
    )
    .slice(0, 3)

  const href = (s: 'all' | 'today') => (s === 'all' ? '/categories' : '/categories?scope=today')

  return (
    <div className="wrap">
      <div className="scope">
        <div className="scope-in">
          <Link href={href('all')} aria-current={scope === 'all'}><Trophy /> All-time</Link>
          <Link href={href('today')} aria-current={scope === 'today'}><Clock /> Today</Link>
        </div>
      </div>

      <header className="cat-head">
        <h1>Most active categories</h1>
        <p className="lead">
          Where ranks are getting claimed, and who is holding the top spot.
          {scope === 'today' && ' Counting money paid since 00:00 UTC.'}
        </p>
      </header>

      {hottest.length > 0 ? (
        <div className="hot-grid">
          {hottest.map((b, i) => (
            <Link key={b.slug} href={`/?category=${b.slug}`} className="hot-card">
              <span className="hot-badge num">{i === 0 ? '#1 hottest' : `#${i + 1}`}</span>
              <span className="hot-name"><CategoryIcon slug={b.slug} size={18} /> {LABEL.get(b.slug) ?? b.slug}</span>
              <span className="hot-meta num">
                {b.claims} {b.claims === 1 ? 'claim' : 'claims'}
                <span className="sep">·</span>
                {ago(b.lastClaimAt)}
              </span>
              {b.top[0] && (
                <span className="hot-lead">
                  <span className="hot-lead-k">Leading</span> {b.top[0].title}
                </span>
              )}
              {b.top[0] && (
                <span className="hot-amt">
                  <Money
                    minor={convertFromBase(b.top[0].amountMinor, currency, rate)}
                    currency={currency}
                  />
                </span>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <p className="empty">
          {scope === 'today'
            ? 'No claims yet today. Every category is open at the minimum.'
            : 'Nothing claimed anywhere yet. Every category is open at the minimum.'}
        </p>
      )}

      <div className="cat-boards">
        {PICKABLE_CATEGORIES.map((c) => {
          const b = by.get(c.slug)
          // What the next person pays to lead this category, in the currency
          // on screen and one whole unit above the number printed above it.
          const toLead = unitsToBeat(
            b?.top[0]?.amountMinor ?? 0, currency, rate, MIN_FIRST_PAYMENT_MINOR,
          )
          return (
            <section key={c.slug} className="cat-board">
              <h2>
                <Link href={`/?category=${c.slug}`}><CategoryIcon slug={c.slug} size={16} /> {c.label}</Link>
                <span className="cat-board-take num">
                  <Money minor={toLead * unitMinor(currency)} currency={currency} /> to lead
                </span>
              </h2>

              {b && b.top.length > 0 ? (
                <ol className="cat-rows">
                  {b.top.map((t, i) => (
                    <li key={t.slug}>
                      <span className="cat-rank num">#{i + 1}</span>
                      <a
                        className="cat-row-title"
                        href={`/go/${t.slug}`}
                        rel="sponsored nofollow noopener"
                        target="_blank"
                      >
                        {t.title}
                      </a>
                      <span className="cat-row-amt num">
                        <Money
                          minor={convertFromBase(t.amountMinor, currency, rate)}
                          currency={currency}
                        />
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="cat-empty">
                  Nobody has claimed this one{scope === 'today' ? ' today' : ''}.
                </p>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
