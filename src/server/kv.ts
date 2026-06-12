import { env } from 'cloudflare:workers'
import type { Activity, OlympicsEvent, Profile } from '~/lib/types'

const kv = () => env.OLYMPICS_KV

const PROFILE_PREFIX = 'profile:'
const EVENT_PREFIX = 'event:'
const activityPrefix = (year: number) => `activity:${year}:`

async function getJson<T>(key: string): Promise<T | null> {
  return kv().get<T>(key, 'json')
}

async function listJson<T>(prefix: string): Promise<T[]> {
  const result: T[] = []
  let cursor: string | undefined
  do {
    const page = await kv().list({ prefix, cursor })
    const values = await Promise.all(
      page.keys.map((key) => getJson<T>(key.name)),
    )
    for (const value of values) if (value !== null) result.push(value)
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
  return result
}

export const db = {
  getProfile: (id: string) => getJson<Profile>(`${PROFILE_PREFIX}${id}`),
  putProfile: (profile: Profile) =>
    kv().put(`${PROFILE_PREFIX}${profile.id}`, JSON.stringify(profile)),
  listProfiles: () => listJson<Profile>(PROFILE_PREFIX),

  getEvent: (year: number) => getJson<OlympicsEvent>(`${EVENT_PREFIX}${year}`),
  putEvent: (event: OlympicsEvent) =>
    kv().put(`${EVENT_PREFIX}${event.year}`, JSON.stringify(event)),
  listEvents: () => listJson<OlympicsEvent>(EVENT_PREFIX),

  getActivity: (year: number, id: string) =>
    getJson<Activity>(`${activityPrefix(year)}${id}`),
  putActivity: (activity: Activity) =>
    kv().put(
      `${activityPrefix(activity.year)}${activity.id}`,
      JSON.stringify(activity),
    ),
  deleteActivity: (year: number, id: string) =>
    kv().delete(`${activityPrefix(year)}${id}`),
  listActivities: (year: number) => listJson<Activity>(activityPrefix(year)),

  getAdminIds: async () => (await getJson<string[]>('admins')) ?? [],
  putAdminIds: (ids: string[]) => kv().put('admins', JSON.stringify(ids)),
}
