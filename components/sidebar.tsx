"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, BarChart2, Car, Wrench, PanelLeftClose, PanelLeft, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/sidebar-context"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analytics", href: "/analytics", icon: BarChart2 },
  { label: "List Vehicles", href: "/vehicles", icon: Car },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isCollapsed, isMobileOpen, toggleCollapse, closeMobile } = useSidebar()

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-200/60 bg-[#f0f0f2] shadow-lg shadow-black/5 transition-all duration-300 dark:border-white/10 dark:bg-[#0e0e18]",
          // Desktop: collapsed or expanded
          isCollapsed ? "md:w-[68px]" : "md:w-60",
          // Mobile: slide in/out
          isMobileOpen
            ? "w-60 translate-x-0"
            : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo + collapse toggle */}
        <div className="flex h-16 items-center gap-2.5 border-b border-gray-200/60 px-4 dark:border-white/10">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/25">
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <span
            className={cn(
              "text-lg font-bold tracking-tight text-foreground transition-all duration-300",
              isCollapsed ? "hidden md:hidden" : "block"
            )}
          >
            AutoParts
          </span>

          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8 text-muted-foreground md:hidden"
            onClick={closeMobile}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Desktop collapse toggle — only when expanded */}
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto hidden h-8 w-8 text-muted-foreground hover:bg-white/10 hover:text-foreground dark:hover:bg-white/5 md:flex"
              onClick={toggleCollapse}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Expand button below logo — only when collapsed */}
        {isCollapsed && (
          <div className="hidden border-b border-gray-200/60 px-2 py-2 dark:border-white/10 md:block">
            <Button
              variant="ghost"
              size="icon"
              className="mx-auto flex h-8 w-8 text-muted-foreground hover:bg-white/10 hover:text-foreground dark:hover:bg-white/5"
              onClick={toggleCollapse}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/")

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isCollapsed && "md:justify-center md:px-0",
                  isActive
                    ? "bg-white/20 text-foreground shadow-sm dark:bg-white/10"
                    : "text-muted-foreground hover:bg-white/10 hover:text-foreground dark:hover:bg-white/5"
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-indigo-500 to-violet-600" />
                )}
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    isActive
                      ? "text-indigo-500 dark:text-indigo-400"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span
                  className={cn(
                    "transition-all duration-300",
                    isCollapsed ? "hidden md:hidden" : "block"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )

            // When collapsed on desktop, wrap with Tooltip
            if (isCollapsed) {
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="hidden md:block"
                    sideOffset={8}
                  >
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return <div key={item.href}>{linkContent}</div>
          })}
        </nav>



        {/* Footer - only when expanded */}
        {!isCollapsed && (
          <div className="border-t border-gray-200/60 px-5 py-4 dark:border-white/10 md:block">
            <p className="text-xs text-muted-foreground">© 2026 AutoParts</p>
          </div>
        )}
      </aside>
    </>
  )
}
