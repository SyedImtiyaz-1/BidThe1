import { BUSINESS, SITE_DOMAIN } from '@/lib/config'

export const metadata = {
  title: 'Ask',
  description: `Ask anything about ${SITE_DOMAIN}: how ranking works, what a rank costs, refunds, and how to claim a spot.`,
}

/**
 * The AskMySite widget, on its own page.
 *
 * It is a third-party iframe 640px tall, so it lives here rather than on the
 * board, where it would load for every visitor and spend the speed the board
 * was tuned for. It is one click away from every page instead.
 */
export default function Page() {
  return (
    <div className="wrap prose" style={{ maxWidth: 860 }}>
      <h1>Ask</h1>
      <p className="lead">
        Ranks, prices, refunds, how to claim a spot. The answers come from this site&rsquo;s own pages.
      </p>
      <iframe
        className="ask-frame"
        src="https://askmysite.ai/widget/96989ffa-38e7-47ef-bb54-5426ea27efaf?origin=https%3A%2F%2Fcoolapp.lol"
        title={`Ask ${SITE_DOMAIN}`}
        width="100%"
        height="640"
        loading="lazy"
        allow="microphone; clipboard-write"
      />
      <p className="ask-note">
        Runs on AskMySite. For anything it cannot answer,{' '}
        <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.
      </p>
    </div>
  )
}
