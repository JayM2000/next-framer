"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"

type SidebarContextType = {
  isCollapsed: boolean
  isMobileOpen: boolean
  toggleCollapse: () => void
  toggleMobile: () => void
  closeMobile: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Auto-collapse on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsMobileOpen(false)
      } else if (window.innerWidth < 1024) {
        setIsCollapsed(true)
      }
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const toggleCollapse = useCallback(() => setIsCollapsed((p) => !p), [])
  const toggleMobile = useCallback(() => setIsMobileOpen((p) => !p), [])
  const closeMobile = useCallback(() => setIsMobileOpen(false), [])

  return (
    <SidebarContext.Provider
      value={{ isCollapsed, isMobileOpen, toggleCollapse, toggleMobile, closeMobile }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider")
  return ctx
}
