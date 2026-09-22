import Link from 'next/link'
import { notFound } from 'next/navigation'
import Board from '@/components/Board'
import { getBoard, getDays } from '@/lib/rank'
import { formatMoney } from '@/lib/money'

export const dynamic = 'force-dynamic'

function label(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

export default async function Page({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()

  const [rows, days] = await Promise.all([
    getBoard({ scope: 'day', day: date, limit: 100 }),
    getDays(),
  ])

  const day = days.find((d) => d.day === date)
  const isToday = date === new Date().toISOString().slice(0, 10)

  return (
    <div className="wrap" style={{ maxWidth: 860 }}>
      <div className="prose" style={{ maxWidth: 'none', paddingBottom: 8 }}>
        <p style={{ margin: 0 }}>
          <Link href="/daily">← All days</Link>
        </p>
        <h1>{label(date)}</h1>
        <p className="lead">
          {day
            ? <>
                {formatMoney(day.totalMinor)} across{' '}
                {day.payments} {day.payments === 1 ? 'payment' : 'payments'}.{' '}
                {isToday ? 'Still open until midnight UTC.' : 'Closed and frozen.'}
              </>
            : 'Nothing was paid on this day.'}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="empty">No listings claimed a rank on this day.</p>
      ) : (
        <Board rows={rows} scope="day" />
      )}
    </div>
  )
}
