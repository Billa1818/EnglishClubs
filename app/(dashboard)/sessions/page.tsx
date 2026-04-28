"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Calendar,
  Plus,
  MoreHorizontal,
  Clock,
  Users,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { sessions, activities } from "@/lib/mock-data"
import type { SessionStatus } from "@/lib/types"

const statusConfig: Record<SessionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  upcoming: { label: "À venir", variant: "default", icon: Clock },
  ongoing: { label: "En cours", variant: "secondary", icon: AlertCircle },
  completed: { label: "Terminée", variant: "outline", icon: CheckCircle },
  cancelled: { label: "Annulée", variant: "destructive", icon: XCircle },
}

function CreateSessionDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle séance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle séance</DialogTitle>
          <DialogDescription>
            Planifiez une nouvelle séance pour votre communauté.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Heure de début</Label>
              <Input id="start-time" type="time" defaultValue="18:00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Heure de fin</Label>
              <Input id="end-time" type="time" defaultValue="20:00" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="submit">Créer la séance</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SessionCard({ session }: { session: typeof sessions[0] }) {
  const sessionDate = new Date(session.date)
  const config = statusConfig[session.status]
  const StatusIcon = config.icon

  const declaredCount = session.attendees.filter(
    (a) => a.status === "declared" || a.status === "confirmed"
  ).length

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        {/* Date sidebar */}
        <div className="flex w-20 flex-col items-center justify-center bg-primary/5 p-4">
          <span className="text-2xl font-bold text-primary">{sessionDate.getDate()}</span>
          <span className="text-xs uppercase text-primary/80">
            {sessionDate.toLocaleDateString("fr-FR", { month: "short" })}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            {sessionDate.toLocaleDateString("fr-FR", { weekday: "short" })}
          </span>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={config.variant} className="gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {session.startTime} - {session.endTime}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/sessions/${session.id}`}>Voir les détails</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>Modifier</DropdownMenuItem>
                {session.status === "upcoming" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">Annuler</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Activities */}
          {session.activities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {session.activities.map((sa) => (
                <span
                  key={sa.id}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                >
                  <BookOpen className="h-3 w-3" />
                  {sa.activity.name}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{declaredCount} participants</span>
            </div>

            {session.attendees.length > 0 && (
              <div className="flex -space-x-2">
                {session.attendees.slice(0, 4).map((attendance) => (
                  <Avatar key={attendance.id} className="h-6 w-6 border-2 border-card">
                    <AvatarImage src={attendance.user.photoUrl} />
                    <AvatarFallback className="text-[10px]">
                      {attendance.user.firstName[0]}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {session.attendees.length > 4 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">
                    +{session.attendees.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate()

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay()

  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const paddingDays = Array.from({ length: adjustedFirstDay }, (_, i) => i)

  const sessionsInMonth = sessions.filter((session) => {
    const sessionDate = new Date(session.date)
    return (
      sessionDate.getMonth() === currentMonth.getMonth() &&
      sessionDate.getFullYear() === currentMonth.getFullYear()
    )
  })

  const getSessionsForDay = (day: number) => {
    return sessionsInMonth.filter((session) => {
      const sessionDate = new Date(session.date)
      return sessionDate.getDate() === day
    })
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {currentMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
            <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}

          {paddingDays.map((_, index) => (
            <div key={`padding-${index}`} className="p-2" />
          ))}

          {days.map((day) => {
            const daySessions = getSessionsForDay(day)
            const isToday =
              new Date().getDate() === day &&
              new Date().getMonth() === currentMonth.getMonth() &&
              new Date().getFullYear() === currentMonth.getFullYear()

            return (
              <div
                key={day}
                className={`min-h-16 rounded-lg border p-2 ${
                  isToday ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"
                }`}
              >
                <span
                  className={`text-sm ${isToday ? "font-bold text-primary" : "text-muted-foreground"}`}
                >
                  {day}
                </span>
                {daySessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="mt-1 block rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary truncate hover:bg-primary/20"
                  >
                    {session.startTime}
                  </Link>
                ))}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default function SessionsPage() {
  const upcomingSessions = sessions.filter((s) => s.status === "upcoming" || s.status === "ongoing")
  const pastSessions = sessions.filter((s) => s.status === "completed" || s.status === "cancelled")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Séances</h1>
          <p className="text-muted-foreground">Planifiez et gérez les séances de la communauté</p>
        </div>
        <CreateSessionDialog />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
              <p className="text-sm text-muted-foreground">Total séances</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-accent/10 p-2">
              <Clock className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{upcomingSessions.length}</p>
              <p className="text-sm text-muted-foreground">À venir</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-chart-3/10 p-2">
              <CheckCircle className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pastSessions.length}</p>
              <p className="text-sm text-muted-foreground">Terminées</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Liste</TabsTrigger>
          <TabsTrigger value="calendar">Calendrier</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          {/* Upcoming Sessions */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Séances à venir</h2>
            {upcomingSessions.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {upcomingSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-sm font-medium text-foreground">Aucune séance planifiée</p>
                  <p className="text-xs text-muted-foreground">
                    Créez une nouvelle séance pour commencer
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Past Sessions */}
          {pastSessions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Séances passées</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {pastSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
