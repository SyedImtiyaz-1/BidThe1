import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Suspense } from 'react'
import Analytics from '@/components/Analytics'
import { Poppins } from 'next/font/google'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID
import { cookies } from 'next/headers'
import './globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Presence from '@/components/Presence'
import { SITE_NAME, SITE_DOMAIN, SITE_URL, SITE_TAGLINE, BUSINESS } from '@/lib/config'

const DESCRIPTION =
  'A public leaderboard where rank is bought. Pay to list your product, and the only way past you is someone paying more. Every listing shows the visitors it received and what they cost.'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--font-display',
})

/**
 * Pinch zoom is off, as asked. Two caveats worth knowing: iOS Safari has
 * ignored user-scalable since iOS 10, so this binds on Android and not on
 * iPhone, and blocking zoom costs anyone who needs to enlarge text.
 *
 * The jarring zoom most people mean by this is a different thing: iOS zooms
 * the page whenever a focused input is under 16px. That is fixed by sizing the
 * controls properly, below, and that fix works on every platform.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  // Everything relative below resolves against this, including the OG image.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_DOMAIN} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_DOMAIN}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_DOMAIN,
  keywords: [
    'paid leaderboard', 'product directory', 'pay to rank', 'startup directory',
    'launch your product', 'indie products', 'advertising placement',
  ],
  authors: [{ name: BUSINESS.owner, url: `https://x.com/${BUSINESS.x}` }],
  creator: BUSINESS.owner,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_DOMAIN,
    title: `${SITE_DOMAIN} — ${SITE_TAGLINE}`,
    description: DESCRIPTION,
    url: '/',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_DOMAIN} — ${SITE_TAGLINE}`,
    description: DESCRIPTION,
    creator: `@${BUSINESS.x}`,
    site: `@${BUSINESS.x}`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  category: 'business',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies()
  const theme = jar.get('theme')?.value === 'dark' ? 'dark' : 'light'

  /**
   * Structured data. A leaderboard is literally an ItemList, which is what
   * gets a ranked result treated as one thing rather than a wall of links.
   */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_DOMAIN,
        description: DESCRIPTION,
        inLanguage: 'en',
        publisher: { '@id': `${SITE_URL}/#org` },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#org`,
        name: SITE_DOMAIN,
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        email: BUSINESS.email,
        sameAs: [`https://x.com/${BUSINESS.x}`],
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Nagpur',
          addressRegion: 'Maharashtra',
          postalCode: '440024',
          addressCountry: 'IN',
        },
      },
    ],
  }

  return (
    <html lang="en" data-theme={theme} className={poppins.variable} suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint, so the page does not
            flash light and then correct itself. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Nav />
        <main>{children}</main>
        {/* useSearchParams needs a boundary or the whole page opts out of
            static rendering. */}
        <Suspense fallback={null}><Analytics /></Suspense>
        {/* Google Analytics. afterInteractive rather than lazyOnload: gtag has
            to be in place early enough to attribute the landing page, which is
            the one pageview that says where a visitor came from. Nothing loads
            without the measurement id. */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        )}

        {/* The AskMySite chat bubble. lazyOnload: it fetches after the page is
            idle, so a third-party script never sits between a visitor and the
            board, which is what the speed work was for. */}
        <Script
          src="https://askmysite.ai/widget.js"
          data-tenant-id="96989ffa-38e7-47ef-bb54-5426ea27efaf"
          strategy="lazyOnload"
        />
        <Footer />
        <Presence />
      </body>
    </html>
  )
}
