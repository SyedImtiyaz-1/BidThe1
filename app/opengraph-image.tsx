import { ImageResponse } from 'next/og'
import { SITE_DOMAIN, SITE_TAGLINE } from '@/lib/config'

export const alt = `${SITE_DOMAIN} · ${SITE_TAGLINE}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * The card every share renders.
 *
 * twitter:card is summary_large_image, which without an image is a blank
 * rectangle with the title under it. For a site whose distribution is people
 * posting their own rank, a blank card is the whole plan failing quietly.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '90px',
          background: '#fffdfb',
          borderBottom: '24px solid #f5501d',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 40, color: '#867f79' }}>
          #1 goes to whoever pays most
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 104,
            fontWeight: 700,
            letterSpacing: '-0.04em',
            color: '#241e1a',
            marginTop: 18,
          }}
        >
          {SITE_DOMAIN.split('.')[0]}
          <span style={{ color: '#f5501d' }}>.{SITE_DOMAIN.split('.').slice(1).join('.')}</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 44,
            color: '#5a544f',
            marginTop: 26,
            maxWidth: 900,
          }}
        >
          {SITE_TAGLINE}
        </div>
      </div>
    ),
    size,
  )
}
