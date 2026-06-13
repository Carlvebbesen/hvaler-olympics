export type Profile = {
  id: string
  name: string
  emoji: string
  imageUrl?: string
  isAdmin: boolean
  createdAt: string
}

/** A Clerk user who doesn't have an athlete profile yet. */
export type ClerkCandidate = {
  id: string
  name: string
  email?: string
  imageUrl?: string
}

export type EventStatus = 'upcoming' | 'active' | 'completed'

export type OlympicsEvent = {
  year: number
  name: string
  motto?: string
  location?: string
  status: EventStatus
  participantIds: string[]
  /**
   * Points handed out by rank for every individual activity in this event:
   * index 0 = 1st place, etc. Team activities derive their own from team count.
   */
  pointsDistribution: number[]
  createdAt: string
}

/**
 * How raw values are entered and displayed.
 * - time:   seconds (entered as "1:23.4" or "83.4"), lower is better by default
 * - count:  integer (strokes, hits, laps...)
 * - points: free-form score
 * - rounds: number of rounds completed correctly, higher is better
 * - rank:   the finishing place is entered directly (1, 2, 3...)
 * - guess:  number compared against a hidden target, closest wins
 */
export type ActivityKind = 'time' | 'count' | 'points' | 'rounds' | 'rank' | 'guess'

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

export const DEFAULT_POINTS = [1000, 900, 800, 700, 600, 500, 400, 300, 200, 100]

export const KIND_DEFAULTS: Record<
  ActivityKind,
  { direction: ScoringDirection; label: string; hint: string }
> = {
  time: { direction: 'lowest', label: 'Time', hint: 'Fastest wins — enter mm:ss.t or seconds' },
  count: { direction: 'lowest', label: 'Count', hint: 'Strokes, throws, attempts…' },
  points: { direction: 'highest', label: 'Points', hint: 'Highest score wins' },
  rounds: { direction: 'highest', label: 'Rounds', hint: 'Rounds completed correctly — most wins' },
  rank: { direction: 'lowest', label: 'Placement', hint: 'Enter each finishing place — 1, 2, 3…' },
  guess: { direction: 'closest', label: 'Guess', hint: 'Closest to the target wins' },
}
