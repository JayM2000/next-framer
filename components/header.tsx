"use client"

import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Bell, Settings, LogIn, Sun, Moon, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/sidebar-context"
import { useEffect, useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { SignInButton, UserButton, useUser } from "@clerk/nextjs"
import { performDiagonalThemeSwitch, TRANSITION_LOCK_MS } from "@/lib/theme-transition"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/analytics": "Analytics",
  "/vehicles": "List Vehicles",
}

export function Header() {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const { isCollapsed, toggleMobile } = useSidebar()
  const { isSignedIn } = useUser()
  const [mounted, setMounted] = useState(false)
  const isAnimating = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = useCallback(() => {
    if (isAnimating.current) return
    isAnimating.current = true

    const nextTheme = resolvedTheme === "dark" ? "light" : "dark"
    performDiagonalThemeSwitch(nextTheme, setTheme)

    setTimeout(() => {
      isAnimating.current = false
    }, TRANSITION_LOCK_MS)
  }, [resolvedTheme, setTheme])

  const title = pageTitles[pathname] || "Dashboard"

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-gray-200/60 bg-[#f7f7f8] px-4 shadow-sm transition-all duration-300 dark:border-white/10 dark:bg-[#131320] sm:px-6",
        // Offset for sidebar width
        isCollapsed ? "md:left-[68px]" : "md:left-60",
        "left-0"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-white/15 hover:text-foreground dark:hover:bg-white/10 md:hidden"
          onClick={toggleMobile}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Page title */}
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h1>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-white/15 hover:text-foreground dark:hover:bg-white/10"
        >
          <Bell className="h-[18px] w-[18px]" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden h-9 w-9 rounded-lg text-muted-foreground hover:bg-white/15 hover:text-foreground dark:hover:bg-white/10 sm:flex"
        >
          <Settings className="h-[18px] w-[18px]" />
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-white/15 hover:text-foreground dark:hover:bg-white/10"
          onClick={toggleTheme}
        >
          {mounted ? (
            resolvedTheme === "dark" ? (
              <Sun className="h-[18px] w-[18px]" />
            ) : (
              <Moon className="h-[18px] w-[18px]" />
            )
          ) : (
            <Sun className="h-[18px] w-[18px]" />
          )}
        </Button>

        {/* Clerk auth — profile / sign-in */}
        {isSignedIn ? (
          <div className="ml-1">
            <UserButton />
          </div>
        ) : (
          <SignInButton mode="modal">
            <Button
              variant="ghost"
              className="ml-1 gap-2 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-3.5 py-2 text-sm font-medium text-white shadow-md shadow-indigo-500/25 hover:from-indigo-600 hover:to-violet-700 hover:text-white"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          </SignInButton>
        )}
      </div>
    </header>
  )
}
