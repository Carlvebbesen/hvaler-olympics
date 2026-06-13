import { queryOptions } from '@tanstack/react-query'
import {
  ensureProfile,
  getActivityDetail,
  getEventDetail,
  getHome,
  listClerkCandidates,
  listEvents,
  listProfiles,
} from '~/server/fns'

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: () => ensureProfile(),
  staleTime: Infinity,
})

export const homeQuery = queryOptions({
  queryKey: ['home'],
  queryFn: () => getHome(),
})

export const eventsQuery = queryOptions({
  queryKey: ['events'],
  queryFn: () => listEvents(),
})

export const profilesQuery = queryOptions({
  queryKey: ['profiles'],
  queryFn: () => listProfiles(),
})

export const clerkCandidatesQuery = queryOptions({
  queryKey: ['clerk-candidates'],
  queryFn: () => listClerkCandidates(),
})

export const eventDetailQuery = (year: number) =>
  queryOptions({
    queryKey: ['event', year],
    queryFn: () => getEventDetail({ data: { year } }),
  })

export const activityDetailQuery = (year: number, activityId: string) =>
  queryOptions({
    queryKey: ['activity', year, activityId],
    queryFn: () => getActivityDetail({ data: { year, activityId } }),
  })
