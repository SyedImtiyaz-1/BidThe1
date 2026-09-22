import { BASE_CURRENCY } from './config'

/**
 * One currency, so there is no conversion anywhere in this file.
 *
 * The site used to display fifteen currencies over a rupee ladder, which meant
 * every price existed twice: the number on screen and the number that ranked.
 * Keeping those two honest is where the hard bugs lived. Now they are the same
 * number.
 */

/** Cents in a dollar. Asked of Intl rather than assumed, so JPY or KWD would work. */
export function unitMinor(): number {
  try {
    const d = new Intl.NumberFormat('en', { style: 'currency', currency: BASE_CURRENCY })
      .resolvedOptions().minimumFractionDigits ?? 2
    return 10 ** d
  } catch {
    return 100
  }
}

export type MoneyParts = { symbol: string; amount: string }

/**
 * Symbol and digits split apart so they can be styled separately.
 *
 * Decimals are off by default: the ladder steps in whole dollars, so `.00` down
 * a column of fifty rows is noise. The checkout dialog turns them back on,
 * because that is where an exact charge is stated.
 */
export function moneyParts(minor: number, opts: { decimals?: boolean } = {}): MoneyParts {
  const digits = Math.log10(unitMinor())
  const fraction = opts.decimals ? digits : 0
  const parts = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: BASE_CURRENCY,
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  }).formatToParts(minor / unitMinor())

  let symbol = ''
  let amount = ''
  for (const p of parts) {
    if (p.type === 'currency') symbol += p.value
    else if (p.type === 'literal') continue
    else amount += p.value
  }
  return { symbol: symbol || BASE_CURRENCY, amount }
}

export function formatMoney(minor: number, opts?: { decimals?: boolean }): string {
  const { symbol, amount } = moneyParts(minor, opts)
  return `${symbol}${amount}`
}

/** The whole-dollar number the board prints for an amount. */
export function displayUnits(minor: number): number {
  return Math.round(minor / unitMinor())
}

/** Whole dollars to minor units. */
export function unitsToBase(units: number): number {
  return Math.round(units * unitMinor())
}

/**
 * The cheapest whole-dollar amount that passes `targetMinor`.
 *
 * Ties lose on this board, so passing someone means exceeding what they hold,
 * not matching it: $433 is beaten by $434. Totals only ever move in whole
 * dollars, so one above the printed number is exactly one step.
 */
export function unitsToBeat(targetMinor: number, minMinor = 0): number {
  return Math.max(
    1,
    Math.ceil(minMinor / unitMinor()),
    targetMinor > 0 ? displayUnits(targetMinor) + 1 : 0,
  )
}
