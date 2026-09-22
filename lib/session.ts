import { cookies } from 'next/headers'
import { BASE_CURRENCY, isDisplayCurrency, type DisplayCurrency } from './config'

/**
 * Read server-side so prices are correct in the first paint. A client-only
 * switcher shows the wrong currency for a frame on every navigation, which is
 * exactly the kind of detail that makes a site feel thrown together.
 */
export async function getDisplayCurrency(): Promise<DisplayCurrency> {
  const jar = await cookies()
  const c = jar.get('cur')?.value
  return isDisplayCurrency(c) ? c : (BASE_CURRENCY as DisplayCurrency)
}
