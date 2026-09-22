import Link from 'next/link'
import Image from 'next/image'
import type { ComponentType } from 'react'
import { SITE_NAME, SITE_DOMAIN, SITE_TAGLINE, BUSINESS } from '@/lib/config'
import {
  Mail, XLogo, Trophy, Clock, Grid, Calendar, BarChart, Info, Scale, HelpCircle, Flag, Building,
  FileText, Shield, RotateCcw,
} from './icons'

type Mark = ComponentType<{ size?: number }>
const COLS: { title: string; links: [string, string, Mark][] }[] = [
  {
    title: 'Board',
    links: [
      ['/', 'Leaderboard', Trophy],
      ['/?scope=today', 'Today', Clock],
      ['/categories', 'Categories', Grid],
      ['/daily', 'Daily archive', Calendar],
      ['/stats', 'Live stats', BarChart],
    ],
  },
  {
    title: 'Company',
    links: [
      ['/about', 'About', Info],
      ['/rules', 'Rules', Scale],
      ['/faq', 'FAQ', HelpCircle],
      ['/report', 'Report a listing', Flag],
      ['/imprint', 'Imprint', Building],
    ],
  },
  {
    title: 'Legal',
    links: [
      ['/terms', 'Terms', FileText],
      ['/privacy', 'Privacy', Shield],
      ['/refunds', 'Refunds', RotateCcw],
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
            {c.links.map(([href, label, Mark]) => (
              <Link key={href} href={href}><Mark size={14} /> {label}</Link>
            ))}
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
