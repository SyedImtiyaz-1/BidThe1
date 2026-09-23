'use client'

import { useEffect, useState } from 'react'

/**
 * Time left in the current UTC day.
 *
 * Rendered empty on the server and filled after mount: the server and the
 * viewer do not share a clock to the second, and a mismatch there is a
 * hydration error rather than a cosmetic one.
 */
export default function Countdown() {
  const [left, setLeft] = useState<string | null>(null)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const end = Date.UTC(
        now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0,
      )
      const ms = Math.max(0, end - now.getTime())
      const h = Math.floor(ms / 3_600_000)
      const m = Math.floor((ms % 3_600_000) / 60_000)
      const s = Math.floor((ms % 60_000) / 1000)
      setLeft(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (!left) return null
  return <span className="num">{left} left</span>
}
