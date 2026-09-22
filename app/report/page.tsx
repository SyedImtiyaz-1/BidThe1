import { BUSINESS } from '@/lib/config'

export const metadata = { title: 'Report a listing' }

export default function Page() {
  return (
    <div className="wrap prose">
      <h1>Report a listing</h1>
      <p className="lead">
        Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> with the listing name and
        what is wrong with it.
      </p>
      <p>
        We acknowledge within 24 hours and resolve within 15 days. Illegal content, malware and
        impersonation are removed first and discussed afterwards. Trademark and copyright
        complaints go to the same address and are handled the same way.
      </p>
      <p>Grievance officer: {BUSINESS.owner}, {BUSINESS.email}.</p>
    </div>
  )
}
