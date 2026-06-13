import { createServerFn } from '@tanstack/react-start'
import { auth, clerkClient } from '@clerk/tanstack-react-start/server'
import { db } from './kv'
import { buildLeaderboard, rankActivity } from '~/lib/scoring'
import { DEFAULT_POINTS } from '~/lib/types'
import type {
  Activity,
  ActivityKind,
  ClerkCandidate,
  EventStatus,
  OlympicsEvent,
  Profile,
  ResultEntry,
  ScoringDirection,
  Team,
} from '~/lib/types'

const ATHLETE_EMOJI = ['🏊', '🚣', '🏃', '🤿', '🎯', '🏐', '🛶', '🏌️', '🎣', '⛵']

async function requireUserId(): Promise<string> {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) throw new Error('You must be signed in')
  return userId
}

async function requireAdmin(): Promise<string> {
  const userId = await requireUserId()
  const admins = await db.getAdminIds()
  if (!admins.includes(userId)) throw new Error('Only admins can do this')
  return userId
}

// ---------- Profiles ----------

export const ensureProfile = createServerFn({ method: 'POST' }).handler(
  async (): Promise<Profile | null> => {
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) return null

    const existing = await db.getProfile(userId)
    const admins = await db.getAdminIds()

    // First athlete through the door runs the games
    if (admins.length === 0) {
      await db.putAdminIds([userId])
    }
    const isAdmin = admins.length === 0 || admins.includes(userId)

    if (existing) {
      if (existing.isAdmin !== isAdmin) {
        const updated = { ...existing, isAdmin }
        await db.putProfile(updated)
        return updated
      }
      return existing
    }

    const user = await clerkClient().users.getUser(userId)
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.username ||
      'Mystery athlete'
    const profile: Profile = {
      id: userId,
      name,
      emoji: ATHLETE_EMOJI[Math.floor(Math.random() * ATHLETE_EMOJI.length)]!,
      imageUrl: user.imageUrl || undefined,
      isAdmin,
      createdAt: new Date().toISOString(),
    }
    await db.putProfile(profile)
    return profile
  },
)

export const updateProfile = createServerFn({ method: 'POST' })
  .validator((data: { name: string; emoji: string }) => data)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const profile = await db.getProfile(userId)
    if (!profile) throw new Error('Profile not found')
    const name = data.name.trim().slice(0, 60)
    if (!name) throw new Error('Name is required')
    const updated: Profile = { ...profile, name, emoji: data.emoji.slice(0, 8) }
    await db.putProfile(updated)
    return updated
  })

export const listProfiles = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireUserId()
    return db.listProfiles()
  },
)

/**
 * Clerk users who haven't been turned into athletes yet. Lets the committee
 * pre-register people from the Clerk directory and backfill their results
 * before they ever sign in — the profile is keyed by their Clerk id, so it
 * links up automatically the day they do.
 */
export const listClerkCandidates = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ClerkCandidate[]> => {
    await requireAdmin()
    const profiles = await db.listProfiles()
    const claimed = new Set(profiles.map((p) => p.id))
    const { data } = await clerkClient().users.getUserList({ limit: 200 })
    return data
      .filter((user) => !claimed.has(user.id))
      .map((user) => ({
        id: user.id,
        name:
          user.fullName?.trim() ||
          user.username ||
          user.primaryEmailAddress?.emailAddress ||
          'Mystery athlete',
        email: user.primaryEmailAddress?.emailAddress || undefined,
        imageUrl: user.imageUrl || undefined,
      }))
  },
)

/** Pre-create an athlete profile for a Clerk user who hasn't signed in yet. */
export const addClerkAthlete = createServerFn({ method: 'POST' })
  .validator((data: { clerkUserId: string }) => data)
  .handler(async ({ data }): Promise<Profile> => {
    await requireAdmin()
    const existing = await db.getProfile(data.clerkUserId)
    if (existing) return existing
    const user = await clerkClient().users.getUser(data.clerkUserId)
    const admins = await db.getAdminIds()
    const profile: Profile = {
      id: user.id,
      name:
        user.fullName?.trim() ||
        user.username ||
        user.primaryEmailAddress?.emailAddress ||
        'Mystery athlete',
      emoji: ATHLETE_EMOJI[Math.floor(Math.random() * ATHLETE_EMOJI.length)]!,
      imageUrl: user.imageUrl || undefined,
      isAdmin: admins.includes(user.id),
      createdAt: new Date().toISOString(),
    }
    await db.putProfile(profile)
    return profile
  })

// ---------- Events ----------

export const listEvents = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireUserId()
    const events = await db.listEvents()
    const withCounts = await Promise.all(
      events.map(async (event) => {
        const activities = await db.listActivities(event.year)
        return { event, activityCount: activities.length }
      }),
    )
    return withCounts.sort((a, b) => b.event.year - a.event.year)
  },
)

export const createEvent = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      year: number
      name: string
      motto?: string
      location?: string
      status: EventStatus
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin()
    const year = Math.floor(data.year)
    if (year < 1900 || year > 2200) throw new Error('That year looks wrong')
    if (await db.getEvent(year)) throw new Error(`The ${year} games already exist`)
    const event: OlympicsEvent = {
      year,
      name: data.name.trim() || `Hvaler Olympics ${year}`,
      motto: data.motto?.trim() || undefined,
      location: data.location?.trim() || undefined,
      status: data.status,
      participantIds: [],
      pointsDistribution: DEFAULT_POINTS,
      createdAt: new Date().toISOString(),
    }
    await db.putEvent(event)
    return event
  })

export const updateEventSettings = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      year: number
      name: string
      motto?: string
      location?: string
      pointsDistribution: number[]
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin()
    const event = await db.getEvent(data.year)
    if (!event) throw new Error('Event not found')
    const name = data.name.trim()
    if (!name) throw new Error('Name is required')
    if (data.pointsDistribution.length === 0)
      throw new Error('Points distribution is required')
    const updated: OlympicsEvent = {
      ...event,
      name,
      motto: data.motto?.trim() || undefined,
      location: data.location?.trim() || undefined,
      pointsDistribution: data.pointsDistribution,
    }
    await db.putEvent(updated)
    return updated
  })

export const updateEventStatus = createServerFn({ method: 'POST' })
  .validator((data: { year: number; status: EventStatus }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
    const event = await db.getEvent(data.year)
    if (!event) throw new Error('Event not found')
    const updated = { ...event, status: data.status }
    await db.putEvent(updated)
    return updated
  })

export const setParticipant = createServerFn({ method: 'POST' })
  .validator(
    (data: { year: number; participantId: string; joined: boolean }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin()
    const event = await db.getEvent(data.year)
    if (!event) throw new Error('Event not found')
    const ids = new Set(event.participantIds)
    if (data.joined) ids.add(data.participantId)
    else ids.delete(data.participantId)
    const updated = { ...event, participantIds: [...ids] }
    await db.putEvent(updated)
    return updated
  })

export const getEventDetail = createServerFn({ method: 'GET' })
  .validator((data: { year: number }) => data)
  .handler(async ({ data }) => {
    await requireUserId()
    const [event, activities, profiles] = await Promise.all([
      db.getEvent(data.year),
      db.listActivities(data.year),
      db.listProfiles(),
    ])
    if (!event) return null
    activities.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return {
      event,
      activities,
      profiles,
      leaderboard: buildLeaderboard(event, activities, profiles),
    }
  })

// ---------- Activities ----------

export const createActivity = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      year: number
      name: string
      description?: string
      kind: ActivityKind
      unit?: string
      direction: ScoringDirection
      target?: number
      isTeam: boolean
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin()
    const event = await db.getEvent(data.year)
    if (!event) throw new Error('Event not found')
    const name = data.name.trim()
    if (!name) throw new Error('Activity name is required')
    if (data.kind === 'guess' && data.target === undefined)
      throw new Error('A guess activity needs a target value')
    const activity: Activity = {
      id: crypto.randomUUID().slice(0, 8),
      year: data.year,
      name,
      description: data.description?.trim() || undefined,
      kind: data.kind,
      unit: data.unit?.trim() || undefined,
      direction: data.direction,
      target: data.kind === 'guess' ? data.target : undefined,
      isTeam: data.isTeam,
      teams: [],
      optOuts: [],
      results: [],
      status: 'open',
      createdAt: new Date().toISOString(),
    }
    await db.putActivity(activity)
    return activity
  })

export const deleteActivity = createServerFn({ method: 'POST' })
  .validator((data: { year: number; activityId: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
    await db.deleteActivity(data.year, data.activityId)
    return { ok: true }
  })

export const saveTeams = createServerFn({ method: 'POST' })
  .validator(
    (data: { year: number; activityId: string; teams: Team[] }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin()
    const activity = await db.getActivity(data.year, data.activityId)
    if (!activity) throw new Error('Activity not found')
    if (!activity.isTeam) throw new Error('Not a team activity')
    const teams = data.teams
      .map((team) => ({
        id: team.id || crypto.randomUUID().slice(0, 8),
        name: team.name.trim(),
        memberIds: [...new Set(team.memberIds)],
      }))
      .filter((team) => team.name && team.memberIds.length > 0)
    const teamIds = new Set(teams.map((t) => t.id))
    const updated: Activity = {
      ...activity,
      teams,
      results: activity.results.filter((r) => teamIds.has(r.subjectId)),
    }
    await db.putActivity(updated)
    return updated
  })

export const setOptOut = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      year: number
      activityId: string
      participantId: string
      optedOut: boolean
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin()
    const activity = await db.getActivity(data.year, data.activityId)
    if (!activity) throw new Error('Activity not found')
    if (activity.isTeam)
      throw new Error('For team activities, just leave them off the teams')
    const optOuts = new Set(activity.optOuts ?? [])
    if (data.optedOut) optOuts.add(data.participantId)
    else optOuts.delete(data.participantId)
    const updated: Activity = {
      ...activity,
      optOuts: [...optOuts],
      // A sitting-out athlete can't keep a result on the board
      results: data.optedOut
        ? activity.results.filter((r) => r.subjectId !== data.participantId)
        : activity.results,
    }
    await db.putActivity(updated)
    return updated
  })

export const saveResults = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      year: number
      activityId: string
      results: ResultEntry[]
      markScored: boolean
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin()
    const activity = await db.getActivity(data.year, data.activityId)
    if (!activity) throw new Error('Activity not found')
    const optOuts = new Set(activity.optOuts ?? [])
    const results = data.results.filter(
      (r) => Number.isFinite(r.value) && !optOuts.has(r.subjectId),
    )
    const updated: Activity = {
      ...activity,
      results,
      status: data.markScored && results.length > 0 ? 'scored' : 'open',
    }
    await db.putActivity(updated)
    return updated
  })

export const getActivityDetail = createServerFn({ method: 'GET' })
  .validator((data: { year: number; activityId: string }) => data)
  .handler(async ({ data }) => {
    await requireUserId()
    const [activity, event, profiles] = await Promise.all([
      db.getActivity(data.year, data.activityId),
      db.getEvent(data.year),
      db.listProfiles(),
    ])
    if (!activity || !event) return null
    return {
      activity,
      event,
      profiles,
      ranked: rankActivity(activity, event.pointsDistribution),
    }
  })

// ---------- Home ----------

export const getHome = createServerFn({ method: 'GET' }).handler(async () => {
  // The landing page stays reachable signed-out, but shows no game data
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) return null
  const events = await db.listEvents()
  if (events.length === 0) return null
  const sorted = events.sort((a, b) => b.year - a.year)
  const current =
    sorted.find((e) => e.status === 'active') ??
    sorted.find((e) => e.status === 'upcoming') ??
    sorted[0]!
  const [activities, profiles] = await Promise.all([
    db.listActivities(current.year),
    db.listProfiles(),
  ])
  return {
    event: current,
    activityCount: activities.length,
    scoredCount: activities.filter((a) => a.status === 'scored').length,
    leaderboard: buildLeaderboard(current, activities, profiles),
  }
})
