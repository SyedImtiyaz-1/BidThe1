import Link from 'next/link'
import { SITE_DOMAIN, BUSINESS } from '@/lib/config'

const LINKS = [
  ['/rules', 'Rules'],
  ['/faq', 'FAQ'],
  ['/terms', 'Terms'],
  ['/privacy', 'Privacy'],
  ['/imprint', 'Imprint'],
  ['/stats', 'Live stats'],
] as const

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-links">
          {LINKS.map(([href, label], i) => (
            <span key={href} style={{ display: 'inline-flex' }}>
              {i > 0 && <span className="sep">·</span>}
              <Link href={href}>{label}</Link>
            </span>
          ))}
        </div>
        <p>
          {SITE_DOMAIN} sells advertising placement. Every listing is a paid advertisement and
          position is determined only by the amount paid.
        </p>
        {/* The registered address lives on the imprint, which is linked above
            from every page. That keeps the provider's details one click away,
            which is what the e-commerce and IT rules ask for, without putting a
            home address on every screen. */}
        <p>
          <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> ·{' '}
          <a href={`https://x.com/${BUSINESS.x}`} rel="noopener">@{BUSINESS.x}</a>
        </p>
        <p>
          Complaints acknowledged within 24 hours and resolved within 7 days.
        </p>
      </div>
    </footer>
  )
}
