import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Show, SignInButton } from '@clerk/tanstack-react-start'
import { homeQuery } from '~/lib/queries'
import { Podium } from '~/components/Podium'
import { Leaderboard } from '~/components/Leaderboard'
import { Waves } from '~/components/Waves'
import { OlympicRings } from '~/components/OlympicRings'

export const Route = createFileRoute('/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: HomePage,
})

function HomePage() {
  const { me } = Route.useRouteContext()
  const { data: home } = useSuspenseQuery(homeQuery)

  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:pt-20">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="max-w-3xl">
              <p className="font-serif text-xl italic text-sea sm:text-2xl">
                The official games of the archipelago
              </p>
              <h1 className="display-tight mt-3 text-[clamp(3.5rem,12vw,9rem)]">
                Hvaler
                <br />
                <span className="text-flag">Olympics</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
                One week. Questionable disciplines. Permanent records. Strokes are
                counted, seconds are timed, guesses are judged — and somebody walks
                away with eternal glory.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                {home ? (
                  <Link
                    to="/events/$year"
                    params={{ year: home.event.year }}
                    className="btn btn-primary"
                  >
                    {home.event.name}
                  </Link>
                ) : null}
                {me ? (
                  <Link to="/events" className="btn">
                    All games
                  </Link>
                ) : null}
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button type="button" className="btn btn-ink">
                      Join the games
                    </button>
                  </SignInButton>
                </Show>
              </div>
            </div>
            {/* event stamp */}
            <div
              aria-hidden="true"
              className="hidden rotate-6 select-none rounded-xl border-2 border-dashed border-ink bg-card p-6 text-center shadow-print md:block"
            >
              <OlympicRings className="mx-auto h-8 w-auto" />
              <p className="display-tight mt-3 text-5xl">{home?.event.year ?? '20??'}</p>
              <p className="font-serif italic text-ink-soft">Hvaler, Norway</p>
            </div>
          </div>
        </div>
        <Waves />
      </section>

      {home ? (
        <section className="mx-auto max-w-6xl px-6 py-14" aria-labelledby="standings-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="standings-heading" className="display-tight text-3xl sm:text-4xl">
              {home.event.name}
              <span className="ml-3 align-middle">
                <StatusTag status={home.event.status} />
              </span>
            </h2>
            <p className="num text-sm text-ink-soft">
              {home.scoredCount}/{home.activityCount} activities scored
            </p>
          </div>

          <div className="mt-10">
            <Podium rows={home.leaderboard} />
          </div>

          <div className="panel mt-10">
            <Leaderboard rows={home.leaderboard} />
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/events/$year"
              params={{ year: home.event.year }}
              className="btn btn-sm"
            >
              Full event &amp; activities →
            </Link>
          </div>
        </section>
      ) : me ? (
        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="display-tight text-4xl">No games yet</h2>
          <p className="mt-4 text-ink-soft">
            The torch hasn't been lit.{' '}
            {me.isAdmin
              ? 'Head to the admin page and create the first games.'
              : 'The olympic committee has yet to create the first games.'}
          </p>
        </section>
      ) : (
        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="display-tight text-4xl">Athletes only</h2>
          <p className="mt-4 text-ink-soft">
            Standings, activities and the record books are for the family. Sign in
            to enter the stadium.
          </p>
        </section>
      )}
    </main>
  )
}

export function StatusTag({ status }: { status: 'upcoming' | 'active' | 'completed' }) {
  const tone =
    status === 'active'
      ? 'bg-flag text-paper border-flag-deep'
      : status === 'completed'
        ? 'bg-paper-deep'
        : 'bg-card'
  return <span className={`tag ${tone}`}>{status}</span>
}
