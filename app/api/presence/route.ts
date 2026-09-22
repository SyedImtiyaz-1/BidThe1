import { NextResponse } from 'next/server'
import { q } from '@/lib/db'
import { clientIp, visitorHash, looksLikeBot } from '@/lib/hash'

export async function POST(req: Request) {
  const ua = req.headers.get('user-agent') ?? ''
  if (looksLikeBot(ua)) return NextResponse.json({ ok: true })

  const who = visitorHash(clientIp(req.headers), ua)
  await q(
    `insert into presence (visitor_hash, day, last_seen)
     values ($1, (now() at time zone 'utc')::date, now())
     on conflict (visitor_hash) do update set last_seen = now()`,
    [who],
  )
  return NextResponse.json({ ok: true })
}
