import Link from 'next/link'
import Image from 'next/image'
import { SITE_NAME, SITE_DOMAIN, SITE_TAGLINE, BUSINESS } from '@/lib/config'
import { Mail, XLogo } from './icons'

const COLS: { title: string; links: [string, string][] }[] = [
  {
    title: 'Board',
    links: [
      ['/', 'Leaderboard'],
      ['/?scope=today', 'Today'],
      ['/categories', 'Categories'],
      ['/daily', 'Daily archive'],
      ['/stats', 'Live stats'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['/about', 'About'],
      ['/rules', 'Rules'],
      ['/faq', 'FAQ'],
      ['/report', 'Report a listing'],
      ['/imprint', 'Imprint'],
    ],
  },
  {
    title: 'Legal',
    links: [
      ['/terms', 'Terms'],
      ['/privacy', 'Privacy'],
      ['/refunds', 'Refunds'],
    ],
  },
]

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot-grid">
        <div className="foot-brand">
          <Link href="/" className="wordmark">
            <Image src="/logo.png" alt="" width={24} height={24} className="mark" />
            {SITE_NAME}<span className="dotlol">.lol</span>
          </Link>
          <p>{SITE_TAGLINE}</p>
          <p className="foot-contact">
            <a href={`mailto:${BUSINESS.email}`}><Mail size={15} /> {BUSINESS.email}</a>
            <a href={`https://x.com/${BUSINESS.x}`} rel="noopener"><XLogo size={14} /> @{BUSINESS.x}</a>
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title} className="foot-col">
            <h4>{c.title}</h4>
            {c.links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          </div>
        ))}
      </div>
      {/* The provider's registered address is on the imprint, one click away
          from every page, which is what the e-commerce and IT rules ask for. */}
      <div className="wrap foot-bar">
        <span className="grow">Every listing is a paid advertisement, sorted by amount paid and nothing else.</span>
        <span>Complaints acknowledged within 24 hours, resolved within 7 days.</span>
        <span>© {new Date().getUTCFullYear()} {SITE_DOMAIN}</span>
      </div>
    </footer>
  )
}
