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
        document.documentElement.dataset.theme = next
        try { localStorage.setItem('theme', next) } catch {}
        document.cookie = `theme=${next};path=/;max-age=31536000;samesite=lax`
        setDark(!dark)
      }}
    >
      {dark ? <Sun /> : <Moon />}
    </button>
  )
}
