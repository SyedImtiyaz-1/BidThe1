/**
 * Seven icons, drawn by hand at 1.5px on a 20px box.
 *
 * Lucide and Heroicons are both named tells in the generated-design discourse,
 * and Lucide's default 2px-on-24px weight is instantly recognisable. Writing
 * them out costs twenty minutes and removes a dependency.
 */
type P = { size?: number; className?: string }

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export const Plus = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}><path d="M10 4.5v11M4.5 10h11" /></svg>
)

export const Minus = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4.5 10h11" /></svg>
)

export const ExternalLink = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M8 4.5H4.8A1.3 1.3 0 0 0 3.5 5.8v9.4a1.3 1.3 0 0 0 1.3 1.3h9.4a1.3 1.3 0 0 0 1.3-1.3V12" />
    <path d="M11.5 3.5h5v5M16.5 3.5 9 11" />
  </svg>
)

export const Check = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}><path d="m4.5 10.5 3.5 3.5 7.5-8" /></svg>
)

export const Sun = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="10" cy="10" r="3.6" />
    <path d="M10 1.8v1.8M10 16.4v1.8M3.2 3.2l1.3 1.3M15.5 15.5l1.3 1.3M1.8 10h1.8M16.4 10h1.8M3.2 16.8l1.3-1.3M15.5 4.5l1.3-1.3" />
  </svg>
)

export const Moon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M16.2 11.6A6.8 6.8 0 0 1 8.4 3.8a6.8 6.8 0 1 0 7.8 7.8Z" />
  </svg>
)

export const Trophy = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6.5 3h7v3.5a3.5 3.5 0 0 1-7 0Z" />
    <path d="M6.5 4.2H4.4v1.1a2.2 2.2 0 0 0 2.1 2.2M13.5 4.2h2.1v1.1a2.2 2.2 0 0 1-2.1 2.2" />
    <path d="M10 10v3.4M7.4 16.5h5.2l-.5-3H7.9Z" />
  </svg>
)

/* --- category marks, same box and weight --------------------------------- */

export const Grid = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3.5" y="3.5" width="5.5" height="5.5" rx="1.2" />
    <rect x="11" y="3.5" width="5.5" height="5.5" rx="1.2" />
    <rect x="3.5" y="11" width="5.5" height="5.5" rx="1.2" />
    <rect x="11" y="11" width="5.5" height="5.5" rx="1.2" />
  </svg>
)

export const GridPlus = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3.5" y="3.5" width="5.5" height="5.5" rx="1.2" />
    <rect x="11" y="3.5" width="5.5" height="5.5" rx="1.2" />
    <rect x="3.5" y="11" width="5.5" height="5.5" rx="1.2" />
    <path d="M13.75 11.25v5M11.25 13.75h5" />
  </svg>
)

export const Sparkle = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M10 3.5c.4 3.4 2.6 5.6 6 6-3.4.4-5.6 2.6-6 6-.4-3.4-2.6-5.6-6-6 3.4-.4 5.6-2.6 6-6Z" />
  </svg>
)

export const Code = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m6.5 6.5-4 3.5 4 3.5M13.5 6.5l4 3.5-4 3.5M11.5 4.5l-3 11" />
  </svg>
)

export const Megaphone = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3.5 8.5v3a1 1 0 0 0 1 1H6l6 3.5V4L6 7.5H4.5a1 1 0 0 0-1 1Z" />
    <path d="M14.5 8a2.6 2.6 0 0 1 0 4M6.5 12.5l1 4" />
  </svg>
)

export const Shapes = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3.5" y="10.5" width="6" height="6" rx="1.2" />
    <circle cx="13.5" cy="13.5" r="3" />
    <path d="M10 3.5l3.5 5.5h-7z" />
  </svg>
)

export const ListCheck = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M9 5.5h7.5M9 10h7.5M9 14.5h7.5" />
    <path d="m3.5 5.5 1 1 2-2M3.5 10l1 1 2-2M3.5 14.5l1 1 2-2" />
  </svg>
)

export const Banknote = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="2.5" y="5.5" width="15" height="9" rx="1.6" />
    <circle cx="10" cy="10" r="2.2" />
    <path d="M5.5 8v4M14.5 8v4" />
  </svg>
)

export const Phone = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="6" y="2.5" width="8" height="15" rx="1.8" />
    <path d="M9 14.75h2" />
  </svg>
)

export const Dots = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="5" cy="10" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="10" cy="10" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="1.1" fill="currentColor" stroke="none" />
  </svg>
)
