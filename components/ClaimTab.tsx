'use client'

import Money from './Money'

/**
 * The price to take one specific rank.
 *
 * Clicking it loads that amount into the hero rather than navigating, so the
 * board stays put and the headline rank updates to the row you picked.
 *
 * The event carries minor units of the currency on screen, not base units.
 * Converting base to display and back drifts by one unit on the rounding, and
 * a one unit drift here is exactly the bug this pricing is meant to kill: the
 * badge would offer $434 and the hero would load $435.
 */
export default function ClaimTab({
  baseMinor,
  displayMinor,
  currency,
}: {
  baseMinor: number
  displayMinor: number
  currency: string
}) {
  return (
    <button
      className="claim-tab num"
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent('claim-price', { detail: { displayMinor, currency, baseMinor } }),
        )
        document.getElementById('claim')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }}
    >
      Claim this rank for <Money minor={displayMinor} currency={currency} />
    </button>
  )
}
