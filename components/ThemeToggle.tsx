'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from './icons'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === 'dark')
  }, [])

  return (
    <button
      className="icon-btn"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => {
        const next = dark ? 'light' : 'dark'
        const root = document.documentElement

        const apply = () => {
          root.dataset.theme = next
          try { localStorage.setItem('theme', next) } catch {}
          document.cookie = `theme=${next};path=/;max-age=31536000;samesite=lax`
          setDark(!dark)
        }

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reduced || !('startViewTransition' in document)) {
          apply()
          return
        }

        /**
         * The new theme wipes in over the old one, and which way it travels
         * says which way the day is going: night falls from the top, morning
         * comes up from the bottom.
         *
         * The flag has to be set before the transition starts, because that is
         * when the outgoing snapshot is taken. It does two things while it is
         * on: it scopes the wipe to this transition so the board's reorder
         * animation is untouched, and it drops the per-row view-transition
         * names, which would otherwise be lifted out of the snapshot and
         * cross-fade on their own while the page behind them wiped.
         */
        root.dataset.themeSwitch = next === 'dark' ? 'down' : 'up'
        const t = document.startViewTransition(apply)
        t.finished.finally(() => { delete root.dataset.themeSwitch })
      }}
    >
      {dark ? <Sun /> : <Moon />}
    </button>
  )
}
