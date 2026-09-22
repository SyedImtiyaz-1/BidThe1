export const metadata = { title: 'Refunds' }

export default function Page() {
  return (
    <div className="wrap prose">
      <h1>Refunds</h1>
      <p className="lead">
        Payments are final, with four exceptions that we honour without argument.
      </p>

      <h2>We refund</h2>
      <ol>
        <li>The listing failed to publish after a successful payment.</li>
        <li>You were charged more than once for the same payment.</li>
        <li>You were charged an amount other than the one shown on the confirmation screen.</li>
        <li>We removed your listing for a reason that was not a breach of the terms.</li>
      </ol>
      <p>Refunds are made to the original payment method within seven working days.</p>

      <h2>We do not refund</h2>
      <p>
        Being passed by someone who paid more. That is the mechanic, it is stated before you
        pay, and you keep the listing you bought. We also do not refund listings removed for
        breaching the terms.
      </p>

      <p>
        A blanket &quot;all sales final&quot; clause would not be worth much here. Indian
        consumer law does not enforce it and card network rules override it, so the list above
        is what we actually do.
      </p>
    </div>
  )
}
