import { cookies, headers } from 'next/headers'
import { isDisplayCurrency, type DisplayCurrency } from './config'
import { currencyForCountry } from './geo'

/**
 * The currency to price the page in.
 *
 * Three steps, in order:
 *
 *  1. The cookie, which only exists because somebody used the dropdown. An
 *     explicit choice outranks anything we can infer, and it has to survive
 *     the visitor travelling.
 *  2. The country the request came from. Vercel resolves the IP at the edge
 *     and hands it over as `x-vercel-ip-country`, so this costs nothing and
 *     no IP is ever stored.
 *  3. USD. Somebody arriving from an unmapped country is not in India, and a
 *     board priced in rupees is a board they have to convert in their head.
 *
 * Read server-side so prices are right in the first paint; a client-side
 * guess shows the wrong currency for a frame on every navigation.
 */
export async function getDisplayCurrency(): Promise<DisplayCurrency> {
  const jar = await cookies()
  const chosen = jar.get('cur')?.value
  if (isDisplayCurrency(chosen)) return chosen

  const h = await headers()
  const guess = currencyForCountry(
    h.get('x-vercel-ip-country') ?? h.get('cf-ipcountry') ?? null,
  )
  return guess ?? 'USD'
}
