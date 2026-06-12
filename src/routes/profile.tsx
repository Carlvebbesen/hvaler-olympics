import * as React from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateProfile } from '~/server/fns'
import { meQuery } from '~/lib/queries'

const EMOJI_CHOICES = ['🏊', '🚣', '🏃', '🤿', '🎯', '🏐', '🛶', '🏌️', '🎣', '⛵', '🦀', '🐋', '🏖️', '🍤', '🌊', '☀️']

export const Route = createFileRoute('/profile')({
  beforeLoad: ({ context }) => {
    if (!context.me) throw redirect({ href: '/sign-in' })
  },
  component: ProfilePage,
})

function ProfilePage() {
  const { me } = Route.useRouteContext()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [name, setName] = React.useState(me?.name ?? '')
  const [emoji, setEmoji] = React.useState(me?.emoji ?? '🏅')
  const [saved, setSaved] = React.useState(false)

  const mutation = useMutation({
    mutationFn: (data: { name: string; emoji: string }) => updateProfile({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meQuery.queryKey })
      await router.invalidate()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  if (!me) return null

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <p className="font-serif text-xl italic text-sea">Athlete licence</p>
      <h1 className="display-tight mt-2 text-5xl">Your profile</h1>

      <form
        className="panel mt-10 space-y-6 p-6 sm:p-8"
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate({ name, emoji })
        }}
      >
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-paper text-4xl shadow-print-sm" aria-hidden="true">
            {emoji}
          </span>
          <div>
            <p className="font-display text-xl font-bold">{name || '—'}</p>
            <p className="text-sm text-ink-soft">
              {me.isAdmin ? 'Olympic committee (admin)' : 'Registered athlete'}
            </p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="profile-name">
            Display name
          </label>
          <input
            id="profile-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={60}
            autoComplete="name"
          />
          <p className="mt-1 text-sm text-ink-soft">
            This is the name carved into the record books.
          </p>
        </div>

        <fieldset>
          <legend className="label">Spirit animal</legend>
          <div className="flex flex-wrap gap-2">
            {EMOJI_CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => setEmoji(choice)}
                aria-pressed={emoji === choice}
                aria-label={`Choose ${choice} as your emblem`}
                className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-xl transition-transform hover:scale-110 ${
                  emoji === choice
                    ? 'border-flag bg-flag/10 shadow-print-sm'
                    : 'border-ink/30 bg-card'
                }`}
              >
                {choice}
              </button>
            ))}
          </div>
        </fieldset>

        {mutation.isError ? (
          <p role="alert" className="rounded border-2 border-flag bg-flag/10 px-4 py-2 text-flag-deep">
            {(mutation.error as Error).message}
          </p>
        ) : null}

        <div className="flex items-center gap-4">
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save profile'}
          </button>
          <span aria-live="polite" className="text-sm font-bold text-sea">
            {saved ? '✓ Saved' : ''}
          </span>
        </div>
      </form>
    </main>
  )
}
