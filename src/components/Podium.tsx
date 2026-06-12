import type { LeaderboardRow } from '~/lib/types'

const STEPS = [
  { place: 2, height: 'h-24', tone: 'bg-silver', label: 'Silver' },
  { place: 1, height: 'h-36', tone: 'bg-gold', label: 'Gold' },
  { place: 3, height: 'h-16', tone: 'bg-bronze', label: 'Bronze' },
] as const

export function Podium({ rows }: { rows: LeaderboardRow[] }) {
  const top = rows.filter((r) => r.totalPoints > 0).slice(0, 3)
  if (top.length === 0) return null

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4" role="img" aria-label={podiumLabel(top)}>
      {STEPS.map(({ place, height, tone, label }) => {
        const row = top[place - 1]
        return (
          <div key={place} className="flex min-w-0 max-w-24 flex-1 flex-col items-center sm:max-w-32">
            {row ? (
              <div className="mb-2 flex flex-col items-center">
                <span className="text-3xl sm:text-4xl" aria-hidden="true">
                  {row.emoji}
                </span>
                <span className="mt-1 max-w-full truncate font-display text-sm font-bold sm:text-base">
                  {row.name}
                </span>
                <span className="num text-xs text-ink-soft">{row.totalPoints} pts</span>
              </div>
            ) : (
              <div className="mb-2 h-12" />
            )}
            <div
              className={`${height} ${tone} w-full rounded-t-lg border-2 border-b-0 border-ink shadow-print flex items-start justify-center pt-2`}
            >
              <span className="display-tight text-2xl text-paper" aria-hidden="true">
                {place}
              </span>
            </div>
            <span className="sr-only">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

function podiumLabel(top: LeaderboardRow[]): string {
  return top
    .map((row, i) => `${i + 1}. ${row.name} with ${row.totalPoints} points`)
    .join(', ')
}
