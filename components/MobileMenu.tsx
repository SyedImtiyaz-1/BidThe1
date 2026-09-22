'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'
import { Trophy, Clock, Grid, Calendar, Info, Scale, HelpCircle, BarChart } from './icons'

type Mark = ComponentType<{ size?: number }>
const LINKS: [string, string, Mark][] = [
  ['/', 'Leaderboard', Trophy],
  ['/?scope=today', 'Today', Clock],
  ['/categories', 'Categories', Grid],
  ['/daily', 'Daily', Calendar],
  ['/about', 'About', Info],
  ['/rules', 'Rules', Scale],
  ['/faq', 'FAQ', HelpCircle],
  ['/stats', 'Live stats', BarChart],
]

/**
 * The nav links, behind a button, below the tablet breakpoint.
 *
 * Closes on navigation, on Escape, and on a tap outside. While open the page
 * behind does not scroll, so a thumb that misses the panel does not fling
 * the board around.
 */
export default function MobileMenu() {
  const [open, setOpen] = useState(false)
  const path = usePathname()

  useEffect(() => { setOpen(false) }, [path])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <div className="menu">
      <button
        className="icon-btn"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`burger${open ? ' is-open' : ''}`} aria-hidden><i /><i /><i /></span>
      </button>
      {open && (
        <>
          <div className="menu-backdrop" onClick={() => setOpen(false)} />
          <nav id="site-menu" className="menu-panel" aria-label="Site">
            {LINKS.map(([href, label, Mark]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}><Mark size={16} /> {label}</Link>
            ))}
          </nav>
        </>
      )}
    </div>
  )
}
