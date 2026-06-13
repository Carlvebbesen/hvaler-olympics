import * as React from 'react'
import { Link, createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createActivity, setParticipant } from '~/server/fns'
import { eventDetailQuery } from '~/lib/queries'
import { effectivePointsDistribution, parsePointsDistribution } from '~/lib/scoring'
import { DEFAULT_POINTS, KIND_DEFAULTS } from '~/lib/types'
import type { ActivityKind, ScoringDirection } from '~/lib/types'
import { Podium } from '~/components/Podium'
import { Leaderboard } from '~/components/Leaderboard'
import { Waves } from '~/components/Waves'
import { StatusTag } from '~/routes/index'

export const Route = createFileRoute('/events/$year/')({
  params: {
    parse: (params) => {
      const year = Number(params.year)
      if (!Number.isInteger(year)) throw notFound()
      return { year }
    },
    stringify: (params) => ({ year: String(params.year) }),
  },
  beforeLoad: ({ context }) => {
    if (!context.me) throw redirect({ href: '/sign-in' })
  },
  loader: async ({ context, params }) => {
    const detail = await context.queryClient.ensureQueryData(
      eventDetailQuery(params.year),
    )
    if (!detail) throw notFound()
  },
  component: EventPage,
})

function EventPage() {
  const { year } = Route.useParams()
  const { me } = Route.useRouteContext()
  const { data: detail } = useSuspenseQuery(eventDetailQuery(year))
  if (!detail) return null

  const { event, activities, profiles, leaderboard } = detail
  const isAdmin = me?.isAdmin ?? false

  return (
    <main>
      <section className="mx-auto max-w-6xl px-6 pt-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-serif text-xl italic text-sea">
              {event.location ?? 'Hvaler'} · <StatusTag status={event.status} />
            </p>
            <h1 className="display-tight mt-2 text-[clamp(2.8rem,8vw,5.5rem)]">
              {event.name}
            </h1>
            {event.motto ? (
              <p className="mt-2 font-serif text-2xl italic text-ink-soft">
                “{event.motto}”
              </p>
            ) : null}
          </div>
          <span aria-hidden="true" className="display-tight hidden rotate-3 text-8xl text-flag/20 sm:block">
            {event.year}
          </span>
        </div>
      </section>

      <Waves className="mt-8" />

      <section aria-labelledby="leaderboard-heading" className="mx-auto max-w-6xl px-6 py-12">
        <h2 id="leaderboard-heading" className="display-tight text-3xl">
          Standings
        </h2>
        <div className="mt-8">
          <Podium rows={leaderboard} />
        </div>
        <div className="panel mt-8">
          <Leaderboard rows={leaderboard} />
        </div>
      </section>

      <section aria-labelledby="activities-heading" className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="activities-heading" className="display-tight text-3xl">
            Activities
          </h2>
          <p className="num text-sm text-ink-soft">
            {activities.filter((a) => a.status === 'scored').length}/{activities.length} scored
          </p>
        </div>

        {activities.length === 0 ? (
          <p className="mt-6 text-ink-soft">
            No disciplines announced yet.{' '}
            {isAdmin ? 'Create the first one below.' : 'The committee is plotting.'}
          </p>
        ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activities.map((activity) => (
              <li key={activity.id}>
                <Link
                  to="/events/$year/activities/$activityId"
                  params={{ year, activityId: activity.id }}
                  className="panel group block h-full p-5 transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-lg font-bold group-hover:underline">
                      {activity.name}
                    </h3>
                    {activity.status === 'scored' ? (
                      <span className="tag bg-sea text-paper">scored</span>
                    ) : (
                      <span className="tag">open</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    {KIND_DEFAULTS[activity.kind].label}
                    {activity.isTeam ? ' · teams' : ''} ·{' '}
                    {activity.direction === 'lowest'
                      ? 'lowest wins'
                      : activity.direction === 'highest'
                        ? 'highest wins'
                        : 'closest wins'}
                  </p>
                  {(() => {
                    const dist = effectivePointsDistribution(activity)
                    return dist.length > 0 ? (
                      <p className="num mt-3 text-xs text-ink-soft">
                        {dist.slice(0, 4).join(' · ')}
                        {dist.length > 4 ? ' · …' : ''} pts
                      </p>
                    ) : (
                      <p className="mt-3 text-xs text-ink-soft">
                        points set once teams are drawn
                      </p>
                    )
                  })()}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {isAdmin ? <NewActivityForm year={year} /> : null}
      </section>

      <section aria-labelledby="athletes-heading" className="mx-auto max-w-6xl px-6 py-12">
        <h2 id="athletes-heading" className="display-tight text-3xl">
          Athletes
        </h2>
        {isAdmin ? (
          <AdminParticipants
            year={year}
            profiles={profiles}
            participantIds={event.participantIds}
          />
        ) : (
          <ul className="mt-6 flex flex-wrap gap-3">
            {event.participantIds.length === 0 ? (
              <li className="text-ink-soft">Nobody has been registered yet.</li>
            ) : (
              event.participantIds.map((id) => {
                const profile = profiles.find((p) => p.id === id)
                return (
                  <li key={id} className="tag py-1.5 text-sm">
                    <span aria-hidden="true">{profile?.emoji ?? '🏅'}</span>
                    {profile?.name ?? 'Unknown athlete'}
                  </li>
                )
              })
            )}
          </ul>
        )}
      </section>
    </main>
  )
}

function AdminParticipants({
  year,
  profiles,
  participantIds,
}: {
  year: number
  profiles: { id: string; name: string; emoji: string }[]
  participantIds: string[]
}) {
  const queryClient = useQueryClient()
  const toggle = useMutation({
    mutationFn: (data: { participantId: string; joined: boolean }) =>
      setParticipant({ data: { year, ...data } }),
    onSuccess: () => queryClient.invalidateQueries(),
  })

  return (
    <div className="mt-6">
      <p className="text-sm text-ink-soft">
        Tick everyone competing this year. Every signed-in profile shows up here.
      </p>
      <ul className="mt-4 flex flex-wrap gap-3">
        {profiles.map((profile) => {
          const joined = participantIds.includes(profile.id)
          return (
            <li key={profile.id}>
              <button
                type="button"
                aria-pressed={joined}
                disabled={toggle.isPending}
                onClick={() => toggle.mutate({ participantId: profile.id, joined: !joined })}
                className={`tag min-h-11 cursor-pointer py-1.5 text-sm transition-colors ${
                  joined ? 'bg-ink text-paper' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <span aria-hidden="true">{profile.emoji}</span>
                {profile.name}
                <span aria-hidden="true">{joined ? '✓' : '+'}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function NewActivityForm({ year }: { year: number }) {
  const queryClient = useQueryClient()
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [kind, setKind] = React.useState<ActivityKind>('time')
  const [direction, setDirection] = React.useState<ScoringDirection>('lowest')
  const [unit, setUnit] = React.useState('')
  const [target, setTarget] = React.useState('')
  const [isTeam, setIsTeam] = React.useState(false)
  const [points, setPoints] = React.useState(DEFAULT_POINTS.join(', '))
  const [formError, setFormError] = React.useState<string | null>(null)
  const detailsRef = React.useRef<HTMLDetailsElement>(null)

  const create = useMutation({
    mutationFn: () => {
      // Team activities derive their points from the number of teams.
      let pointsDistribution: number[] = []
      if (!isTeam) {
        const parsed = parsePointsDistribution(points)
        if (!parsed) throw new Error('Points must be numbers, e.g. “1000, 900, 800”')
        pointsDistribution = parsed
      }
      return createActivity({
        data: {
          year,
          name,
          description,
          kind,
          unit,
          direction,
          target: kind === 'guess' ? Number(target) : undefined,
          isTeam,
          pointsDistribution,
        },
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      setName('')
      setDescription('')
      setFormError(null)
      if (detailsRef.current) detailsRef.current.open = false
    },
    onError: (error) => setFormError((error as Error).message),
  })

  const pickKind = (next: ActivityKind) => {
    setKind(next)
    setDirection(KIND_DEFAULTS[next].direction)
  }

  // Direction only matters where it's genuinely ambiguous; the other kinds are fixed.
  const showDirection = kind === 'time' || kind === 'count' || kind === 'points'
  const showTarget = kind === 'guess' || (showDirection && direction === 'closest')
  const showUnit =
    !showTarget && (kind === 'count' || kind === 'points' || kind === 'rounds')

  return (
    <details ref={detailsRef} className="panel mt-8 p-6">
      <summary className="cursor-pointer font-display text-lg font-bold uppercase tracking-wide">
        + New activity
      </summary>
      <form
        className="mt-6 grid gap-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate()
        }}
      >
        <div className="sm:col-span-2">
          <label className="label" htmlFor="activity-name">
            Name
          </label>
          <input
            id="activity-name"
            className="input"
            required
            placeholder="Crab race, minigolf, blind rowing…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="label">What do we measure?</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(KIND_DEFAULTS) as ActivityKind[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={kind === option}
                onClick={() => pickKind(option)}
                className={`rounded-lg border-2 p-3 text-left transition-colors ${
                  kind === option ? 'border-flag bg-flag/10' : 'border-ink/30'
                }`}
              >
                <span className="block font-display font-bold">
                  {KIND_DEFAULTS[option].label}
                </span>
                <span className="block text-xs text-ink-soft">
                  {KIND_DEFAULTS[option].hint}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex min-h-11 items-center gap-3 font-display font-bold sm:col-span-2">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[#d94f1e]"
            checked={isTeam}
            onChange={(e) => setIsTeam(e.target.checked)}
          />
          Team activity
        </label>

        {showDirection ? (
          <div>
            <label className="label" htmlFor="activity-direction">
              Winner is
            </label>
            <select
              id="activity-direction"
              className="input"
              value={direction}
              onChange={(e) => setDirection(e.target.value as ScoringDirection)}
            >
              <option value="lowest">Lowest value</option>
              <option value="highest">Highest value</option>
              <option value="closest">Closest to target</option>
            </select>
          </div>
        ) : null}

        {showTarget ? (
          <div>
            <label className="label" htmlFor="activity-target">
              Target value
            </label>
            <input
              id="activity-target"
              className="input num"
              type="number"
              step="any"
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
        ) : null}

        {showUnit ? (
          <div>
            <label className="label" htmlFor="activity-unit">
              Unit <span className="font-normal normal-case text-ink-soft">(optional)</span>
            </label>
            <input
              id="activity-unit"
              className="input"
              placeholder={kind === 'rounds' ? 'rounds (optional)' : 'strokes, m, pts…'}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
        ) : null}

        {isTeam ? (
          <div className="sm:col-span-2">
            <p className="label">Points by rank</p>
            <p className="mt-1 text-sm text-ink-soft">
              Set automatically from the number of teams — 2 teams: 500 / 0, 3
              teams: 500 / 300 / 0, 4 teams: 600 / 400 / 200 / 0. Last place
              always gets 0.
            </p>
          </div>
        ) : (
          <div className="sm:col-span-2">
            <label className="label" htmlFor="activity-points">
              Points by rank
            </label>
            <input
              id="activity-points"
              className="input num"
              required
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
            <p className="mt-1 text-sm text-ink-soft">
              First number goes to 1st place, second to 2nd place, and so on.
              Ranks beyond the list get 0. Ties share a place and the next
              place is skipped.
            </p>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="label" htmlFor="activity-description">
            Rules <span className="font-normal normal-case text-ink-soft">(optional)</span>
          </label>
          <textarea
            id="activity-description"
            className="input min-h-20"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {formError ? (
          <p role="alert" className="rounded border-2 border-flag bg-flag/10 px-4 py-2 text-flag-deep sm:col-span-2">
            {formError}
          </p>
        ) : null}

        <div className="sm:col-span-2">
          <button type="submit" className="btn btn-primary" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create activity'}
          </button>
        </div>
      </form>
    </details>
  )
}
