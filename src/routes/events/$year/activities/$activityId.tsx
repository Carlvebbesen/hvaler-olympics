import * as React from 'react'
import {
  Link,
  createFileRoute,
  notFound,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { deleteActivity, saveResults, saveTeams, setOptOut } from '~/server/fns'
import { activityDetailQuery } from '~/lib/queries'
import {
  effectivePointsDistribution,
  formatTime,
  formatValue,
  parseValue,
} from '~/lib/scoring'
import { KIND_DEFAULTS } from '~/lib/types'
import type { Activity, Profile, Team } from '~/lib/types'

export const Route = createFileRoute('/events/$year/activities/$activityId')({
  params: {
    parse: (params) => {
      const year = Number(params.year)
      if (!Number.isInteger(year)) throw notFound()
      return { year, activityId: params.activityId }
    },
    stringify: (params) => ({
      year: String(params.year),
      activityId: params.activityId,
    }),
  },
  beforeLoad: ({ context }) => {
    if (!context.me) throw redirect({ href: '/sign-in' })
  },
  loader: async ({ context, params }) => {
    const detail = await context.queryClient.ensureQueryData(
      activityDetailQuery(params.year, params.activityId),
    )
    if (!detail) throw notFound()
  },
  component: ActivityPage,
})

function ActivityPage() {
  const { year, activityId } = Route.useParams()
  const { me } = Route.useRouteContext()
  const { data: detail } = useSuspenseQuery(activityDetailQuery(year, activityId))
  if (!detail) return null

  const { activity, event, profiles, ranked } = detail
  const isAdmin = me?.isAdmin ?? false
  const medals = ['🥇', '🥈', '🥉']
  const pointsByRank = effectivePointsDistribution(activity, event.pointsDistribution)

  const subjectName = (subjectId: string) => {
    if (activity.isTeam) {
      return activity.teams.find((t) => t.id === subjectId)?.name ?? 'Unknown team'
    }
    const profile = profiles.find((p) => p.id === subjectId)
    return profile ? `${profile.emoji} ${profile.name}` : 'Unknown athlete'
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link
        to="/events/$year"
        params={{ year }}
        className="font-display text-sm font-bold uppercase tracking-wide text-sea hover:underline"
      >
        ← {event.name}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display-tight text-4xl sm:text-6xl">{activity.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="tag">{KIND_DEFAULTS[activity.kind].label}</span>
            <span className="tag">
              {activity.direction === 'closest'
                ? `closest to ${activity.target}`
                : `${activity.direction} wins`}
            </span>
            {activity.isTeam ? <span className="tag">team event</span> : null}
            <span className={`tag ${activity.status === 'scored' ? 'bg-sea text-paper' : ''}`}>
              {activity.status}
            </span>
          </div>
          {activity.description ? (
            <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
              {activity.description}
            </p>
          ) : null}
        </div>
      </div>

      <section aria-labelledby="points-heading" className="mt-8">
        <h2 id="points-heading" className="label">
          Points by rank
        </h2>
        {pointsByRank.length > 0 ? (
          <>
            <ol className="flex flex-wrap gap-2">
              {pointsByRank.map((points, index) => (
                <li key={index} className="panel px-3 py-2 text-center" style={{ boxShadow: 'var(--shadow-print-sm)' }}>
                  <span className="block text-xs text-ink-soft">
                    {medals[index] ?? `${index + 1}.`}
                  </span>
                  <span className="num font-bold">{points}</span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-sm text-ink-soft">
              {activity.isTeam
                ? 'Team points come from the number of teams.'
                : 'Points are set once for the whole Olympics, not per activity — admins change them in the event’s Olympics settings.'}
            </p>
          </>
        ) : (
          <p className="text-ink-soft">
            Points are set from the number of teams — draw the teams below to see them.
          </p>
        )}
      </section>

      {ranked.length > 0 ? (
        <section aria-labelledby="results-heading" className="mt-10">
          <h2 id="results-heading" className="display-tight text-2xl">
            Results
          </h2>
          <div className="panel mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="px-2 py-2 font-display text-xs font-bold uppercase tracking-wider sm:px-4">#</th>
                  <th className="px-2 py-2 font-display text-xs font-bold uppercase tracking-wider sm:px-4">
                    {activity.isTeam ? 'Team' : 'Athlete'}
                  </th>
                  <th className="px-2 py-2 font-display text-xs font-bold uppercase tracking-wider sm:px-4">Result</th>
                  <th className="px-2 py-2 font-display text-xs font-bold uppercase tracking-wider sm:px-4">Points</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((row) => (
                  <tr key={row.subjectId} className="border-b border-ink/15">
                    <td className="num px-2 py-3 font-bold sm:px-4">
                      <span aria-hidden="true">{medals[row.rank - 1] ?? row.rank}</span>
                      <span className="sr-only">Rank {row.rank}</span>
                    </td>
                    <td className="px-2 py-3 font-display font-bold sm:px-4">
                      {subjectName(row.subjectId)}
                      {activity.isTeam ? (
                        <span className="block text-xs font-normal text-ink-soft">
                          {row.memberIds
                            .map((id) => profiles.find((p) => p.id === id)?.name)
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      ) : null}
                    </td>
                    <td className="num px-2 py-3 sm:px-4">{formatValue(activity, row.value)}</td>
                    <td className="num px-2 py-3 text-lg font-bold text-flag sm:px-4">
                      {activity.status === 'scored' ? row.points : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activity.status !== 'scored' ? (
            <p className="mt-2 text-sm text-ink-soft">
              Draft results — points are handed out once the activity is marked as scored.
            </p>
          ) : null}
        </section>
      ) : (
        <p className="mt-10 text-ink-soft">No results recorded yet.</p>
      )}

      {!activity.isTeam && (activity.optOuts?.length ?? 0) > 0 ? (
        <section aria-labelledby="optouts-heading" className="mt-8">
          <h2 id="optouts-heading" className="label">
            Sitting this one out
          </h2>
          <ul className="flex flex-wrap gap-2">
            {(activity.optOuts ?? []).map((id) => {
              const profile = profiles.find((p) => p.id === id)
              return (
                <li key={id} className="tag py-1.5 opacity-70">
                  <span aria-hidden="true">{profile?.emoji ?? '🏅'}</span>
                  {profile?.name ?? 'Unknown athlete'}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {isAdmin ? (
        <AdminZone activity={activity} profiles={profiles} eventParticipantIds={event.participantIds} />
      ) : null}
    </main>
  )
}

// ---------- Admin tools ----------

function AdminZone({
  activity,
  profiles,
  eventParticipantIds,
}: {
  activity: Activity
  profiles: Profile[]
  eventParticipantIds: string[]
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const remove = useMutation({
    mutationFn: () =>
      deleteActivity({ data: { year: activity.year, activityId: activity.id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      navigate({ to: '/events/$year', params: { year: activity.year } })
    },
  })

  return (
    <section aria-labelledby="admin-heading" className="mt-14 border-t-2 border-dashed border-ink pt-8">
      <h2 id="admin-heading" className="display-tight text-2xl">
        Committee zone
      </h2>

      {activity.isTeam ? <TeamEditor activity={activity} profiles={profiles} eventParticipantIds={eventParticipantIds} /> : null}

      <ResultsEditor activity={activity} profiles={profiles} eventParticipantIds={eventParticipantIds} />

      <div className="mt-10">
        <button
          type="button"
          className="btn btn-sm border-flag text-flag-deep"
          disabled={remove.isPending}
          onClick={() => {
            if (window.confirm(`Delete “${activity.name}” and all its results? This cannot be undone.`)) {
              remove.mutate()
            }
          }}
        >
          Delete activity
        </button>
      </div>
    </section>
  )
}

function TeamEditor({
  activity,
  profiles,
  eventParticipantIds,
}: {
  activity: Activity
  profiles: Profile[]
  eventParticipantIds: string[]
}) {
  const queryClient = useQueryClient()
  const [teams, setTeams] = React.useState<Team[]>(activity.teams)
  const participants = profiles.filter((p) => eventParticipantIds.includes(p.id))

  const save = useMutation({
    mutationFn: () =>
      saveTeams({ data: { year: activity.year, activityId: activity.id, teams } }),
    onSuccess: () => queryClient.invalidateQueries(),
  })

  const updateTeam = (index: number, patch: Partial<Team>) =>
    setTeams((prev) => prev.map((team, i) => (i === index ? { ...team, ...patch } : team)))

  const toggleMember = (index: number, memberId: string) =>
    setTeams((prev) =>
      prev.map((team, i) => {
        if (i !== index) return team
        const members = new Set(team.memberIds)
        if (members.has(memberId)) members.delete(memberId)
        else members.add(memberId)
        return { ...team, memberIds: [...members] }
      }),
    )

  return (
    <div className="mt-6">
      <h3 className="label">Teams</h3>
      <div className="space-y-4">
        {teams.map((team, index) => (
          <div key={team.id || index} className="panel p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="sr-only" htmlFor={`team-name-${index}`}>
                Team name
              </label>
              <input
                id={`team-name-${index}`}
                className="input max-w-60"
                placeholder="Team name"
                value={team.name}
                onChange={(e) => updateTeam(index, { name: e.target.value })}
              />
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setTeams((prev) => prev.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {participants.map((profile) => {
                const selected = team.memberIds.includes(profile.id)
                return (
                  <button
                    key={profile.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleMember(index, profile.id)}
                    className={`tag min-h-11 cursor-pointer ${selected ? 'bg-ink text-paper' : 'opacity-60 hover:opacity-100'}`}
                  >
                    <span aria-hidden="true">{profile.emoji}</span>
                    {profile.name}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() =>
            setTeams((prev) => [
              ...prev,
              { id: '', name: `Team ${prev.length + 1}`, memberIds: [] },
            ])
          }
        >
          + Add team
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Saving…' : 'Save teams'}
        </button>
      </div>
      {save.isError ? (
        <p role="alert" className="mt-3 rounded border-2 border-flag bg-flag/10 px-4 py-2 text-flag-deep">
          {(save.error as Error).message}
        </p>
      ) : null}
    </div>
  )
}

function ResultsEditor({
  activity,
  profiles,
  eventParticipantIds,
}: {
  activity: Activity
  profiles: Profile[]
  eventParticipantIds: string[]
}) {
  const queryClient = useQueryClient()

  const subjects: { id: string; label: string }[] = activity.isTeam
    ? activity.teams.map((team) => ({ id: team.id, label: team.name }))
    : profiles
        .filter((p) => eventParticipantIds.includes(p.id))
        .map((p) => ({ id: p.id, label: `${p.emoji} ${p.name}` }))

  const [values, setValues] = React.useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const result of activity.results) {
      // Edit the raw value: mm:ss for times, plain number for everything else.
      initial[result.subjectId] =
        activity.kind === 'time' ? formatTime(result.value) : String(result.value)
    }
    return initial
  })
  const [markScored, setMarkScored] = React.useState(activity.status === 'scored')
  const [error, setError] = React.useState<string | null>(null)

  const optOuts = new Set(activity.optOuts ?? [])

  const toggleOptOut = useMutation({
    mutationFn: (data: { participantId: string; optedOut: boolean }) =>
      setOptOut({
        data: { year: activity.year, activityId: activity.id, ...data },
      }),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (err) => setError((err as Error).message),
  })

  const save = useMutation({
    mutationFn: () => {
      const results = []
      for (const subject of subjects) {
        if (!activity.isTeam && optOuts.has(subject.id)) continue
        const raw = values[subject.id]?.trim()
        if (!raw) continue
        const value = parseValue(activity.kind, raw)
        if (value === null) {
          throw new Error(`Couldn't read “${raw}” for ${subject.label}`)
        }
        results.push({ subjectId: subject.id, value })
      }
      return saveResults({
        data: { year: activity.year, activityId: activity.id, results, markScored },
      })
    },
    onSuccess: async () => {
      setError(null)
      await queryClient.invalidateQueries()
    },
    onError: (err) => setError((err as Error).message),
  })

  if (subjects.length === 0) {
    return (
      <p className="mt-6 text-ink-soft">
        {activity.isTeam
          ? 'Create teams above before entering results.'
          : 'Add athletes to this event before entering results.'}
      </p>
    )
  }

  return (
    <form
      className="mt-8"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <h3 className="label">Enter results</h3>
      <p className="mb-3 text-sm text-ink-soft">
        {KIND_DEFAULTS[activity.kind].hint}. Leave blank for no-shows
        {activity.isTeam ? '' : ', or mark athletes as sitting out'}.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {subjects.map((subject) => {
          const sitsOut = !activity.isTeam && optOuts.has(subject.id)
          return (
            <div key={subject.id} className="flex items-center gap-2">
              <label
                htmlFor={`result-${subject.id}`}
                className={`min-w-0 flex-1 truncate font-display font-bold ${sitsOut ? 'opacity-50 line-through' : ''}`}
              >
                {subject.label}
              </label>
              {sitsOut ? (
                <span className="tag opacity-70">sitting out</span>
              ) : (
                <input
                  id={`result-${subject.id}`}
                  className="input num max-w-36"
                  inputMode="decimal"
                  placeholder={
                    activity.kind === 'time'
                      ? '1:23.4'
                      : activity.kind === 'rank'
                        ? '1'
                        : '0'
                  }
                  value={values[subject.id] ?? ''}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [subject.id]: e.target.value }))
                  }
                />
              )}
              {!activity.isTeam ? (
                <button
                  type="button"
                  className="btn btn-sm shrink-0"
                  disabled={toggleOptOut.isPending}
                  aria-pressed={sitsOut}
                  aria-label={
                    sitsOut
                      ? `Put ${subject.label} back in the activity`
                      : `Mark ${subject.label} as sitting out`
                  }
                  onClick={() =>
                    toggleOptOut.mutate({
                      participantId: subject.id,
                      optedOut: !sitsOut,
                    })
                  }
                >
                  {sitsOut ? 'Re-enter' : 'Sits out'}
                </button>
              ) : null}
            </div>
          )
        })}
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded border-2 border-flag bg-flag/10 px-4 py-2 text-flag-deep">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-5">
        <label className="flex min-h-11 items-center gap-2 font-display font-bold">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[#d94f1e]"
            checked={markScored}
            onChange={(e) => setMarkScored(e.target.checked)}
          />
          Mark as scored (hands out points)
        </label>
        <button type="submit" className="btn btn-primary" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save results'}
        </button>
      </div>
    </form>
  )
}
