import { SITE_DOMAIN, BUSINESS } from '@/lib/config'

export const metadata = { title: 'Imprint' }

export default function Page() {
  return (
    <div className="wrap prose">
      <h1>Imprint</h1>
      <p className="lead">Who runs {SITE_DOMAIN} and how to reach a person.</p>

      <h2>Service provider</h2>
      <p>
        {BUSINESS.legalName}<br />
        {BUSINESS.address}
        {BUSINESS.gstin && <><br />GSTIN {BUSINESS.gstin}</>}
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a><br />
        <a href={`https://x.com/${BUSINESS.x}`} rel="noopener">@{BUSINESS.x}</a> on X
      </p>

      <h2>Grievance officer</h2>
      <p>
        {BUSINESS.legalName}, <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>. We
        acknowledge complaints within 24 hours and resolve them within 7 days, inside the
        fifteen the Information Technology Rules 2021 allow. To report a listing, see{' '}
        <a href="/report">report a listing</a>.
      </p>

      <h2>What is sold here</h2>
      <p>
        Advertising placement on this website, sold on a principal basis. We are not an agent,
        broker or intermediary between advertisers and readers, and we do not take or forward
        money on anyone else&rsquo;s behalf.
      </p>
    </div>
  )
}
