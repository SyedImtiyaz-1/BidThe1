import Link from 'next/link'
import { SITE_NAME } from '@/lib/config'
import { getStats } from '@/lib/rank'
import { getDisplayCurrency } from '@/lib/session'
import CurrencySelect from './CurrencySelect'
import ThemeToggle from './ThemeToggle'

export default async function Nav() {
  const [stats, currency] = await Promise.all([getStats(), getDisplayCurrency()])

  return (
    <nav className="nav">
      <div className="wrap nav-in">
        <Link href="/" className="wordmark">
          <span className="mark" />
          {SITE_NAME}<span className="dotlol">.lol</span>
        </Link>

        {/* Counted from real sessions. An invented presence number is false
            urgency under the CCPA dark-pattern guidelines. */}
        <span className="pill-stat num">
          {stats.online > 0 && <span className="dot" />}
          {stats.online > 0 ? <b>{stats.online} online</b> : <b>{stats.listings} listings</b>}
          <span className="sep">·</span>
          {stats.visitorsToday.toLocaleString('en-US')} visitors today
          <span className="sep">·</span>
          <Link href="/stats">stats →</Link>
        </span>

        <div className="nav-right">
          <div className="nav-links">
            <Link href="/daily">Daily</Link>
            <Link href="/categories">Categories</Link>
            <Link href="/about">About</Link>
            <Link href="/rules">Rules</Link>
          </div>
          <CurrencySelect value={currency} />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}
