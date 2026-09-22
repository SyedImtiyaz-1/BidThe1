import Link from 'next/link'
import { getDays } from '@/lib/rank'
import { formatMoney } from '@/lib/money'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Daily boards' }

function label(day: string) {
  const d = new Date(`${day}T00:00:00Z`)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

export default async function Page() {
  const days = await getDays()
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="wrap prose" style={{ maxWidth: 760 }}>
      <h1>Daily boards</h1>
      <p className="lead">
        Every UTC calendar day gets its own board. The current day stays live until midnight
        UTC, then freezes as an archive. Nothing is deleted, so a day never changes again.
      </p>

      {days.length === 0 ? (
        <p>No payments yet. The first one starts the first day.</p>
      ) : (
        <div className="day-list">
          {days.map((d) => (
            <Link key={d.day} href={`/daily/${d.day}`} className="day-row">
              <span className="day-name">
                {label(d.day)}
                {d.day === today && <span className="day-live">live</span>}
              </span>
              <span className="day-meta num">
                {d.listings} {d.listings === 1 ? 'listing' : 'listings'}
                <span className="sep"> · </span>
                {d.payments} {d.payments === 1 ? 'payment' : 'payments'}
              </span>
              <span className="day-total num">
                {formatMoney(d.totalMinor)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
