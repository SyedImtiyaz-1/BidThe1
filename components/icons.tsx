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

/* --- site marks, same box and weight ------------------------------------- */

export const Mail = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="5" width="14" height="10" rx="2" />
    <path d="m3.5 6.5 6.5 5 6.5-5" />
  </svg>
)

export const XLogo = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4.5 3.5h3.2l7.8 13h-3.2z" />
    <path d="M15.5 3.5 4.5 16.5" />
  </svg>
)

export const Calendar = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="4.5" width="14" height="12" rx="2" />
    <path d="M3 8.5h14M7 3v3M13 3v3" />
  </svg>
)

export const Clock = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="10" cy="10" r="6.5" />
    <path d="M10 6.5V10l2.5 1.5" />
  </svg>
)

export const Info = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="10" cy="10" r="6.5" />
    <path d="M10 9v4.5M10 6.8v.3" />
  </svg>
)

export const Scale = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M10 3.5v13M5.5 16.5h9M4 7h12" />
    <path d="m6 7-2.5 5a2.5 2.5 0 0 0 5 0zM14 7l-2.5 5a2.5 2.5 0 0 0 5 0z" />
  </svg>
)

export const BarChart = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5 16.5v-5M10 16.5V6M15 16.5V9M3 16.5h14" />
  </svg>
)

export const HelpCircle = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="10" cy="10" r="6.5" />
    <path d="M7.8 8a2.3 2.3 0 0 1 4.4.6c0 1.5-2.2 1.7-2.2 3.1M10 14.3v.2" />
  </svg>
)

export const Flag = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5 17V3.5M5 4h9.5l-2 3 2 3H5" />
  </svg>
)

export const Building = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="4" y="3.5" width="12" height="13" rx="1.5" />
    <path d="M7.5 7h1M11.5 7h1M7.5 10h1M11.5 10h1M8.5 16.5v-3h3v3" />
  </svg>
)

export const FileText = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 3.5h6l3.5 3.5v9.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1z" />
    <path d="M12 3.5V7h3.5M7.5 10.5h5M7.5 13.5h5" />
  </svg>
)

export const Shield = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M10 3.5 4.5 5.5v4.5c0 3.5 2.4 5.9 5.5 7 3.1-1.1 5.5-3.5 5.5-7V5.5z" />
  </svg>
)

export const RotateCcw = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4.5 8.5A6 6 0 1 1 6.2 14.3M4.5 4.5v4h4" />
  </svg>
)

export const LinkIcon = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M8.5 11.5a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-1 1" />
    <path d="M11.5 8.5a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l1-1" />
  </svg>
)

export const ArrowRight = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 10h12M11 5l5 5-5 5" /></svg>
)

export const Bolt = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}><path d="M11 3 5 11.5h4.5L9 17l6-8.5h-4.5z" /></svg>
)

export const Globe = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="10" cy="10" r="6.5" />
    <path d="M3.5 10h13M10 3.5c1.8 2 2.7 4.2 2.7 6.5S11.8 14.5 10 16.5C8.2 14.5 7.3 12.3 7.3 10S8.2 5.5 10 3.5Z" />
  </svg>
)
