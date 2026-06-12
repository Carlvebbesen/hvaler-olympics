/// <reference types="vite/client" />
import * as React from 'react'
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import {
  ClerkProvider,
  Show,
  SignInButton,
  UserButton,
} from '@clerk/tanstack-react-start'
import type { QueryClient } from '@tanstack/react-query'
import { meQuery } from '~/lib/queries'
import { OlympicRings } from '~/components/OlympicRings'
import appCss from '~/styles/app.css?url'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    return { me }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Hvaler Olympics' },
      {
        name: 'description',
        content:
          'The official games of the archipelago. Profiles, activities, points and eternal glory.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Familjen+Grotesk:ital,wght@0,400..700;1,400..700&family=Instrument+Serif:ital@0;1&family=Spline+Sans+Mono:wght@400..700&display=swap',
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <p className="display-tight text-6xl">Disqualified</p>
      <p className="mt-4 text-ink-soft">That page never made it to the starting line.</p>
      <Link to="/" className="btn btn-primary mt-8">
        Back to the games
      </Link>
    </main>
  ),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { me } = Route.useRouteContext()

  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      signInUrl="/sign-in"
      appearance={{
        variables: {
          colorPrimary: '#d94f1e',
          colorForeground: '#1d2b49',
          fontFamily: "'Familjen Grotesk', sans-serif",
          borderRadius: '0.5rem',
        },
      }}
    >
      <html lang="en">
        <head>
          <HeadContent />
        </head>
        <body>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
          >
            Skip to content
          </a>
          <header className="border-b-2 border-ink bg-card/80 backdrop-blur-sm">
            <nav
              aria-label="Main"
              className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6"
            >
              <Link to="/" className="flex items-center gap-3" aria-label="Hvaler Olympics home">
                <OlympicRings className="h-6 w-auto" />
                <span className="display-tight text-xl leading-none">
                  Hvaler
                  <span className="text-flag"> Olympics</span>
                </span>
              </Link>
              <div className="ml-auto flex items-center gap-1 sm:gap-2">
                {me ? <NavLink to="/events" label="Games" /> : null}
                {me?.isAdmin ? <NavLink to="/admin" label="Admin" /> : null}
                <Show when="signed-in">
                  <NavLink to="/profile" label="Profile" />
                  <span className="ml-2 flex items-center">
                    <UserButton />
                  </span>
                </Show>
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button type="button" className="btn btn-primary btn-sm ml-2">
                      Sign in
                    </button>
                  </SignInButton>
                </Show>
              </div>
            </nav>
          </header>
          <div id="main">{children}</div>
          <footer className="mt-24 border-t-2 border-ink">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-ink-soft">
              <span className="font-serif italic text-base">
                Citius, Altius, Hvalius.
              </span>
              <span className="num">EST. on the dock · Hvaler, Norway</span>
            </div>
          </footer>
          <Scripts />
        </body>
      </html>
    </ClerkProvider>
  )
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center rounded-full px-3 font-display text-sm font-bold uppercase tracking-wide hover:bg-paper-deep"
      activeProps={{ className: 'bg-ink text-paper hover:bg-ink' }}
    >
      {label}
    </Link>
  )
}
