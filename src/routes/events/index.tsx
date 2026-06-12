import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { eventsQuery } from '~/lib/queries'
import { StatusTag } from '~/routes/index'

export const Route = createFileRoute('/events/')({
  beforeLoad: ({ context }) => {
    if (!context.me) throw redirect({ href: '/sign-in' })
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQuery),
  component: EventsPage,
})

function EventsPage() {
  const { data: events } = useSuspenseQuery(eventsQuery)
  const { me } = Route.useRouteContext()

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <p className="font-serif text-xl italic text-sea">The record books</p>
      <h1 className="display-tight mt-2 text-5xl sm:text-6xl">All games</h1>

      {events.length === 0 ? (
        <div className="panel mt-10 p-10 text-center">
          <p className="text-lg text-ink-soft">No games on record yet.</p>
          {me?.isAdmin ? (
            <Link to="/admin" className="btn btn-primary mt-6">
              Create the first games
            </Link>
          ) : null}
        </div>
      ) : (
        <ol className="mt-10 space-y-6">
          {events.map(({ event, activityCount }) => (
            <li key={event.year}>
              <Link
                to="/events/$year"
                params={{ year: event.year }}
                className="panel group flex flex-wrap items-center gap-x-8 gap-y-3 p-6 transition-transform hover:-translate-y-0.5"
              >
                <span className="display-tight text-5xl text-flag sm:text-6xl">
                  {event.year}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-xl font-bold group-hover:underline">
                    {event.name}
                  </span>
                  <span className="block text-sm text-ink-soft">
                    {event.motto ? <em className="font-serif">“{event.motto}” · </em> : null}
                    {event.participantIds.length} athletes ·{' '}
                    <span className="num">{activityCount}</span> activities
                    {event.location ? ` · ${event.location}` : ''}
                  </span>
                </span>
                <StatusTag status={event.status} />
              </Link>
            </li>
          ))}
        </ol>
      )}

      {me?.isAdmin && events.length > 0 ? (
        <div className="mt-10 text-center">
          <Link to="/admin" className="btn">
            New games / backfill a past year
          </Link>
        </div>
      ) : null}
    </main>
  )
}
