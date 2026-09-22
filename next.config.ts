import type { NextConfig } from 'next'

const config: NextConfig = {
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
}

export default config
