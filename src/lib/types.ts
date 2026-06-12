export type Profile = {
  id: string
  name: string
  emoji: string
  imageUrl?: string
  isAdmin: boolean
  createdAt: string
}

export type EventStatus = 'upcoming' | 'active' | 'completed'

export type OlympicsEvent = {
  year: number
  name: string
  motto?: string
  location?: string
  status: EventStatus
  participantIds: string[]
  createdAt: string
}

/**
 * How raw values are entered and displayed.
 * - time:   seconds (entered as "1:23.4" or "83.4"), lower is better by default
 * - count:  integer (strokes, hits, laps...)
 * - points: free-form score
 * - guess:  number compared against a hidden target, closest wins
 */
export type ActivityKind = 'time' | 'count' | 'points' | 'guess'

export type ScoringDirection = 'lowest' | 'highest' | 'closest'

export type Team = {
  id: string
  name: string
  memberIds: string[]
}

export type ResultEntry = {
  /** participantId for individual activities, teamId for team activities */
  subjectId: string
  value: number
}

export type Activity = {
  id: string
  year: number
  name: string
  description?: string
  kind: ActivityKind
  unit?: string
  direction: ScoringDirection
  /** Only for kind === 'guess' */
  target?: number
  isTeam: boolean
  teams: Team[]
  /** Participants sitting this one out (individual activities only) */
  optOuts?: string[]
  /** Points handed out by rank: index 0 = 1st place, etc. */
  pointsDistribution: number[]
  results: ResultEntry[]
  status: 'open' | 'scored'
  createdAt: string
}

export type RankedResult = ResultEntry & {
  rank: number
  points: number
  label: string
  memberIds: string[]
}

export type LeaderboardRow = {
  participantId: string
  name: string
  emoji: string
  imageUrl?: string
  gold: number
  silver: number
  bronze: number
  activitiesPlayed: number
  totalPoints: number
}

export const DEFAULT_POINTS = [10, 8, 6, 5, 4, 3, 2, 1]

export const KIND_DEFAULTS: Record<
  ActivityKind,
  { direction: ScoringDirection; label: string; hint: string }
> = {
  time: { direction: 'lowest', label: 'Time', hint: 'Fastest wins — enter mm:ss.t or seconds' },
  count: { direction: 'lowest', label: 'Count', hint: 'Strokes, throws, attempts…' },
  points: { direction: 'highest', label: 'Points', hint: 'Highest score wins' },
  guess: { direction: 'closest', label: 'Guess', hint: 'Closest to the target wins' },
}
