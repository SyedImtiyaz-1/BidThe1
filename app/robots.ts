import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /go/ is the paid outbound redirect and must never be crawled or
        // indexed: it would leak link equity to advertisers and fill the index
        // with redirect URLs. The API surface has nothing to index either.
        disallow: ['/api/', '/go/', '/icon/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
