/**
 * Five interlocking rings, archipelago edition: ink, sea and flag tones
 * instead of the trademarked palette.
 */
export function OlympicRings({ className }: { className?: string }) {
  const ring = { r: 9, strokeWidth: 3.2, fill: 'none' } as const
  return (
    <svg viewBox="0 0 78 32" className={className} aria-hidden="true">
      <circle cx="11" cy="11" stroke="#1d2b49" {...ring} />
      <circle cx="39" cy="11" stroke="#1f6079" {...ring} />
      <circle cx="67" cy="11" stroke="#1d2b49" {...ring} />
      <circle cx="25" cy="21" stroke="#d94f1e" {...ring} />
      <circle cx="53" cy="21" stroke="#b8860b" {...ring} />
    </svg>
  )
}
