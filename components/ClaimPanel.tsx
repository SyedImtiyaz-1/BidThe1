'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Minus } from './icons'
import { PICKABLE_CATEGORIES, STEP_MINOR, BASE_CURRENCY, MAX_PAYMENT_MINOR } from '@/lib/config'
import { convertFromBase, convertToBase, formatMoney, moneyParts, minorDigits } from '@/lib/money'

type ClaimResult = {
  listingId: string
  title: string
  rankProjected: number
  amountMinor: number
  order: { provider: 'dodo' | 'mock'; orderId: string; checkoutUrl?: string }
}

export default function ClaimPanel({
  suggestedMinor,
  minMinor,
  currency,
  rate,
}: {
  suggestedMinor: number
  minMinor: number
  currency: string
  rate: number
}) {
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const [isPending, startRefresh] = useTransition()
  const settle = useRef<(() => void) | null>(null)

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

  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('ai')
  const [amount, setAmount] = useState(suggestedMinor)
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claim, setClaim] = useState<ClaimResult | null>(null)

  const converted = currency !== BASE_CURRENCY
  const shownMinor = convertFromBase(amount, currency, rate, 'ceil')
  const parts = moneyParts(shownMinor, currency)

  /**
   * The price is editable as well as steppable. While it has focus it holds
   * raw digits, because reformatting mid-edit moves the caret out from under
   * the person typing. On blur it goes back to grouped digits.
   */
  const [typing, setTyping] = useState<string | null>(null)
  const shown = typing ?? parts.amount

  /** Digits on screen are whole units of the viewer's currency. */
  function commit(raw: string) {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 12)
    if (!digits) return
    const displayMinor = Number(digits) * 10 ** minorDigits(currency)
    const base = convertToBase(displayMinor, currency, rate, 'round')
    setAmount(Math.min(MAX_PAYMENT_MINOR, Math.max(minMinor, base)))
  }

  async function startClaim() {
    setError(null)
    if (!url.trim()) { setError('Paste a link first.'); return }
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
          <span>Claim #1 for</span>
          <button
            className="step-btn"
            aria-label="Lower the amount"
            onClick={() => { setTyping(null); setAmount((a) => Math.max(minMinor, a - STEP_MINOR)) }}
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
                  if (e.key === 'ArrowUp') { e.preventDefault(); setTyping(null); setAmount((a) => Math.min(MAX_PAYMENT_MINOR, a + STEP_MINOR)) }
                  if (e.key === 'ArrowDown') { e.preventDefault(); setTyping(null); setAmount((a) => Math.max(minMinor, a - STEP_MINOR)) }
                }}
              />
            </span>
          </span>
          <button
            className="step-btn"
            aria-label="Raise the amount"
            onClick={() => { setTyping(null); setAmount((a) => Math.min(MAX_PAYMENT_MINOR, a + STEP_MINOR)) }}
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
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            {PICKABLE_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
          <button className="btn" onClick={startClaim} disabled={busy}>
            {busy ? 'Working' : 'Claim rank'}
          </button>
        </div>

        <p className="step-note num">
          {formatMoney(minMinor, BASE_CURRENCY)} minimum, {formatMoney(STEP_MINOR, BASE_CURRENCY)} steps
          {converted && <> · charged {formatMoney(amount, BASE_CURRENCY)} in {BASE_CURRENCY}</>}
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
