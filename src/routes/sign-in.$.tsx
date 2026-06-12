import { createFileRoute } from '@tanstack/react-router'
import { SignIn } from '@clerk/tanstack-react-start'

export const Route = createFileRoute('/sign-in/$')({
  component: SignInPage,
})

function SignInPage() {
  return (
    <main className="mx-auto flex max-w-6xl justify-center px-6 py-16">
      <div>
        <h1 className="display-tight mb-8 text-center text-4xl">
          Report to the <span className="text-flag">starting line</span>
        </h1>
        <SignIn routing="path" path="/sign-in" />
      </div>
    </main>
  )
}
