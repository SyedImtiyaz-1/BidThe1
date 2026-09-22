import { BASE_CURRENCY, BASE_MINOR_DIGITS } from './config'

/**
 * Never hardcode `amount / 100`. Yen and won have no minor unit, dinars have
 * three digits, so a fixed divisor is wrong by 100x for JPY and 10x for KWD.
 * Intl already knows every ISO 4217 exponent, so ask it.
 */
const digitCache = new Map<string, number>()

export function minorDigits(currency: string): number {
  const hit = digitCache.get(currency)
  if (hit !== undefined) return hit
  let digits = 2
  try {
    digits = new Intl.NumberFormat('en', { style: 'currency', currency })
      .resolvedOptions().minimumFractionDigits ?? 2
  } catch {
    digits = 2
  }
  digitCache.set(currency, digits)
  return digits
}

const LOCALES: Record<string, string> = {
  INR: 'en-IN',
  JPY: 'ja-JP',
  EUR: 'de-DE',
  GBP: 'en-GB',
  BRL: 'pt-BR',
  CHF: 'de-CH',
  SEK: 'sv-SE',
}

function localeFor(currency: string) {
  return LOCALES[currency] ?? 'en-US'
}

export type MoneyParts = { symbol: string; amount: string }

/**
 * Split symbol from digits so the symbol can be set smaller and lighter. The
 * symbol is context, the number is the content.
 *
 * Decimals are off by default: the ladder steps in whole rupees, so `.00` down
 * a column of fifty rows is pure noise. The checkout modal turns them back on,
 * because that is where an exact charge is being stated.
 */
export function moneyParts(
  minor: number,
  currency: string,
  opts: { decimals?: boolean } = {},
): MoneyParts {
  const digits = minorDigits(currency)
  const value = minor / 10 ** digits
  const fraction = opts.decimals ? digits : 0

  const parts = new Intl.NumberFormat(localeFor(currency), {
    style: 'currency',
    currency,
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  }).formatToParts(value)

  let symbol = ''
  let amount = ''
  for (const p of parts) {
    if (p.type === 'currency') symbol += p.value
    else if (p.type === 'literal' && !symbol) continue
    else if (p.type === 'literal') continue
    else amount += p.value
  }
  return { symbol: symbol || currency, amount }
}

export function formatMoney(minor: number, currency: string, opts?: { decimals?: boolean }) {
  const { symbol, amount } = moneyParts(minor, currency, opts)
  return `${symbol}${amount}`
}

export type Rounding = 'ceil' | 'floor' | 'round'

/**
 * Rounding here is deliberately asymmetric.
 *
 *  - A price someone must pay rounds UP, so the number on screen always clears
 *    the threshold. Rounding down shows a price that looks sufficient and is not.
 *  - Money being credited rounds DOWN, so we never credit more value than the
 *    payment actually bought.
 *  - A total already paid rounds to nearest, because it is only informational.
 */
export function convertFromBase(
  baseMinor: number,
  currency: string,
  perBase: number,
  mode: Rounding = 'round',
): number {
  if (currency === BASE_CURRENCY) return baseMinor
  const major = (baseMinor / 10 ** BASE_MINOR_DIGITS) * perBase
  const target = major * 10 ** minorDigits(currency)
  if (mode === 'ceil') return Math.ceil(target)
  if (mode === 'floor') return Math.floor(target)
  return Math.round(target)
}

/**
 * The inverse of convertFromBase: take an amount the viewer typed in their own
 * currency and turn it into base minor units.
 *
 * Needed because the input accepts whatever currency is on screen while the
 * ladder itself only ever moves in base units.
 */
export function convertToBase(
  displayMinor: number,
  currency: string,
  perBase: number,
  mode: Rounding = 'round',
): number {
  if (currency === BASE_CURRENCY || !perBase) return displayMinor
  const major = displayMinor / 10 ** minorDigits(currency)
  const base = (major / perBase) * 10 ** BASE_MINOR_DIGITS
  if (mode === 'ceil') return Math.ceil(base)
  if (mode === 'floor') return Math.floor(base)
  return Math.round(base)
}

export function formatConverted(
  baseMinor: number,
  currency: string,
  perBase: number,
  mode: Rounding = 'round',
  opts?: { decimals?: boolean },
) {
  return formatMoney(convertFromBase(baseMinor, currency, perBase, mode), currency, opts)
}
