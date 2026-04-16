"use client"

import { useUser } from "@clerk/nextjs"
import { SignInButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { LogIn, Lock, Shield } from "lucide-react"
import Image from "next/image"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser()

  // While Clerk is loading, show a subtle skeleton
  if (!isLoaded) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  // User is signed in — render the actual page content
  if (isSignedIn) {
    return <>{children}</>
  }

  // Not signed in — show the beautiful sign-in prompt
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="relative flex w-full max-w-lg flex-col items-center text-center">
        {/* Animated background glow */}
        <div className="absolute -top-20 h-72 w-72 animate-pulse rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/5" />
        <div className="absolute -top-10 right-0 h-48 w-48 animate-pulse rounded-full bg-violet-500/10 blur-3xl delay-700 dark:bg-violet-500/5" />

        {/* Illustration */}
        <div className="relative mb-8 animate-[float_6s_ease-in-out_infinite]">
          <div className="relative h-56 w-56 sm:h-64 sm:w-64">
            <Image
              src="/auth-illustration.png"
              alt="Sign in to access dashboard"
              fill
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>

          {/* Floating badge */}
          <div className="absolute -bottom-2 -right-2 flex h-12 w-12 animate-bounce items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
            <Lock className="h-5 w-5 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="relative space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-indigo-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
              Authentication Required
            </span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Sign in to continue
          </h2>

          <p className="mx-auto max-w-sm text-base text-muted-foreground">
            Access your dashboard, analytics, and vehicle inventory by signing
            in to your account.
          </p>

          {/* Sign in button */}
          <div className="pt-4">
            <SignInButton mode="modal">
              <Button
                size="lg"
                className="gap-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-8 py-6 text-base font-semibold text-white shadow-xl shadow-indigo-500/25 transition-all duration-300 hover:from-indigo-600 hover:to-violet-700 hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
              >
                <LogIn className="h-5 w-5" />
                Sign In to Your Account
              </Button>
            </SignInButton>
          </div>

          {/* Subtle footer */}
          <p className="pt-2 text-xs text-muted-foreground/60">
            Secure login powered by Clerk
          </p>
        </div>

        {/* Decorative dots */}
        <div className="absolute -left-10 top-1/2 hidden h-2 w-2 animate-ping rounded-full bg-indigo-400/50 sm:block" />
        <div className="absolute -right-8 top-1/3 hidden h-1.5 w-1.5 animate-ping rounded-full bg-violet-400/50 delay-500 sm:block" />
        <div className="absolute -left-4 top-1/4 hidden h-1 w-1 animate-ping rounded-full bg-indigo-300/40 delay-1000 sm:block" />
      </div>
    </div>
  )
}
