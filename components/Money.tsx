import { moneyParts } from '@/lib/money'

/**
 * The symbol is context, the number is the content, so the symbol is set
 * smaller and lighter. Digits carry .num for tabular figures, which is what
 * makes a column of prices build a straight edge as the board reorders.
 */
export default function Money({
  minor,
  currency,
  decimals = false,
  className = '',
}: {
  minor: number
  currency: string
  decimals?: boolean
  className?: string
}) {
  const { symbol, amount } = moneyParts(minor, currency, { decimals })
  return (
    <span className={`money ${className}`}>
      <span className="sym">{symbol}</span>
      <span className="num">{amount}</span>
    </span>
  )
}
