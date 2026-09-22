import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import './globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Presence from '@/components/Presence'
import { SITE_NAME } from '@/lib/config'

export const metadata: Metadata = {
  title: `${SITE_NAME}.lol — the board is sorted by money`,
  description:
    'A paid leaderboard. Every listing is an advertisement and position is set only by the amount paid, highest first.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies()
  const theme = jar.get('theme')?.value === 'dark' ? 'dark' : 'light'

  return (
    <html
      lang="en"
      data-theme={theme}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the stored theme before first paint, so the page does not
            flash light and then correct itself. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}`,
          }}
        />
      </head>
      <body>
        <Nav />
        <main>{children}</main>
        <Footer />
        <Presence />
      </body>
    </html>
  )
}
