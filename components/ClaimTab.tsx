'use client'

import Money from './Money'

/**
 * The price to take one specific rank.
 *
 * Clicking it loads that amount into the hero rather than navigating, so the
 * board stays put and the headline rank updates to the row you picked.
 */
export default function ClaimTab({ minor }: { minor: number }) {
  return (
    <button
      className="claim-tab num"
      onClick={() => {
        window.dispatchEvent(new CustomEvent('claim-price', { detail: minor }))
        document.getElementById('claim')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }}
    >
      Claim this rank for <Money minor={minor} />
    </button>
  )
}
