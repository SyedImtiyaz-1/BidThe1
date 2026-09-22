'use client'

import { useEffect } from 'react'

/**
 * One ping on load, then every 60 seconds. This is what makes the "online" and
 * "visitors today" numbers in the nav real rather than decorative, which
 * matters: an invented social-proof counter is false urgency under the CCPA
 * dark-pattern guidelines and this operator is in India.
 */
export default function Presence() {
  useEffect(() => {
    const ping = () =>
      fetch('/api/presence', { method: 'POST', keepalive: true }).catch(() => {})
    ping()
    const id = setInterval(ping, 60_000)
    return () => clearInterval(id)
  }, [])
  return null
}
