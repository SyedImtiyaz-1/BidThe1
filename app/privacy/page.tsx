import { BUSINESS } from '@/lib/config'

export const metadata = { title: 'Privacy' }

export default function Page() {
  return (
    <div className="wrap prose">
      <h1>Privacy</h1>
      <p className="lead">
        No accounts, no tracking pixels, no advertising networks. Here is everything we store.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>The listing you submit: URL, title, description, icon and category. All public.</li>
        <li>Payments: amount, currency, time and the payment reference from our processor.</li>
        <li>
          A salted hash of your IP address and browser, used to count a click once per listing
          per hour and to count visitors. We do not store raw IP addresses and the hash cannot be
          reversed to one.
        </li>
        <li>Two cookies that hold nothing but your chosen currency and light or dark theme.</li>
      </ul>

      <h2>What we do not store</h2>
      <p>
        No names, no passwords, no card details. Payment details go to our payment processor and
        never reach this site.
      </p>

      <h2>Who else sees it</h2>
      <p>
        Our payment processor, which acts as merchant of record and needs your billing details to
        charge you and to handle tax. Our database and hosting providers, which store the data
        above on our behalf. Nobody else, and we do not sell anything to anyone.
      </p>

      <h2>Deletion</h2>
      <p>
        Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> and we will remove your
        listing. Payment records are kept as long as tax law requires.
      </p>
    </div>
  )
}
