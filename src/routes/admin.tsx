import * as React from 'react'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { addClerkAthlete, createEvent, updateEventStatus } from '~/server/fns'
import { clerkCandidatesQuery, eventsQuery } from '~/lib/queries'
import type { EventStatus } from '~/lib/types'

export const Route = createFileRoute('/admin')({
  beforeLoad: ({ context }) => {
    if (!context.me) throw redirect({ href: '/sign-in' })
    if (!context.me.isAdmin) throw redirect({ to: '/' })
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQuery),
  component: AdminPage,
})

const CURRENT_YEAR = new Date().getFullYear()

function AdminPage() {
  const { data: events } = useSuspenseQuery(eventsQuery)
  const queryClient = useQueryClient()

  const [year, setYear] = React.useState(String(CURRENT_YEAR))
  const [name, setName] = React.useState('')
  const [motto, setMotto] = React.useState('')
  const [location, setLocation] = React.useState('Hvaler')
  const [status, setStatus] = React.useState<EventStatus>('upcoming')

  const create = useMutation({
    mutationFn: () =>
      createEvent({
        data: { year: Number(year), name: name || `Hvaler Olympics ${year}`, motto, location, status },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      setName('')
      setMotto('')
    },
  })

  const setEventStatus = useMutation({
    mutationFn: (data: { year: number; status: EventStatus }) =>
      updateEventStatus({ data }),
    onSuccess: () => queryClient.invalidateQueries(),
  })

  const isPastYear = Number(year) < CURRENT_YEAR

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <p className="font-serif text-xl italic text-sea">Olympic committee</p>
      <h1 className="display-tight mt-2 text-5xl sm:text-6xl">Admin</h1>

      <section aria-labelledby="new-event-heading" className="panel mt-10 p-6 sm:p-8">
        <h2 id="new-event-heading" className="display-tight text-2xl">
          Light a new torch
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Create this year's games — or pick a past year to backfill old results into
          the record books.
        </p>

        <form
          className="mt-6 grid gap-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate()
          }}
        >
          <div>
            <label className="label" htmlFor="event-year">
              Year
            </label>
            <input
              id="event-year"
              className="input num"
              type="number"
              inputMode="numeric"
              min={1900}
              max={2200}
              required
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
            {isPastYear ? (
              <p className="mt-1 text-sm font-bold text-sea">
                Backfill mode — consider marking it “completed”.
              </p>
            ) : null}
          </div>
          <div>
            <label className="label" htmlFor="event-name">
              Name
            </label>
            <input
              id="event-name"
              className="input"
              placeholder={`Hvaler Olympics ${year || CURRENT_YEAR}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="event-motto">
              Motto <span className="font-normal normal-case text-ink-soft">(optional)</span>
            </label>
            <input
              id="event-motto"
              className="input"
              placeholder="No mercy on the dock"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="event-location">
              Location
            </label>
            <input
              id="event-location"
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="event-status">
              Status
            </label>
            <select
              id="event-status"
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
            >
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed (backfill)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create games'}
            </button>
          </div>
          {create.isError ? (
            <p role="alert" className="rounded border-2 border-flag bg-flag/10 px-4 py-2 text-flag-deep sm:col-span-2">
              {(create.error as Error).message}
            </p>
          ) : null}
        </form>
      </section>

      <section aria-labelledby="manage-heading" className="mt-12">
        <h2 id="manage-heading" className="display-tight text-2xl">
          Manage games
        </h2>
        {events.length === 0 ? (
          <p className="mt-4 text-ink-soft">Nothing to manage yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {events.map(({ event, activityCount }) => (
              <li
                key={event.year}
                className="panel flex flex-wrap items-center gap-4 p-4"
              >
                <Link
                  to="/events/$year"
                  params={{ year: event.year }}
                  className="display-tight text-3xl text-flag hover:underline"
                >
                  {event.year}
                </Link>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-bold">{event.name}</span>
                  <span className="text-sm text-ink-soft">
                    {event.participantIds.length} athletes ·{' '}
                    <span className="num">{activityCount}</span> activities
                  </span>
                </span>
                <label className="sr-only" htmlFor={`status-${event.year}`}>
                  Status for {event.name}
                </label>
                <select
                  id={`status-${event.year}`}
                  className="input max-w-44"
                  value={event.status}
                  onChange={(e) =>
                    setEventStatus.mutate({
                      year: event.year,
                      status: e.target.value as EventStatus,
                    })
                  }
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ClerkBackfill />
    </main>
  )
}

function ClerkBackfill() {
  const queryClient = useQueryClient()
  const { data: candidates, isPending, isError, error } = useQuery(clerkCandidatesQuery)

  const add = useMutation({
    mutationFn: (clerkUserId: string) => addClerkAthlete({ data: { clerkUserId } }),
    onSuccess: () => queryClient.invalidateQueries(),
  })

  return (
    <section aria-labelledby="roster-heading" className="mt-12">
      <h2 id="roster-heading" className="display-tight text-2xl">
        Backfill athletes
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">
        Pull people straight from Clerk so you can register them and record their
        results before they ever sign in. Their athlete card links up to their
        account automatically the day they log in.
      </p>

      {isPending ? (
        <p className="mt-4 text-ink-soft">Loading the Clerk directory…</p>
      ) : isError ? (
        <p role="alert" className="mt-4 rounded border-2 border-flag bg-flag/10 px-4 py-2 text-flag-deep">
          Couldn't reach Clerk: {(error as Error).message}
        </p>
      ) : candidates.length === 0 ? (
        <p className="mt-4 text-ink-soft">
          Everyone in Clerk already has an athlete profile.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {candidates.map((candidate) => {
            const adding = add.isPending && add.variables === candidate.id
            return (
              <li key={candidate.id} className="panel flex items-center gap-3 p-3">
                {candidate.imageUrl ? (
                  <img
                    src={candidate.imageUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full border-2 border-ink object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-paper"
                  >
                    🏅
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display font-bold">
                    {candidate.name}
                  </span>
                  {candidate.email ? (
                    <span className="block truncate text-sm text-ink-soft">
                      {candidate.email}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="btn btn-sm shrink-0"
                  disabled={adding}
                  onClick={() => add.mutate(candidate.id)}
                >
                  {adding ? 'Adding…' : 'Add'}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {add.isError ? (
        <p role="alert" className="mt-3 rounded border-2 border-flag bg-flag/10 px-4 py-2 text-flag-deep">
          {(add.error as Error).message}
        </p>
      ) : null}
    </section>
  )
}
