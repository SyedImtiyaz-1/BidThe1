import Link from 'next/link'
import ClaimPanel from '@/components/ClaimPanel'
import TodayRail from '@/components/TodayRail'
import Board from '@/components/Board'
import { Trophy } from '@/components/icons'
import { getBoard, priceToLead, getTotalsByCategory } from '@/lib/rank'
import { getRates } from '@/lib/fx'
import { getDisplayCurrency } from '@/lib/session'
import { CATEGORIES, MIN_FIRST_PAYMENT_MINOR } from '@/lib/config'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

type Search = { scope?: string; category?: string; page?: string; claimed?: string }

/**
 * 1 2 3 4 … 60 near the start, 1 … 57 58 59 60 near the end, 1 … 29 30 31 … 60
 * in the middle. Numbers only, no guessing where you are.
 */
function pageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, '…', total]
  if (current >= total - 3) return [1, '…', total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const scope: 'all' | 'today' = sp.scope === 'today' ? 'today' : 'all'
  const category = sp.category && sp.category !== 'all' ? sp.category : undefined
  const page = Math.max(1, Number(sp.page) || 1)

  const [{ rates }, currency] = await Promise.all([getRates(), getDisplayCurrency()])

  // Sorted totals answer three questions at once: who leads (the first entry),
  // how many listings there are (the length) and what rank any amount buys.
  // That is two fewer round trips per render, which matters more than it looks
  // when the database is a continent away.
  const [rows, totalsByCategory] = await Promise.all([
    getBoard({ scope, category, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getTotalsByCategory(),
  ])

  const totals = totalsByCategory[category ?? 'all'] ?? []
  const total = totals.length
  const nextPrice = priceToLead(totals[0] ?? 0, 0)
  const rate = rates[currency] ?? 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    const merged = { scope: sp.scope, category: sp.category, page: sp.page, ...patch }
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v)
    const s = p.toString()
    return s ? `/?${s}` : '/'
  }

  return (
    <div className="wrap">
      <nav className="catbar">
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={qs({ category: c.slug === 'all' ? undefined : c.slug, page: undefined })}
            aria-current={(sp.category ?? 'all') === c.slug}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      <div className="scope">
        <div className="scope-in">
          <Link href={qs({ scope: undefined, page: undefined })} aria-current={scope === 'all'}>
            <Trophy /> All-time
          </Link>
          <Link href={qs({ scope: 'today', page: undefined })} aria-current={scope === 'today'}>
            Today
          </Link>
        </div>
      </div>

      <ClaimPanel
        minMinor={MIN_FIRST_PAYMENT_MINOR}
        currency={currency}
        rate={rate}
        totalsByCategory={totalsByCategory}
      />

      {sp.claimed && (
        <p className="landed">
          Payment received. Your listing moves as soon as the payment confirms, usually within a
          few seconds.
        </p>
      )}

      <div className="cols">
        <div>
          <Board
            rows={rows}
            scope={scope}
            currency={currency}
            rates={rates}
            nextPrice={nextPrice}
            justClaimed={sp.claimed}
          />

          {totalPages > 1 && (
            <>
              <nav className="pager num" aria-label="Pages">
                {page > 1
                  ? <Link href={qs({ page: page === 2 ? undefined : String(page - 1) })} aria-label="Previous page">‹</Link>
                  : <span className="arrow-off">‹</span>}

                {pageList(page, totalPages).map((n, i) =>
                  n === '…' ? (
                    <span key={`gap${i}`} className="gap">…</span>
                  ) : n === page ? (
                    <span key={n} className="current" aria-current="page">{n}</span>
                  ) : (
                    <Link key={n} href={qs({ page: n === 1 ? undefined : String(n) })}>{n}</Link>
                  ),
                )}

                {page < totalPages
                  ? <Link href={qs({ page: String(page + 1) })} aria-label="Next page">›</Link>
                  : <span className="arrow-off">›</span>}
              </nav>
              <p className="pager-count num">{from} – {to} of {total.toLocaleString('en-US')}</p>
            </>
          )}
        </div>

        <TodayRail currency={currency} rates={rates} />
      </div>
    </div>
  )
}
