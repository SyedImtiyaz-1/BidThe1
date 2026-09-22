import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { Metadata } from 'next'
import type React from 'react'
import Money from '@/components/Money'
import CopyLink from '@/components/CopyLink'
import CategoryIcon from '@/components/CategoryIcon'
import { Trophy, Clock, ExternalLink, LinkIcon, Bolt } from '@/components/icons'
import { getListingDetail as loadDetail } from '@/lib/rank'
import { formatMoney, unitsToBeat, unitsToBase } from '@/lib/money'
import { CATEGORIES, MIN_FIRST_PAYMENT_MINOR, SITE_DOMAIN, SITE_URL } from '@/lib/config'
import { ago } from '@/lib/time'

export const dynamic = 'force-dynamic'

const LABEL = new Map<string, string>(CATEGORIES.map((c) => [c.slug, c.label]))

// generateMetadata and the page both need the detail. React's cache dedupes
// the two calls within one request, so the three queries run once, not twice.
const getListingDetail = cache(loadDetail)
const n = (v: number) => v.toLocaleString('en-US')

type Params = { params: Promise<{ slug: string }> }

/**
 * The sentence the page is built around, reused as the meta description and
 * the first FAQ answer. Search engines index that sentence; a person skimming
 * reads the same one. Ranks change by the hour, so the copy is computed, not
 * written.
 */
function standingSentence(d: NonNullable<Awaited<ReturnType<typeof getListingDetail>>>, money: string) {
  const cat = LABEL.get(d.listing.category) ?? d.listing.category
  if (!d.overall || !d.category) return `${d.listing.title} is listed on ${SITE_DOMAIN}.`
  return `${d.listing.title} has spent ${money} on ${SITE_DOMAIN} to rank #${d.category.rank} of ${n(d.category.count)} in ${cat} and #${d.overall.rank} of ${n(d.overall.count)} overall.`
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const d = await getListingDetail(slug)
  if (!d) return { title: 'Not found' }
  const money = formatMoney(d.listing.total_minor)
  const title = d.overall ? `${d.listing.title} · #${d.overall.rank} on ${SITE_DOMAIN}` : d.listing.title
  const description = standingSentence(d, money)
  return {
    // The layout appends the site name to every title; this one already ends
    // with it, so opt out of the template rather than say the name twice.
    title: { absolute: title },
    description,
    alternates: { canonical: `${SITE_URL}/product/${slug}` },
    openGraph: { title, description, url: `${SITE_URL}/product/${slug}` },
  }
}

export default async function Page({ params }: Params) {
  const { slug } = await params
  const d = await getListingDetail(slug)
  if (!d) notFound()

  const l = d.listing
  const cat = LABEL.get(l.category) ?? l.category
  const total = Number(l.total_minor)
  const totalText = formatMoney(total)
  const todayText = formatMoney(d.todayMinor)
  const takeText = formatMoney(unitsToBase(unitsToBeat(total, MIN_FIRST_PAYMENT_MINOR)))
  const clicks = Number(l.click_count)
  const url = `${SITE_URL}/product/${slug}`

  const faq = [
    {
      q: `What rank does ${l.title} hold on ${SITE_DOMAIN}?`,
      a: standingSentence(d, totalText),
    },
    {
      q: `Has ${l.title} ranked today?`,
      a: d.todayOverall && d.todayCategory
        ? `${l.title} spent ${todayText} since midnight UTC, ranking #${d.todayCategory.rank} of ${n(d.todayCategory.count)} in ${cat} and #${d.todayOverall.rank} of ${n(d.todayOverall.count)} on today's board.`
        : `${l.title} has not paid anything since midnight UTC, so it is not on today's board.`,
    },
    {
      q: `How do I outrank ${l.title}?`,
      a: `Anyone can take this rank for ${takeText} on the ${cat} board. Ties go to whoever reached the amount first, so it has to be more, not the same.`,
    },
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Leaderboard', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: cat, item: `${SITE_URL}/?category=${l.category}` },
          { '@type': 'ListItem', position: 3, name: l.title, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({
          '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      { '@type': 'WebPage', name: `${l.title} on ${SITE_DOMAIN}`, url, description: faq[0].a },
    ],
  }

  const card = (
    label: string, s: { rank: number; count: number } | null, where: string, href: string,
    mark: React.ReactNode, extra?: string,
  ) => (
    <Link href={href} className="stand">
      <span className="stand-k">{mark} {label}</span>
      {s ? (
        <>
          <span className="stand-v num">#{s.rank}</span>
          <span className="stand-of num">of {n(s.count)} {where}{extra ? ` ${extra}` : ''}</span>
        </>
      ) : (
        <>
          <span className="stand-v stand-none">—</span>
          <span className="stand-of">not on this board</span>
        </>
      )}
      <span className="stand-go">See ranking ›</span>
    </Link>
  )

  return (
    <div className="wrap product">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/"><Trophy size={14} /> Leaderboard</Link>
        <span className="sep">·</span>
        <Link href={`/?category=${l.category}`}><CategoryIcon slug={l.category} size={14} /> {cat}</Link>
      </nav>

      <header className="product-head">
        <img className="ico product-ico" src={`/icon/${l.slug}`} alt="" width={72} height={72} />
        <div className="product-main">
          <h1>{l.title}</h1>
          <div className="row-meta">
            <Link href={`/?category=${l.category}`}><CategoryIcon slug={l.category} size={14} /> {cat}</Link>
            <span className="sep">·</span>
            <span>{l.host}</span>
            <span className="sep">·</span>
            <span>{ago(l.created_at)}</span>
            <span className="sep">·</span>
            <span className="num">{n(clicks)} clicks</span>
          </div>
          {l.tagline && <p className="product-tag">{l.tagline}</p>}
          <div className="product-actions">
            <a className="btn" href={`/go/${l.slug}`} rel="sponsored nofollow noopener" target="_blank">
              Visit <ExternalLink size={14} />
            </a>
            <CopyLink />
          </div>
        </div>
        <div className="product-money">
          <span className="stand-k">Paid</span>
          <Money minor={total} />
        </div>
      </header>

      <div className="stands">
        {card('Category rank', d.category, `in ${cat}`, `/?category=${l.category}`, <CategoryIcon slug={l.category} size={14} />)}
        {card('Overall', d.overall, 'on the board', '/', <Trophy size={14} />)}
        {card(`Today in ${cat}`, d.todayCategory, `after ${todayText} today`, `/?scope=today&category=${l.category}`, <Clock size={14} />)}
        {card('Today overall', d.todayOverall, "on today's board", '/?scope=today', <Clock size={14} />)}
      </div>

      <section className="about-rank">
        <h2>About this ranking</h2>
        <p className="lead">
          {d.lastClaimedAt ? `The listing was last claimed ${ago(d.lastClaimedAt)}.` : 'No confirmed payment yet.'}{' '}
          {n(clicks)} {clicks === 1 ? 'visitor has' : 'visitors have'} opened {l.host}.
        </p>
        {faq.map((f) => (
          <div key={f.q} className="qa">
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}
        <p className="take">
          <Link href={`/?category=${l.category}#claim`} className="btn"><Bolt /> Take this rank for {takeText}</Link>
        </p>
      </section>

      {d.neighbours.length > 0 && (
        <section className="also">
          <div className="rail-head">
            <span className="rail-title"><CategoryIcon slug={l.category} size={16} /> Also in {cat}</span>
            <Link href={`/?category=${l.category}`} className="rail-link">See all ›</Link>
          </div>
          <ol className="cat-rows">
            {d.neighbours.map((x) => (
              <li key={x.slug}>
                <span className="cat-rank num">#{x.rank}</span>
                <Link className="cat-row-title" href={`/product/${x.slug}`}>{x.title}</Link>
                <span className="cat-row-amt num"><Money minor={x.amountMinor} /></span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
