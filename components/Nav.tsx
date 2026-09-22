import Link from 'next/link'
import Image from 'next/image'
import { SITE_NAME, BASE_CURRENCY } from '@/lib/config'
import { getStats } from '@/lib/rank'
import { convertFromBase, formatMoney } from '@/lib/money'
import { getRates } from '@/lib/fx'
import { getDisplayCurrency } from '@/lib/session'
import CurrencySelect from './CurrencySelect'
import ThemeToggle from './ThemeToggle'
import MobileMenu from './MobileMenu'
import { Calendar, Grid, Info, Scale, BarChart } from './icons'

export default async function Nav() {
  const [stats, currency, { rates }] = await Promise.all([
    getStats(), getDisplayCurrency(), getRates(),
  ])

  /**
   * Traffic counters only once there is traffic worth counting.
   *
   * The same badge that reads as proof at a million visitors reads as "nobody
   * is here" at twelve, and it draws the eye straight to it. Below the
   * threshold the board shows what it has actually got: listings and money on
   * the board. Nothing here is ever invented, which rules out the other way
   * people solve this.
   */
  const TRAFFIC_THRESHOLD = 250
  const showTraffic = stats.visitorsToday >= TRAFFIC_THRESHOLD

  return (
    <nav className="nav">
      <div className="wrap nav-in">
        <Link href="/" className="wordmark">
          <Image src="/logo.png" alt="" width={26} height={26} className="mark" priority />
          {SITE_NAME}<span className="dotlol">.lol</span>
        </Link>

        {/* Counted from real sessions. An invented presence number is false
            urgency under the CCPA dark-pattern guidelines. */}
        <span className="pill-stat num">
          <BarChart size={14} />
          {showTraffic ? (
            <>
              {stats.online > 0 && <span className="dot" />}
              <b>{stats.online} online</b>
              <span className="sep">·</span>
              {stats.visitorsToday.toLocaleString('en-US')} visitors today
            </>
          ) : (
            <>
              <b>{stats.listings.toLocaleString('en-US')} listings</b>
              <span className="sep">·</span>
              {formatMoney(
                convertFromBase(stats.totalMinor, currency, rates[currency] ?? 1),
                currency,
              )}{' '}
              on the board
            </>
          )}
          <span className="sep">·</span>
          <Link href="/stats">stats →</Link>
        </span>

        <div className="nav-right">
          <div className="nav-links">
            <Link href="/daily"><Calendar size={15} /> Daily</Link>
            <Link href="/categories"><Grid size={15} /> Categories</Link>
            <Link href="/about"><Info size={15} /> About</Link>
            <Link href="/rules"><Scale size={15} /> Rules</Link>
          </div>
          <CurrencySelect value={currency} />
          <ThemeToggle />
          <MobileMenu />
        </div>
      </div>
    </nav>
  )
}
