type Props = {
  value: number | null | undefined
  decimals?: number
  prefix?: string
  suffix?: string
  signed?: boolean
  colored?: boolean
  className?: string
}

export function formatNumber(
  value: number | null | undefined,
  decimals = 2,
  signed = false
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
  if (signed) {
    const sign = value > 0 ? '+' : value < 0 ? '-' : ''
    return `${sign}${formatted}`
  }
  return value < 0 ? `-${formatted}` : formatted
}

export function Num({
  value,
  decimals = 2,
  prefix = '',
  suffix = '',
  signed = false,
  colored = false,
  className = ''
}: Props): React.JSX.Element {
  const txt = formatNumber(value, decimals, signed)
  const color =
    colored && typeof value === 'number'
      ? value > 0
        ? 'text-positive'
        : value < 0
          ? 'text-negative'
          : 'text-text-secondary'
      : ''
  return (
    <span className={`num tabular-nums ${color} ${className}`}>
      {prefix}
      {txt}
      {suffix}
    </span>
  )
}
