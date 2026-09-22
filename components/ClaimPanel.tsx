'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Minus } from './icons'
import { PICKABLE_CATEGORIES, BASE_CURRENCY, MAX_PAYMENT_MINOR } from '@/lib/config'
import {
  formatMoney, moneyParts, unitMinor, unitsToBase, unitsToBeat, baseToUnits, baseToUnitsDown,
} from '@/lib/money'

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
  currency,
  rate,
  totalsByCategory,
}: {
  /** The category in the filter bar, or '' for the whole board. */
  initialCategory: string
  minMinor: number
  currency: string
  rate: number
  totalsByCategory: Record<string, number[]>
}) {
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const [isPending, startRefresh] = useTransition()
  const settle = useRef<(() => void) | null>(null)

  const [url, setUrl] = useState('')
  const [category, setCategory] = useState(initialCategory)
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claim, setClaim] = useState<ClaimResult | null>(null)

  // No category means the whole board: "Claim #1 for" is a rank against
  // everyone, and the dropdown is a question still to be answered.
  const totals = (category ? totalsByCategory[category] : totalsByCategory.all) ?? []
  const leader = totals[0] ?? 0

  /**
   * The amount is held in whole units of the currency on screen, not in base
   * paise. Holding base and converting for display loses the step: ₹1 is about
   * one US cent, and the board prints whole dollars, so the number stops
   * moving while the rank underneath it keeps changing. Whole units on screen
   * means what you read is what ranks.
   */
  const lowest = baseToUnits(minMinor, currency, rate)
  const highest = baseToUnitsDown(MAX_PAYMENT_MINOR, currency, rate)
  const clamp = (u: number) => Math.min(highest, Math.max(lowest, u))

  const [units, setUnits] = useState(() => unitsToBeat(leader, currency, rate, minMinor))
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

  const amount = unitsToBase(units, currency, rate)
  const parts = moneyParts(units * unitMinor(currency), currency)
  const heroRank = rankFor(amount, totals)
  const converted = currency !== BASE_CURRENCY

  const set = (u: number) => { setTyping(null); setTouched(true); setUnits(clamp(u)) }

  /**
   * Until the amount is edited by hand it tracks whatever it takes to lead the
   * category in the dropdown, so switching to an empty category drops the
   * price to the floor and the headline still reads #1. Once a number has been
   * typed or stepped, it is theirs and nothing moves it.
   */
  useEffect(() => {
    if (!touched) setUnits(unitsToBeat(leader, currency, rate, minMinor))
  }, [leader, currency, rate, minMinor, touched])

  /**
   * The currency picker refreshes the route rather than remounting, so this
   * state survives the switch and has to be re-expressed. Convert through the
   * old rate, then round to whole units of the new currency.
   */
  const shownIn = useRef({ currency, rate })
  useEffect(() => {
    const prev = shownIn.current
    if (prev.currency === currency && prev.rate === rate) return
    shownIn.current = { currency, rate }
    if (touched) {
      setUnits(baseToUnits(unitsToBase(units, prev.currency, prev.rate), currency, rate))
    }
  }, [currency, rate, units, touched])

  /** A "claim this rank" badge on the board sets the amount here. */
  useEffect(() => {
    const onPick = (e: Event) => {
      const d = (e as CustomEvent<{ displayMinor: number; currency: string }>).detail
      if (!d || d.currency !== currency) return
      // Exact integer division: the badge priced in the same units this holds.
      set(Math.round(d.displayMinor / unitMinor(currency)))
    }
    window.addEventListener('claim-price', onPick)
    return () => window.removeEventListener('claim-price', onPick)
  }, [currency, rate, lowest, highest])

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
        body: JSON.stringify({ url, category, amountMinor: amount }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not start the claim.')
      setClaim(json)
      setAgreed(false)
      dialog.current?.showModal()
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
          <span>
            Claim #{heroRank}
            {category && <> in <span className="head-cat">{LABEL.get(category)}</span></>}
            {' '}for
          </span>
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
                aria-label={`Amount in ${currency}`}
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
          <button className="btn" onClick={startClaim} disabled={busy}>
            {busy ? 'Working' : 'Claim rank'}
          </button>
        </div>

        {/* Everything here is quoted in the currency on screen. The one
            exception is the charge itself, which is stated separately and in
            full, because a converted price that differs from the amount
            actually debited is drip pricing under the CCPA guidelines. */}
        <p className="step-note num">
          {formatMoney(lowest * unitMinor(currency), currency)} minimum,{' '}
          {formatMoney(unitMinor(currency), currency)} steps
        </p>
        {converted && (
          <p className="step-note charge-note num">
            You are charged {formatMoney(amount, BASE_CURRENCY, { decimals: true })} in{' '}
            {BASE_CURRENCY}
          </p>
        )}

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
                  <span className="val num">{formatMoney(claim.amountMinor, BASE_CURRENCY, { decimals: true })}</span>
                  <div className="modal-note">GST included</div>
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
