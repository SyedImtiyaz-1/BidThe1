import type { MetadataRoute } from 'next'
import { SITE_URL, PICKABLE_CATEGORIES } from '@/lib/config'
import { getDays } from '@/lib/rank'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/categories`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/daily`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/rules`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/ask`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/stats`, lastModified: now, changeFrequency: 'hourly', priority: 0.5 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/refunds`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/imprint`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]

  for (const c of PICKABLE_CATEGORIES) {
    pages.push({
      url: `${SITE_URL}/?category=${c.slug}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    })
  }

  try {
    // A closed day never changes again, which makes the archive the one
    // genuinely static thing here and a good crawl target.
    for (const d of await getDays(180)) {
      pages.push({
        url: `${SITE_URL}/daily/${d.day}`,
        lastModified: new Date(`${d.day}T23:59:59Z`),
        changeFrequency: 'never',
        priority: 0.4,
      })
    }
  } catch {
    // A sitemap without the archive still beats no sitemap.
  }

  return pages
}
