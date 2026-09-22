import type { NextConfig } from 'next'

/**
 * PostHog is proxied under /ingest so requests are first party. Content
 * blockers drop the vendor domain on sight, and an analytics tool that only
 * counts people without a blocker is worse than none: it is wrong in a
 * direction you cannot see. Region comes from the host variable, so an EU
 * project needs no code change.
 */
const PH = (process.env.NEXT_PUBLIC_POSTHOG_HOST || '').includes('eu') ? 'eu' : 'us'

const config: NextConfig = {
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },

  // PostHog's API is sensitive to a trailing slash being added by a redirect.
  skipTrailingSlashRedirect: true,

  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: `https://${PH}-assets.i.posthog.com/static/:path*` },
      { source: '/ingest/:path*', destination: `https://${PH}.i.posthog.com/:path*` },
    ]
  },
}

export default config
