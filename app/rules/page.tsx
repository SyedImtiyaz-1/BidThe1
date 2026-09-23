import { SITE_DOMAIN, MIN_FIRST_PAYMENT_MINOR, MIN_PAYMENT_MINOR, STEP_MINOR, BUSINESS } from '@/lib/config'
import { formatMoney } from '@/lib/money'

export const metadata = { title: 'Rules' }

export default function Page() {
  const first = formatMoney(MIN_FIRST_PAYMENT_MINOR)
  const min = formatMoney(MIN_PAYMENT_MINOR)
  const step = formatMoney(STEP_MINOR)

  return (
    <div className="wrap prose">
      <h1>Rules</h1>
      <p className="lead">
        {SITE_DOMAIN} is a public leaderboard. No ads, no API keys, no revenue share. You pay to
        stand above everyone else. Rank is what you pay and nothing else.
      </p>

      <h2>The boards</h2>
      <p>
        One payment ranks you on every board that covers it. The boards are the same ledger read
        through different windows of time.
      </p>
      <ul>
        <li>
          <strong>All-time</strong> is the main board. Rank is everything that listing has ever
          paid. It never expires and never resets.
        </li>
        <li>
          <strong>Today</strong> is the current UTC day, midnight to midnight. Rank is what you
          spent since 00:00 UTC. It starts again when the next UTC day begins.
        </li>
        <li>
          <strong>Daily</strong> is the archive of every past UTC day. The current day stays live
          until it closes, then freezes. A closed day never changes.
        </li>
      </ul>

      <h2>How ranking works</h2>
      <ol>
        <li>
          Listings are ordered by money paid, highest first. There is no other input: no clicks,
          no votes, no quality score, no editorial judgement.
        </li>
        <li>
          A new listing starts at {first} minimum. Payments move in {step} steps.
        </li>
        <li>
          Payments accumulate. Paying again adds to your total rather than replacing it, and
          checkout charges only the difference. A listing at $500 needs $501 to pass a listing at
          $1,000, not $1,001.
        </li>
        <li>
          To pass a listing you must exceed its total. Equal totals keep the order they were
          reached in, so the older listing stays ahead.
        </li>
        <li>
          Paying less than the top still puts you on the board, at whatever rank that amount
          buys. Every top-up is at least {min}.
        </li>
        <li>
          Anyone can pay more than you at any time and take your position. You keep the listing
          you paid for, you just stop being first.
        </li>
      </ol>

      <h2>What you can list</h2>
      <ul>
        <li>
          A product website, an App Store or Play Store listing, or a profile: X, LinkedIn,
          Instagram, Threads, TikTok, YouTube, GitHub or Substack. A handle is worth a rank
          the same way a product is.
        </li>
        <li>
          App Store, Play Store, GitHub and similar platform links are keyed by their path, so
          two apps on the same platform never share a listing.
        </li>
        <li>
          Query strings are stripped. Affiliate, referral and tracking URLs will not survive.
        </li>
        <li>
          No chat or invite links: Telegram, WhatsApp, Discord, Messenger, Signal and the like.
          This is for products and profiles, not group chats.
        </li>
        <li>No adult content, no malware, no illegal goods, no impersonating another product.</li>
      </ul>

      <h2>Categories</h2>
      <p>
        A listing sits in exactly one category and each category has its own board. Pick the
        category when you submit. If yours ends up in the wrong one, email{' '}
        <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> and we will move it.
      </p>

      <h2>Currency</h2>
      <p>
        Every price on this site is in US dollars: what is displayed, what ranks and what you
        are charged are one number. The exact
        amount shown on the confirmation screen before you pay.
      </p>

      <h2>After you pay</h2>
      <ul>
        <li>
          Your listing is public. Clicks go to the URL or profile you submitted, with query
          parameters removed and <code>rel=&quot;sponsored nofollow&quot;</code> on the link.
        </li>
        <li>A completed payment is what claims the rank. Being passed later is not refunded.</li>
        <li>
          Refunds are issued in four specific situations, listed on the{' '}
          <a href="/refunds">refunds</a> page.
        </li>
        <li>
          Paying means you agree to the <a href="/terms">terms</a> and the{' '}
          <a href="/privacy">privacy policy</a>.
        </li>
      </ul>
    </div>
  )
}
