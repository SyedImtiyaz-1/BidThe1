/**
 * The ladder lives in exactly one currency. Everything else on the site is a
 * display conversion of these numbers. If this ever becomes two currencies,
 * the cheapest way to take #1 is to switch the dropdown to the weakest one.
 */
export const BASE_CURRENCY = 'INR'

/** Smallest unit of the base currency. Paise for INR, cents for USD. */
export const BASE_MINOR_DIGITS = 2

/** One rung. The client's rule: beat ₹1,000 with ₹1,001. */
export const STEP_MINOR = 100

/**
 * Floor for any single payment. topapp.lol used a $1 floor and ended up with
 * 23 dead listings tied at the bottom of the board, so this is deliberately
 * not ₹1.
 */
export const MIN_PAYMENT_MINOR = 9900

/** What a brand new listing must pay to appear at all. */
export const MIN_FIRST_PAYMENT_MINOR = 9900

/** Ceiling on a single payment, so a typo cannot become a five-crore charge. */
export const MAX_PAYMENT_MINOR = 50_000_000

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'coolapp'
export const SITE_DOMAIN = `${SITE_NAME}.lol`

/** Absolute origin, needed for canonicals, Open Graph and the sitemap. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')

export const SITE_TAGLINE = 'The board is sorted by money. Nothing else.'

/**
 * One source of truth for the details that have to appear in the footer, the
 * imprint, the terms and the grievance route. Indian IT Rules 2021 Rule 3(2)
 * requires a named contact and a stated response clock; the e-commerce rules
 * require the provider's identity and address.
 */
export const BUSINESS = {
  /** Still needed: the name exactly as registered, and the GSTIN once issued. */
  legalName: 'Syed Imtiyaz [surname as registered]',
  owner: 'ImtiyazSDE',
  address: 'Bhande Plot, Umred Road, Plot No. 50, Nagpur 440024, Maharashtra, India',
  email: 'contact@coolapp.lol',
  x: 'coolappdotdev',
  gstin: '',
} as const

export const CATEGORIES = [
  { slug: 'all', label: 'All' },
  { slug: 'ai', label: 'AI' },
  { slug: 'developer', label: 'Developer' },
  { slug: 'marketing', label: 'Marketing' },
  { slug: 'design', label: 'Design' },
  { slug: 'productivity', label: 'Productivity' },
  { slug: 'finance', label: 'Finance' },
  { slug: 'apps', label: 'Apps' },
  { slug: 'other', label: 'Other' },
] as const

export const PICKABLE_CATEGORIES = CATEGORIES.filter((c) => c.slug !== 'all')

/**
 * Display currencies. Charging always happens in BASE_CURRENCY and the UI says
 * so, because a converted price that differs from the amount actually debited
 * is drip pricing under the CCPA dark-pattern guidelines.
 */
export const DISPLAY_CURRENCIES = [
  'INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD',
  'CAD', 'JPY', 'BRL', 'NGN', 'PHP', 'ZAR', 'CHF', 'SEK',
] as const

export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number]

export function isDisplayCurrency(v: string | undefined): v is DisplayCurrency {
  return !!v && (DISPLAY_CURRENCIES as readonly string[]).includes(v)
}
