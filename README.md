# coolapp.lol

A paid leaderboard. Anyone pastes a link, pays, and appears at the rank their money buys.
The only way past someone is to pay more than they did.

Modelled on outbid.lol and topapp.lol, with two things they do not have: a product page per
listing carrying its standing on every board, and a daily board alongside the all-time one.

## Run it

```bash
pnpm install
pnpm dev
```

That is the whole setup. With no `DATABASE_URL` the app runs Postgres compiled to WASM out of
`./.pgdata`, so there is nothing to install and nothing to provision. Point `DATABASE_URL` at
Supabase or Neon when you want the real thing. The board starts empty and fills only with paid
listings; there is no demo data and no seed route.

With no Dodo keys the checkout uses a local stand-in that applies the payment directly, so the
full loop is testable before any account is approved. It switches itself off as soon as
`DODO_API_KEY` and `DODO_PRODUCT_ID` exist.

## Configuration

Copy `.env.example` to `.env.local`. Every value is optional in development.

| Variable | What it does |
| --- | --- |
| `DATABASE_URL` | Any Postgres. Unset means the embedded one. On Supabase use the pooler on port 6543, not the direct host, which is IPv6 only. |
| `DODO_API_KEY` / `DODO_PRODUCT_ID` | Switches checkout from the stand-in to real. |
| `DODO_WEBHOOK_SECRET` | Required for the webhook to credit anything. |
| `DODO_MODE` | `test` or `live`. Picks the API base URL. |
| `HASH_SALT` | Salts visitor hashes. Any random string. |

## How the money works

One currency, everywhere. Amounts are integer cents in `amount_minor`, the step between
positions is $1 and the minimum payment is $5. What is displayed, what ranks and what is
charged are the same number, so there is no conversion layer to keep honest.

Rank is never stored. It is `row_number() over (order by total_minor desc, first_reached_at asc)`
computed on read, which is why two people paying in the same second cannot collide: there is no
rank column to lock, and the totals decide the order.

Payments are applied by a single data-modifying CTE with `on conflict do nothing` against a
unique index on `(provider, provider_ref)`. That one statement gives atomicity and webhook
idempotency together, so a retried delivery credits nothing twice.

The webhook is the normal path but not the only one. When a buyer lands back on
`/?claimed=<slug>` the page asks Dodo directly about that payment (by `payment_id` when the
redirect carries it, otherwise by scanning recent payments tagged with the listing) and
credits it through the same `applyPayment` statement. A late, rejected or missing webhook is
then a delay rather than a buyer standing on a board that ignores them, and the unique index
means the webhook landing afterwards credits nothing twice. Dodo's API is the source of truth
in both paths; nothing in the query string moves money.

The ledger credits the amount carried in the checkout's `metadata`, never the total Dodo
reports back. Dodo is a merchant of record and may settle in another currency, in which case
its reported total is in that currency's minor unit rather than in cents.

## Before taking real money

- [ ] Dodo Payments account approved, and a one-time product created with Pay What You Want
      enabled. Put its id in `DODO_PRODUCT_ID`. The server sets the amount on every checkout,
      so the buyer never picks their own price.
- [ ] Webhook endpoint registered at `/api/webhooks/dodo` **on the primary host** with the
      signing secret in `DODO_WEBHOOK_SECRET`. Vercel serves one domain and 308-redirects the
      others (today `coolapp.lol` redirects to `www.coolapp.lol`), and webhook senders do not
      follow redirects, so an endpoint on the wrong host fails every delivery with a 308 that
      looks like a success from the dashboard's "sent" column. Check with an unsigned POST:
      the right host answers `400`, the wrong one `308`. The secret is per endpoint and lives in Dodo, so copy it from
      there (`GET /webhooks/{id}/secret`, or the dashboard); a made-up value means every
      delivery is answered `400 bad signature` and nothing is ever credited. Subscribe to
      `payment.succeeded`, the refund events and the dispute events. Without the refund and
      dispute events a charged-back listing keeps a rank it no longer paid for.
- [ ] Describe the business as advertising placement, which is what it is. Keep auction
      vocabulary out of the product and the merchant application.
- [ ] Vercel Pro. Hobby's terms prohibit "any method of requesting or processing payment from
      visitors", and Hobby also caps cron at once per day.
- [ ] A real Postgres in `DATABASE_URL`. Supabase and Neon both work.
- [ ] Fill the placeholders in `app/terms`, `app/refunds`, `components/Footer.tsx`: legal name,
      address, GSTIN, grievance officer. Payment providers ask for these pages during review,
      and the disclosure duties are real regardless, so this is a gating dependency rather
      than polish.
- [ ] Confirm Dodo will settle this merchant in USD. `billing_currency` is USD, and an
      account only approved for INR will reject every checkout.
- [ ] An empty board is the honest one. Every listing on it was paid for; the empty state
      sells the first spot at the minimum rather than showing invented rivals.

## Layout

```
app/
  page.tsx                     the board
  api/claim                    resolve a URL, create or find a listing, price it, open an order
  api/pay/mock                 local stand-in, disabled once Dodo keys exist
  api/webhooks/dodo            the only thing that credits money
  api/presence                 heartbeat behind the live counters
  go/[slug]                    outbound redirect, counts the click in after()
  icon/[slug]                  favicon proxy so the board does not hotlink
lib/
  config.ts                    base currency, step, floors, categories
  rank.ts                      board queries and the price-to-lead formula
  money.ts                     minor units, formatting, asymmetric rounding
  payments.ts                  the apply CTE, checkout creation, webhook verification
  meta.ts                      URL to title, tagline and icon
```
