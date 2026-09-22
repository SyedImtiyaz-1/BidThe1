'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { Plus, Minus, Bolt, Globe, Phone } from './icons'
import { PICKABLE_CATEGORIES, MAX_PAYMENT_MINOR } from '@/lib/config'
import { formatMoney, moneyParts, unitMinor, unitsToBase, unitsToBeat, displayUnits } from '@/lib/money'

type ClaimResult = {
  listingId: string
  title: string
  rankProjected: number
  amountMinor: number
  order: { provider: 'dodo' | 'mock'; orderId: string; checkoutUrl?: string }
}

const LABEL = new Map<string, string>(PICKABLE_CATEGORIES.map((c) => [c.slug, c.label]))

/**
 * What rank an amount buys, given every live total sorted high to low.
 *
 * Ties lose, matching the board itself: paying exactly what a listing holds
 * leaves you below it, because it reached that total first. Binary search so
 * this stays instant on a board of thousands.
 */
function rankFor(amountMinor: number, totals: number[]): number {
  let lo = 0
  let hi = totals.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (totals[mid] >= amountMinor) lo = mid + 1
    else hi = mid
  }
  return lo + 1
}

export default function ClaimPanel({
  initialCategory,
  minMinor,
  totalsByCategory,
}: {
  /** The category in the filter bar, or '' for the whole board. */
  initialCategory: string
  minMinor: number
  totalsByCategory: Record<string, number[]>
}) {
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const [isPending, startRefresh] = useTransition()
  const settle = useRef<(() => void) | null>(null)

  const [url, setUrl] = useState('')
  const [category, setCategory] = useState(initialCategory)
  const [kind, setKind] = useState<'website' | 'app'>('website')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claim, setClaim] = useState<ClaimResult | null>(null)

  // No category means the whole board: "Claim #1 for" is a rank against
  // everyone, and the dropdown is a question still to be answered.
  const totals = (category ? totalsByCategory[category] : totalsByCategory.all) ?? []
  const leader = totals[0] ?? 0

  /** Whole dollars. The number on screen is the number that ranks. */
  const lowest = Math.ceil(minMinor / unitMinor())
  const highest = Math.floor(MAX_PAYMENT_MINOR / unitMinor())
  const clamp = (u: number) => Math.min(highest, Math.max(lowest, u))

  const [units, setUnits] = useState(() => unitsToBeat(leader, minMinor))
  const [touched, setTouched] = useState(false)

  /**
   * The filter bar and this dropdown are two views of one choice. Clicking a
   * category up there re-renders the page with a new initialCategory and the
   * dropdown follows. The amount goes back to tracking the leader too, because
   * the question just changed from what #1 costs here to what it costs there.
   */
  useEffect(() => {
    setCategory(initialCategory)
    setTouched(false)
  }, [initialCategory])

  const amount = unitsToBase(units)
  const parts = moneyParts(amount)

  // Ties lose: a leader on $878 is beaten by $879 and tied by $878.
  const heroRank = rankFor(units, totals.map(displayUnits))

  const set = (u: number) => { setTyping(null); setTouched(true); setUnits(clamp(u)) }

  /**
   * Until the amount is edited by hand it tracks whatever it takes to lead the
   * category in the dropdown, so switching to an empty category drops the
   * price to the floor and the headline still reads #1. Once a number has been
   * typed or stepped, it is theirs and nothing moves it.
   */
  useEffect(() => {
    if (!touched) setUnits(unitsToBeat(leader, minMinor))
  }, [leader, minMinor, touched])

  /** A "claim this rank" badge on the board sets the amount here. */
  useEffect(() => {
    const onPick = (e: Event) => {
      const minor = (e as CustomEvent<number>).detail
      if (!Number.isFinite(minor)) return
      set(Math.round(minor / unitMinor()))
    }
    window.addEventListener('claim-price', onPick)
    return () => window.removeEventListener('claim-price', onPick)
  }, [lowest, highest])

  // router.refresh() returns nothing and commits later, so a view transition
  // that wraps it would finish before React re-rendered and animate nothing.
  // Holding the transition open until the pending flag clears is what makes
  // the rows actually travel to their new positions.
  useEffect(() => {
    if (!isPending && settle.current) {
      settle.current()
      settle.current = null
    }
  }, [isPending])

  /**
   * The price is editable as well as steppable. While it has focus it holds
   * raw digits, because reformatting mid-edit moves the caret out from under
   * the person typing. On blur it goes back to grouped digits.
   */
  const [typing, setTyping] = useState<string | null>(null)
  const shown = typing ?? parts.amount

  function commit(raw: string) {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 12)
    if (!digits) return
    setTouched(true)
    setUnits(clamp(Number(digits)))
  }

  async function startClaim() {
    setError(null)
    if (!url.trim()) { setError('Paste a link first.'); return }
    if (!category) { setError('Choose a category.'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, category, kind, amountMinor: amount }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not start the claim.')
      setClaim(json)
      setAgreed(false)
      dialog.current?.showModal()
      // The funnel worth measuring: board seen -> price set -> money taken.
      posthog.capture?.('claim_started', {
        category, kind, rank_projected: json.rankProjected,
        amount_minor: json.amountMinor,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  /** Re-sort the board with the rows travelling to their new positions. */
  function refreshAnimated() {
    const run = () =>
      new Promise<void>((resolve) => {
        settle.current = resolve
        startRefresh(() => router.refresh())
      })

    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      document.startViewTransition(run)
    } else {
      void run()
    }
  }

  async function pay() {
    if (!claim || !agreed) return
    setBusy(true)
    setError(null)
    try {
      if (claim.order.provider === 'mock') {
        const res = await fetch('/api/pay/mock', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ orderId: claim.order.orderId, listingId: claim.listingId }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Payment failed.')
        dialog.current?.close()
        setUrl('')
        setTouched(false)
        refreshAnimated()
        return
      }

      // Dodo hosts the checkout, so this is a full page handover. The buyer
      // comes back to /?claimed=<slug> and the webhook is what actually moves
      // the board.
      if (!claim.order.checkoutUrl) throw new Error('No checkout link came back. Try again.')
      posthog.capture?.('checkout_opened', {
        category, rank_projected: claim.rankProjected, amount_minor: claim.amountMinor,
      })
      window.location.assign(claim.order.checkoutUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed.')
      setBusy(false)
    }
  }

  return (
    <div id="claim">
      <div className="hero">
        <h1 className="head-line display">
          <span className="head-text">
            Claim #{heroRank}
            {category && <> in <span className="head-cat">{LABEL.get(category)}</span></>}
            {' '}for
          </span>
          {/* The steppers and the price are one unit. As four separate flex
              children they broke apart on a narrow screen, leaving the minus
              button stranded at the end of the sentence. */}
          <span className="head-amount">
          <button
            className="step-btn"
            aria-label="Lower the amount"
            onClick={() => set(units - 1)}
          ><Minus /></button>
          <span className="head-price">
            <span className="sym">{parts.symbol}</span>
            <span className="price-field num" data-sizer={shown || '0'}>
              <input
                className="price-input num"
                value={shown}
                size={1}
                inputMode="numeric"
                autoComplete="off"
                aria-label="Amount in US dollars"
                onFocus={(e) => {
                  setTyping(parts.amount.replace(/[^0-9]/g, ''))
                  requestAnimationFrame(() => e.target.select())
                }}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 12)
                  setTyping(digits)
                  commit(digits)
                }}
                onBlur={() => {
                  commit(typing ?? '')
                  setTyping(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                  if (e.key === 'ArrowUp') { e.preventDefault(); set(units + 1) }
                  if (e.key === 'ArrowDown') { e.preventDefault(); set(units - 1) }
                }}
              />
            </span>
          </span>
          <button
            className="step-btn"
            aria-label="Raise the amount"
            onClick={() => set(units + 1)}
          ><Plus /></button>
          </span>
        </h1>

        <div className="claim-row">
          <input
            className="input"
            placeholder="Your product URL or @handle"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startClaim()}
            inputMode="url"
            aria-label="Your product link"
          />
          <select
            className={`select${category ? '' : ' is-empty'}`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Category"
          >
            <option value="">Choose a category</option>
            {PICKABLE_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
          <div className="kind-pick" role="group" aria-label="What are you listing">
            {(['website', 'app'] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={kind === k ? 'on' : ''}
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
              >
                {k === 'website' ? <Globe size={14} /> : <Phone size={14} />}
                {k === 'website' ? 'Website' : 'App'}
              </button>
            ))}
          </div>
          <button className="btn" onClick={startClaim} disabled={busy}>
            <Bolt /> {busy ? 'Working' : 'Claim rank'}
          </button>
        </div>

        <p className="step-note num">
          {formatMoney(unitsToBase(lowest))} minimum, {formatMoney(unitMinor())} steps
        </p>

        {error && !claim && <p className="err" style={{ marginTop: 10 }}>{error}</p>}
      </div>

      <dialog ref={dialog} onClose={() => setClaim(null)}>
        {claim && (
          <>
            <div className="modal-in">
              <h2 className="modal-title">Rank #{claim.rankProjected}</h2>
              <p className="modal-body">
                You are buying an advertisement for {claim.title}. This buys a listing at that
                position on the all-time board and on today&rsquo;s board. Today&rsquo;s rank counts
                money paid since 00:00 UTC. Anyone who pays more takes the position.
              </p>

              <div className="modal-box">
                <div>
                  <span className="lbl">Rank</span>
                  <span className="val num">#{claim.rankProjected}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="lbl">Charged now</span>
                  <span className="val num">{formatMoney(claim.amountMinor, { decimals: true })}</span>
                  <div className="modal-note">Tax added at checkout</div>
                </div>
              </div>

              <label className="check">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>
                  I have read the <a href="/terms" target="_blank">terms</a>. I understand this is
                  advertising and that being passed later is not refunded.
                </span>
              </label>

              {error && <p className="err" style={{ marginTop: 12 }}>{error}</p>}
            </div>

            <div className="modal-foot">
              <button className="btn btn-quiet" onClick={() => dialog.current?.close()}>Cancel</button>
              <button className="btn" onClick={pay} disabled={!agreed || busy}>
                {busy ? 'Working' : 'Continue to checkout'}
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  )
}
