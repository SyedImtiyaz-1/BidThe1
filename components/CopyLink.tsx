'use client'

import { useState } from 'react'
import { LinkIcon } from './icons'

/** Copies the page's own URL. Falls back to nothing louder than a label change. */
export default function CopyLink() {
  const [done, setDone] = useState(false)
  return (
    <button
      className="btn btn-quiet"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href)
          setDone(true)
          setTimeout(() => setDone(false), 1800)
        } catch {}
      }}
    >
      <LinkIcon size={14} /> {done ? 'Copied' : 'Copy link'}
    </button>
  )
}
