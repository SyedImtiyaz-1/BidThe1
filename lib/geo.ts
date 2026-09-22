import type { DisplayCurrency } from './config'

/**
 * Country to the currency that country actually spends.
 *
 * Only the fifteen the board can display. Everything not listed falls to USD,
 * which is the right default for "somewhere else" and is what the dropdown
 * would otherwise have to be used for on every visit.
 */
const BY_COUNTRY: Record<string, DisplayCurrency> = {
  IN: 'INR',
  US: 'USD',
  GB: 'GBP',
  AE: 'AED',
  SG: 'SGD',
  AU: 'AUD',
  CA: 'CAD',
  JP: 'JPY',
  BR: 'BRL',
  NG: 'NGN',
  PH: 'PHP',
  ZA: 'ZAR',
  CH: 'CHF',
  SE: 'SEK',
}

// The euro area. Listed out rather than inferred, because membership is a fact
// about treaties and not something to guess from a region code.
for (const c of [
  'AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT',
  'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES',
]) BY_COUNTRY[c] = 'EUR'

/** Currencies whose countries also use one of ours, near enough to be useful. */
Object.assign(BY_COUNTRY, {
  NZ: 'AUD',   // no NZD on the board; AUD is closer than USD
  MY: 'SGD',
  HK: 'USD',   // pegged
  SA: 'AED', QA: 'AED', KW: 'AED', BH: 'AED', OM: 'AED',
  NO: 'SEK', DK: 'SEK',
  LI: 'CHF',
})

export function currencyForCountry(country: string | null | undefined): DisplayCurrency | null {
  if (!country) return null
  return BY_COUNTRY[country.toUpperCase()] ?? null
}
