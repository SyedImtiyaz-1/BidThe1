import type { ComponentType } from 'react'
import { Grid, Sparkle, Code, Megaphone, Shapes, ListCheck, Banknote, Phone, Dots } from './icons'

type IconProps = { size?: number; className?: string }

/** One mark per category slug. Unknown slugs get the neutral one. */
const ICONS: Record<string, ComponentType<IconProps>> = {
  all: Grid,
  ai: Sparkle,
  developer: Code,
  marketing: Megaphone,
  design: Shapes,
  productivity: ListCheck,
  finance: Banknote,
  apps: Phone,
  other: Dots,
}

export default function CategoryIcon({ slug, size = 16 }: { slug: string; size?: number }) {
  const Icon = ICONS[slug] ?? Dots
  return <Icon size={size} />
}
