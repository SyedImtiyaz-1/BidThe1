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

/** One whole unit in minor units: ₹1 is 100 paise, ¥1 is 1 yen, KD 1 is 1000 fils. */
export function unitMinor(currency: string): number {
  return 10 ** minorDigits(currency)
}

/**
 * The ladder as the viewer actually sees it.
 *
 * The real step is ₹1. Converted to dollars that is about one cent, and the
 * board prints whole dollars, so two amounts a rupee apart show the same
 * number while ranking differently. That is how a row holding $433 offered
 * "claim this rank for $433", and how $17,001 landed second behind $17,001.
 *
 * So the viewer's ladder steps in whole units of the viewer's own currency,
 * and the charge is whatever that costs in rupees, rounded up. What is on
 * screen is then exactly what decides the rank.
 */
export function unitsToBase(units: number, currency: string, perBase: number): number {
  return convertToBase(units * unitMinor(currency), currency, perBase, 'ceil')
}

/** Base minor to the smallest whole unit count worth at least that much. */
export function baseToUnits(baseMinor: number, currency: string, perBase: number): number {
  return Math.ceil(convertFromBase(baseMinor, currency, perBase, 'ceil') / unitMinor(currency))
}

/** Base minor to the largest whole unit count worth no more than that. */
export function baseToUnitsDown(baseMinor: number, currency: string, perBase: number): number {
  return Math.floor(convertFromBase(baseMinor, currency, perBase, 'floor') / unitMinor(currency))
}

/** The whole-unit number the board actually prints for an amount. */
export function displayUnits(baseMinor: number, currency: string, perBase: number): number {
  return Math.round(convertFromBase(baseMinor, currency, perBase, 'round') / unitMinor(currency))
}

/**
 * The cheapest whole-unit amount that actually passes `targetBase`.
 *
 * Ties lose on this board, so passing someone means exceeding what they hold.
 * It has to exceed it twice over:
 *
 *  - on screen, because a row printing $433 offering "claim this rank for
 *    $433" is nonsense to read, whatever the paise underneath are doing;
 *  - underneath, because the paise are what the ranking query compares.
 *
 * The first is the binding one at normal rates, the second matters when a unit
 * of the display currency is worth less than a rupee. So: one above the
 * printed number, then walk until the charge genuinely clears.
 */
export function unitsToBeat(
  targetBaseMinor: number,
  currency: string,
  perBase: number,
  minBaseMinor = 0,
): number {
  let units = Math.max(
    1,
    baseToUnits(minBaseMinor, currency, perBase),
    targetBaseMinor > 0 ? displayUnits(targetBaseMinor, currency, perBase) + 1 : 0,
  )
  // A ceil on each side can compound, so cap the walk rather than loop freely.
  for (let i = 0; i < 8 && unitsToBase(units, currency, perBase) <= targetBaseMinor; i++) units++
  return units
}
