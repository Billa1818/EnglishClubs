"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Calendar,
  ClipboardCheck,
  Clock,
  GraduationCap,
  Bell,
  User,
  Menu,
  LogOut,
  ChevronDown,
  ArrowRightLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/lib/auth-context"
import { Spinner } from "@/components/ui/spinner"

// Navigation specifique aux membres (sans acces admin)
const memberNavigation = [
  { name: "Mon Espace", href: "/member", icon: LayoutDashboard },
  { name: "Seances", href: "/member/sessions", icon: Calendar },
  { name: "Ma Presence", href: "/member/attendance", icon: ClipboardCheck },
  { name: "Mes Absences", href: "/member/absences", icon: Clock },
  { name: "FreeCodeCamp", href: "/member/freecodecamp", icon: GraduationCap },
]

function MemberSidebar({
  className,
  onNavigate,
  unreadNotifications,
}: {
  className?: string
  onNavigate?: () => void
  unreadNotifications: number
}) {
  const pathname = usePathname()

  return (
    <div className={cn("flex h-full flex-col bg-sidebar text-sidebar-foreground", className)}>
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          EC
        </div>
        <span className="text-lg font-semibold">English Club</span>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {memberNavigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/member" && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/member/notifications"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/member/notifications"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <Bell className="h-5 w-5 flex-shrink-0" />
          Notifications
          {unreadNotifications > 0 && (
            <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1.5 text-xs">
              {unreadNotifications}
            </Badge>
          )}
        </Link>
      </div>
    </div>
  )
}

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const pathname = usePathname()
  const { user, logout, isLoading, isAdmin } = useAuth()

  const refreshUnreadNotifications = useCallback(async () => {
    if (!user?.id) {
      setUnreadNotifications(0)
      return
    }

    try {
      const response = await fetch("/api/notifications?unreadOnly=true&page=1&limit=1")
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean
        pagination?: {
          total?: number
        }
        stats?: {
          unreadCount?: number
        }
      }

      if (!response.ok || !payload.success) {
        setUnreadNotifications(0)
        return
      }

      setUnreadNotifications(
        payload.pagination?.total ?? payload.stats?.unreadCount ?? 0
      )
    } catch {
      setUnreadNotifications(0)
    }
  }, [user?.id])

  useEffect(() => {
    void refreshUnreadNotifications()
  }, [refreshUnreadNotifications, pathname])

  useEffect(() => {
    const handleNotificationsChanged = () => {
      void refreshUnreadNotifications()
    }

    window.addEventListener(
      "notifications:changed",
      handleNotificationsChanged as EventListener
    )

    return () => {
      window.removeEventListener(
        "notifications:changed",
        handleNotificationsChanged as EventListener
      )
    }
  }, [refreshUnreadNotifications])

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user) {
    return null // Will redirect via auth context
  }

  const currentPageLabel =
    memberNavigation.find(
      (item) =>
        pathname === item.href ||
        (item.href !== "/member" && pathname?.startsWith(item.href))
    )?.name ?? "Espace Membre"

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 lg:block">
        <MemberSidebar unreadNotifications={unreadNotifications} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <MemberSidebar
            unreadNotifications={unreadNotifications}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Ouvrir le menu</span>
                </Button>
              </SheetTrigger>
            </Sheet>
            <div className="hidden lg:block">
              <h1 className="text-lg font-semibold text-foreground">
                Bienvenue, {user.firstName}
              </h1>
              <p className="text-sm text-muted-foreground">{currentPageLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin ? (
              <Button variant="outline" size="sm" asChild className="hidden md:inline-flex">
                <Link href="/dashboard">
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Espace admin
                </Link>
              </Button>
            ) : null}

            <Link href="/member/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoUrl} alt={user.firstName} />
                    <AvatarFallback>
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium md:block">
                    {user.firstName} {user.lastName}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    Niveau: {user.englishLevel === "beginner" ? "Debutant" : 
                             user.englishLevel === "intermediate" ? "Intermediaire" : "Avance"}
                  </Badge>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/member/profile">
                    <User className="mr-2 h-4 w-4" />
                    Mon Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Deconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
