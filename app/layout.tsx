import type { Metadata } from 'next'
import Script from 'next/script'
import { cookies } from 'next/headers'
import './globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Presence from '@/components/Presence'
import { SITE_NAME, SITE_DOMAIN, SITE_URL, SITE_TAGLINE, BUSINESS } from '@/lib/config'

const DESCRIPTION =
  'A public leaderboard where rank is bought. Pay to list your product, and the only way past you is someone paying more. Every listing shows the visitors it received and what they cost.'

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
    <html lang="en" data-theme={theme} suppressHydrationWarning>
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
