import { BUSINESS } from '@/lib/config'

export const metadata = { title: 'FAQ' }

export default function Page() {
  return (
    <div className="wrap prose">
      <h1>FAQ</h1>

      <h2>What am I buying?</h2>
      <p>
        A listing on the board with your title, description, icon and a link out to your site,
        plus a public count of the visitors we send you. Nothing else.
      </p>

      <h2>How is the order decided?</h2>
      <p>
        By money paid, highest first. There is no other input. See <a href="/rules">the rules</a>.
      </p>

      <h2>Do payments stack?</h2>
      <p>
        Yes. Paying again adds to your total rather than replacing it, so a listing at ₹500 needs
        ₹501 to pass a listing at ₹1,000.
      </p>

      <h2>What happens when someone pays more than me?</h2>
      <p>
        You move down. You keep the listing you bought, you just stop being first. That is not
        refundable and it is stated before you pay.
      </p>

      <h2>Will this help my search ranking?</h2>
      <p>
        No. Outbound links carry <code>rel=&quot;sponsored nofollow&quot;</code>, because a link
        bought for money is a paid link. Buy this for the traffic, not for SEO.
      </p>

      <h2>Why is the price shown in my currency but charged in rupees?</h2>
      <p>
        The ladder runs in one currency so it cannot be gamed by switching the dropdown. Other
        currencies are converted for display at a rate refreshed every six hours. The exact rupee
        amount is on the confirmation screen before you pay.
      </p>

      <h2>Can I edit or remove my listing?</h2>
      <p>Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> and we will do it by hand.</p>

      <h2>Can I get a refund?</h2>
      <p>In four situations, listed on the <a href="/refunds">refunds</a> page.</p>
    </div>
  )
}
