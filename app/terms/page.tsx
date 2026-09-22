import { BUSINESS } from '@/lib/config'

export const metadata = { title: 'Terms' }

export default function Page() {
  return (
    <div className="wrap prose">
      <h1>Terms</h1>
      <p className="lead">
        These are working terms. Have a lawyer read them before you take money from strangers.
      </p>

      <h2>What is being sold</h2>
      <p>
        We sell advertising placement on our own website, on a principal basis. We are not an
        agent, broker or intermediary between you and anyone who reads the board, and we do not
        arrange or facilitate any transaction between a listed business and a visitor.
      </p>

      <h2>Placement</h2>
      <p>
        Payment buys a listing at the position that the amount paid earns at the moment the
        payment is confirmed, under the rules on the{' '}
        <a href="/how-ranking-works">how ranking works</a> page. Position is not guaranteed for
        any period. Anyone may pay more and take a higher position at any time.
      </p>

      <h2>Your listing</h2>
      <p>
        You confirm you have the right to advertise the product you submit and to use the name
        and imagery shown. We may remove any listing that is illegal, deceptive, harmful,
        impersonates another product, or that we are asked to remove by a rights holder.
        Removal for a breach of these terms is not refunded.
      </p>

      <h2>No endorsement</h2>
      <p>
        Nothing on this board is a recommendation. Ranking reflects payment and nothing else.
      </p>

      <h2>Liability</h2>
      <p>
        The service is provided as is. We do not promise any number of visitors, clicks,
        installs or sales. Our total liability for any claim is limited to the amount you paid
        us in the preceding thirty days.
      </p>

      <h2>Contact</h2>
      <p>
        {BUSINESS.legalName}, {BUSINESS.address}. Grievance officer {BUSINESS.legalName},{' '}
        <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.
      </p>
    </div>
  )
}
