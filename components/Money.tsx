import { moneyParts } from '@/lib/money'

/**
 * Digits carry .num for tabular figures, which is what makes a column of
 * prices build a straight edge as the board reorders.
 */
export default function Money({
  minor,
  decimals = false,
  className = '',
}: {
  minor: number
  decimals?: boolean
  className?: string
}) {
  const { symbol, amount } = moneyParts(minor, { decimals })
  return (
    <span className={`money ${className}`}>
      <span className="sym">{symbol}</span>
      <span className="num">{amount}</span>
    </span>
  )
}
