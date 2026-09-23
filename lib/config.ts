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
 * Floor for any single payment.
 *
 * A dollar keeps the entry price as low as it can go, which is the point. The
 * processor's fixed fee eats most of a one dollar payment, so the floor is a
 * way in rather than a source of margin; the money is in the listings that
 * climb past it.
 */
export const MIN_PAYMENT_MINOR = 100

/** What a brand new listing must pay to appear at all. */
export const MIN_FIRST_PAYMENT_MINOR = 100

/** Ceiling on a single payment, so a typo cannot become a $500,000 charge. */
export const MAX_PAYMENT_MINOR = 5_000_000

/**
 * The whole brand, in one place.
 *
 * The domain is the source of truth and the name is read out of it, rather
 * than the name being the source and the suffix hardcoded next to it. The
 * suffix was written into three separate files, so a rename meant editing
 * code; now it is one environment variable.
 */
export const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'bidthe1.com'

/** bidthe1.com -> bidthe1 */
export const SITE_NAME = SITE_DOMAIN.slice(0, SITE_DOMAIN.lastIndexOf('.')) || SITE_DOMAIN

/** bidthe1.com -> .com, shown in the accent colour beside the name */
export const SITE_TLD = SITE_DOMAIN.slice(SITE_DOMAIN.lastIndexOf('.'))

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
  /**
   * Sole proprietor, not GST registered. The payment processor is the merchant
   * of record, so it is the seller on the buyer's invoice and it collects and
   * remits the tax. Set gstin here if that changes and the imprint will show
   * it; the page already omits the line when it is empty.
   */
  legalName: 'Syed Imtiyaz Ali',
  owner: 'ImtiyazSDE',
  address: 'Bhande Plot, Umred Road, Plot No. 50, Nagpur 440024, Maharashtra, India',
  email: `contact@${SITE_DOMAIN}`,
  x: process.env.NEXT_PUBLIC_SITE_X || 'bidthe1',
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
  { slug: 'people', label: 'People' },
] as const

export const PICKABLE_CATEGORIES = CATEGORIES.filter((c) => c.slug !== 'all')
