import { q, one } from './db'
import { BASE_CURRENCY, DISPLAY_CURRENCIES } from './config'
import { minorDigits } from './money'

export type Rates = Record<string, number>

/**
 * Units of each currency per 1 INR. Only ever used when the table is empty and
 * the network is unavailable, so the page still renders a sane number instead
 * of a dash. Real rates land in fx_rates on the first successful refresh.
 */
const FALLBACK: Rates = {
  INR: 1, USD: 0.0104362, EUR: 0.0090829, GBP: 0.0077912, AED: 0.0383303,
  SGD: 0.0133051, AUD: 0.0158630, CAD: 0.0142977, JPY: 1.6413000,
  BRL: 0.0536214, NGN: 16.176100, PHP: 0.5948655, ZAR: 0.1826341,
  CHF: 0.0083490, SEK: 0.0991442,
}

const MAX_AGE_MS = 6 * 60 * 60 * 1000

/**
 * open.er-api.com rather than Frankfurter. Frankfurter is ECB-backed and
 * silently drops currencies the ECB does not publish, returning 200 with the
 * symbol simply missing from the response. On a page with a free-choice
 * currency dropdown that is a bug that only shows up for some users.
 */
async function fetchRates(): Promise<Rates | null> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${BASE_CURRENCY}`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = (await res.json()) as { result?: string; rates?: Record<string, number> }
    if (json.result !== 'success' || !json.rates) return null
    const out: Rates = {}
    for (const c of DISPLAY_CURRENCIES) {
      const v = json.rates[c]
      if (typeof v === 'number' && v > 0) out[c] = v
    }
    out[BASE_CURRENCY] = 1
    return Object.keys(out).length > 3 ? out : null
  } catch {
    return null
  }
}

async function storeRates(rates: Rates) {
  for (const [currency, perBase] of Object.entries(rates)) {
    await q(
      `insert into fx_rates (currency, per_base, minor_digits, fetched_at)
       values ($1, $2, $3, now())
       on conflict (currency) do update
         set per_base = excluded.per_base,
             minor_digits = excluded.minor_digits,
             fetched_at = now()`,
      [currency, perBase, minorDigits(currency)],
    )
  }
}

/**
 * Rates are read from the table on the render path, never from the API. A page
 * render must not depend on a third party being up.
 */
export async function getRates(): Promise<{ rates: Rates; asOf: Date | null }> {
  const rows = await q<{ currency: string; per_base: string; fetched_at: Date }>(
    `select currency, per_base, fetched_at from fx_rates`,
  )

  const fresh = await one<{ fetched_at: Date }>(
    `select fetched_at from fx_rates order by fetched_at desc limit 1`,
  )

  const stale =
    !fresh || Date.now() - new Date(fresh.fetched_at).getTime() > MAX_AGE_MS

  if (stale) {
    const fetched = await fetchRates()
    if (fetched) {
      await storeRates(fetched)
      return { rates: fetched, asOf: new Date() }
    }
    if (rows.length === 0) return { rates: FALLBACK, asOf: null }
  }

  const rates: Rates = { ...FALLBACK }
  for (const r of rows) rates[r.currency] = Number(r.per_base)
  return { rates, asOf: fresh ? new Date(fresh.fetched_at) : null }
}
