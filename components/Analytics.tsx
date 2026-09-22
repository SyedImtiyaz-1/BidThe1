'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

/**
 * PostHog, behind a first-party path and off by default.
 *
 * Nothing loads without NEXT_PUBLIC_POSTHOG_KEY, so a fork or a preview build
 * sends no traffic anywhere and costs no bytes.
 *
 * Requests go to /ingest rather than to posthog.com. That is a rewrite in
 * next.config, and it exists because content blockers drop the vendor domain
 * outright; a first-party path is the difference between counting most of your
 * visitors and counting the ones without an ad blocker.
 */
export default function Analytics() {
  const pathname = usePathname()
  const params = useSearchParams()

  useEffect(() => {
    if (!KEY || posthog.__loaded) return
    posthog.init(KEY, {
      api_host: '/ingest',
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
      // The App Router changes route without a page load, so PostHog's own
      // pageview trigger would fire once and never again.
      capture_pageview: false,
      capture_pageleave: true,
      // Off deliberately. Recording someone typing a price into the hero is a
      // lot of data about a person for a number we already store as a payment.
      disable_session_recording: true,
      persistence: 'localStorage+cookie',
      // The privacy page promises this, so it has to be set.
      respect_dnt: true,
      defaults: '2025-05-24',
    })
  }, [])

  useEffect(() => {
    if (!KEY) return
    // No __loaded guard. init() above runs in an earlier effect of the same
    // commit but finishes resolving remote config later, and gating on that
    // flag dropped the first pageview and never retried it, because the
    // dependencies had not changed. posthog buffers calls made before it is
    // ready, so calling straight through is both simpler and correct.
    const qs = params?.toString()
    posthog.capture('$pageview', { $current_url: window.location.href, path: pathname, query: qs || undefined })
  }, [pathname, params])

  return null
}
