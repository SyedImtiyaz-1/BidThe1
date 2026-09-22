/**
 * One currency, everywhere. Prices display in dollars, rank in dollars and are
 * charged in dollars, so the number on screen is the number that ranks.
 */
export const BASE_CURRENCY = 'USD'

/** Smallest unit of the base currency. Cents. */
export const BASE_MINOR_DIGITS = 2

/** One rung. Beat $1,000 with $1,001. */
export const STEP_MINOR = 100

/**
 * Floor for any single payment. Not $1: the processor takes a percentage plus
 * a fixed fee, and on a dollar the fee is most of the dollar. topapp.lol used
 * a $1 floor and collected 23 dead listings tied at the bottom of the board.
 */
export const MIN_PAYMENT_MINOR = 500

/** What a brand new listing must pay to appear at all. */
export const MIN_FIRST_PAYMENT_MINOR = 500

/** Ceiling on a single payment, so a typo cannot become a $500,000 charge. */
export const MAX_PAYMENT_MINOR = 5_000_000

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
  /** Still needed: the GSTIN once issued. */
  legalName: 'Syed Imtiyaz Ali',
  owner: 'ImtiyazSDE',
  address: 'Bhande Plot, Umred Road, Plot No. 50, Nagpur 440024, Maharashtra, India',
  email: 'contact@coolapp.lol',
  x: 'coolappdotlol',
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
] as const

export const PICKABLE_CATEGORIES = CATEGORIES.filter((c) => c.slug !== 'all')
