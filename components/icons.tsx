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
