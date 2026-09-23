import Link from 'next/link'
import Board from '@/components/Board'
import Countdown from '@/components/Countdown'
import { Bolt } from '@/components/icons'
import { getDailyBoards } from '@/lib/rank'
import { formatMoney } from '@/lib/money'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Daily boards',
  description:
    'Every UTC day gets its own board. Rank is what a listing spent that day. Today stays live until midnight UTC, then the day closes and never changes again.',
}

function label(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

export default async function Page() {
  const days = await getDailyBoards()
  const today = new Date().toISOString().slice(0, 10)
  const first = days.length ? days[days.length - 1].day : today

  return (
    <div className="wrap days">
      <header className="cat-head">
        <h1>Daily boards</h1>
        <p className="lead">
          Each UTC day since {label(first)} gets its own board. Rank is what a listing spent
          that day. Today stays live until midnight UTC, then the day closes.
        </p>
      </header>

      {days.length === 0 ? (
        <div className="empty">
          <h3>No days yet.</h3>
          <p>The first payment starts the first day.</p>
          <Link href="/#claim" className="btn"><Bolt /> Claim a rank</Link>
        </div>
      ) : (
        days.map((d) => {
          const live = d.day === today
          return (
            <section key={d.day} className="day-block">
              <div className="day-head">
                <h2>
                  <Link href={`/daily/${d.day}`}>{label(d.day)}</Link>
                  {live && <span className="day-live">Live</span>}
                </h2>
                <span className="day-meta num">
                  {live && <><Countdown /><span className="sep">·</span></>}
                  {d.listings} {d.listings === 1 ? 'listing' : 'listings'}
                  <span className="sep">·</span>
                  {formatMoney(d.totalMinor)}
                </span>
              </div>

              {live && (
                <p className="day-note">
                  This day is still open for claims. It closes at midnight UTC.
                </p>
              )}

              <Board rows={d.rows} scope="day" />

              <div className="day-actions">
                {live && <Link href="/#claim" className="btn"><Bolt /> Claim a rank</Link>}
                <Link href={`/daily/${d.day}`} className="btn btn-quiet">
                  {d.listings > d.rows.length
                    ? `Show all ${d.listings} ranks`
                    : 'Show all ranks'}
                </Link>
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
