/**
 * PostHog, loaded after the page is interactive rather than bundled into it.
 *
 * posthog-js is about 200KB of the app's JavaScript, which is a third of
 * everything a first-time visitor downloads before the board is usable. None
 * of it is needed to read the board. A dynamic import puts it in its own chunk
 * that the browser fetches once it is idle, so the critical path carries the
 * product and not the measurement of it.
 *
 * Events raised before it arrives are queued here rather than dropped, which
 * matters because the first pageview fires immediately on mount.
 */
type Props = Record<string, unknown>
type PostHog = typeof import('posthog-js').default

let ph: PostHog | null = null
let loading = false
const queued: [string, Props | undefined][] = []

export async function initAnalytics(key: string, options: Props): Promise<void> {
  if (ph || loading) return
  loading = true
  try {
    const mod = await import('posthog-js')
    mod.default.init(key, options as never)
    ph = mod.default
    for (const [event, props] of queued.splice(0)) ph.capture(event, props)
  } catch {
    // Analytics is never allowed to break the page.
    loading = false
  }
}

export function capture(event: string, props?: Props): void {
  if (ph) ph.capture(event, props)
  else queued.push([event, props])
}
