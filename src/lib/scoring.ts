import type {
  Activity,
  LeaderboardRow,
  OlympicsEvent,
  Profile,
  RankedResult,
} from './types'

/**
 * Default points for team activities, decided by how many teams take part.
 * Last place always lands on 0; ties still share points via rankActivity.
 */
export function teamPointsDistribution(teamCount: number): number[] {
  switch (teamCount) {
    case 0:
    case 1:
      return []
    case 2:
      return [500, 0]
    case 3:
      return [500, 300, 0]
    case 4:
      return [600, 400, 200, 0]
    default:
      // 5+ teams: even steps of 200 down to 0
      return Array.from({ length: teamCount }, (_, i) => (teamCount - 1 - i) * 200)
  }
}

/**
 * The points actually used to score an activity. Team activities derive their
 * distribution from the number of teams; individual activities use their own.
 */
export function effectivePointsDistribution(
  activity: Pick<Activity, 'isTeam' | 'teams' | 'pointsDistribution'>,
): number[] {
  return activity.isTeam
    ? teamPointsDistribution(activity.teams.length)
    : activity.pointsDistribution
}

/**
 * Rank raw results for an activity and award points.
 * Uses standard competition ranking: ties share the better rank
 * (1, 2, 2, 4, ...) and receive the same points, with the skipped
 * place(s) handed out to nobody.
 */
export function rankActivity(activity: Activity): RankedResult[] {
  const score = (value: number) => {
    switch (activity.direction) {
      case 'lowest':
        return value
      case 'highest':
        return -value
      case 'closest':
        return Math.abs(value - (activity.target ?? 0))
    }
  }

  const sorted = [...activity.results].sort((a, b) => score(a.value) - score(b.value))
  const distribution = effectivePointsDistribution(activity)

  const ranked: RankedResult[] = []
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i]!
    const prev = ranked[i - 1]
    const rank =
      prev && score(prev.value) === score(entry.value) ? prev.rank : i + 1
    ranked.push({
      ...entry,
      rank,
      points: distribution[rank - 1] ?? 0,
      label: entry.subjectId,
      memberIds: [entry.subjectId],
    })
  }

  if (activity.isTeam) {
    for (const row of ranked) {
      const team = activity.teams.find((t) => t.id === row.subjectId)
      row.label = team?.name ?? 'Unknown team'
      row.memberIds = team?.memberIds ?? []
    }
  }

  return ranked
}

/**
 * Sum awarded points per participant across all scored activities.
 * Team points are credited to every team member in full.
 */
export function buildLeaderboard(
  event: OlympicsEvent,
  activities: Activity[],
  profiles: Profile[],
): LeaderboardRow[] {
  const rows = new Map<string, LeaderboardRow>()
  for (const id of event.participantIds) {
    const profile = profiles.find((p) => p.id === id)
    rows.set(id, {
      participantId: id,
      name: profile?.name ?? 'Unknown athlete',
      emoji: profile?.emoji ?? '🏅',
      imageUrl: profile?.imageUrl,
      gold: 0,
      silver: 0,
      bronze: 0,
      activitiesPlayed: 0,
      totalPoints: 0,
    })
  }

  for (const activity of activities) {
    if (activity.status !== 'scored') continue
    for (const result of rankActivity(activity)) {
      for (const memberId of result.memberIds) {
        const row = rows.get(memberId)
        if (!row) continue
        row.totalPoints += result.points
        row.activitiesPlayed += 1
        if (result.rank === 1) row.gold += 1
        else if (result.rank === 2) row.silver += 1
        else if (result.rank === 3) row.bronze += 1
      }
    }
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      b.gold - a.gold ||
      b.silver - a.silver ||
      b.bronze - a.bronze ||
      a.name.localeCompare(b.name),
  )
}

/** Parse "1:23.4", "01:02:03", or plain seconds into seconds. */
export function parseTime(input: string): number | null {
  const trimmed = input.trim().replace(',', '.')
  if (!trimmed) return null
  const parts = trimmed.split(':')
  if (parts.some((p) => p === '' || Number.isNaN(Number(p)))) return null
  let seconds = 0
  for (const part of parts) seconds = seconds * 60 + Number(part)
  return seconds
}

export function formatTime(seconds: number): string {
  const sign = seconds < 0 ? '-' : ''
  const abs = Math.abs(seconds)
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const s = abs % 60
  const secStr = s.toFixed(s % 1 === 0 ? 0 : 1).padStart(2, '0')
  if (h > 0) return `${sign}${h}:${String(m).padStart(2, '0')}:${secStr}`
  return `${sign}${m}:${secStr}`
}

/** Turn 1, 2, 3, 21 into "1st", "2nd", "3rd", "21st". */
export function formatOrdinal(value: number): string {
  const n = Math.round(value)
  const tens = Math.abs(n) % 100
  const ones = Math.abs(n) % 10
  const suffix =
    tens >= 11 && tens <= 13
      ? 'th'
      : ones === 1
        ? 'st'
        : ones === 2
          ? 'nd'
          : ones === 3
            ? 'rd'
            : 'th'
  return `${n}${suffix}`
}

export function formatValue(activity: Pick<Activity, 'kind' | 'unit'>, value: number): string {
  if (activity.kind === 'time') return formatTime(value)
  if (activity.kind === 'rank') return formatOrdinal(value)
  const formatted = Number.isInteger(value)
    ? value.toLocaleString('en-US')
    : value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return activity.unit ? `${formatted} ${activity.unit}` : formatted
}

export function parseValue(kind: Activity['kind'], input: string): number | null {
  if (kind === 'time') return parseTime(input)
  const n = Number(input.trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function parsePointsDistribution(input: string): number[] | null {
  const parts = input
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return null
  const numbers = parts.map(Number)
  if (numbers.some((n) => !Number.isFinite(n) || n < 0)) return null
  return numbers
}
