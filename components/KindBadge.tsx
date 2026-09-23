import { Globe, Phone, Person } from './icons'

const MARKS = {
  website: { Icon: Globe, label: 'Website' },
  app: { Icon: Phone, label: 'App' },
  profile: { Icon: Person, label: 'Profile' },
} as const

/**
 * What shape of thing a listing is, shown rather than filtered on.
 *
 * The category says what a listing is about, which is the axis worth browsing.
 * This only answers "what am I looking at", and a mark beside the host answers
 * it faster than a dropdown ever could.
 */
export default function KindBadge({ kind }: { kind?: string | null }) {
  const m = MARKS[(kind ?? 'website') as keyof typeof MARKS] ?? MARKS.website
  return (
    <span className="kind-badge">
      <m.Icon size={13} /> {m.label}
    </span>
  )
}
