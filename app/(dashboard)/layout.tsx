"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { AuthGuard } from "@/components/auth-guard"
import { SidebarProvider, useSidebar } from "@/components/sidebar-context"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar()

  return (
    <div className="glass-dot-bg h-screen overflow-hidden">
      <Sidebar />
      <Header />
      <main
        className={cn(
          "relative z-10 mt-16 h-[calc(100vh-4rem)] overflow-hidden p-4 transition-all duration-300 sm:p-6",
          isCollapsed ? "md:ml-[68px]" : "md:ml-60",
          "ml-0"
        )}
      >
        <AuthGuard>{children}</AuthGuard>
      </main>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <DashboardContent>{children}</DashboardContent>
      </SidebarProvider>
    </TooltipProvider>
  )
}
