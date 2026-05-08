"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Calendar,
  Plus,
  MoreHorizontal,
  Clock,
  BookOpen,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Ban,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SessionStatus } from "@/lib/types"

type ApiSessionActivityPreview = {
  id: string
  order_index: number
  status: "pending" | "in_progress" | "completed" | "skipped"
  activity: {
    id: string
    name: string
  } | null
}

type ApiSessionRow = {
  id: string
  date: string
  start_time: string
  end_time: string
  status: SessionStatus
  notes: string | null
  topic_id: string | null
  topic: {
    id: string
    title: string
    level: "beginner" | "intermediate" | "advanced"
  } | null
  started_at: string | null
  completed_at: string | null
  current_activity_index: number | null
  created_at: string
  updated_at: string
  session_activities: ApiSessionActivityPreview[] | null
}

type ApiTopicOption = {
  id: string
  title: string
  level: "beginner" | "intermediate" | "advanced"
  is_archived: boolean
}

type ApiListResponse = {
  success?: boolean
  error?: string
  data?: ApiSessionRow[]
}

type ApiTopicsResponse = {
  success?: boolean
  error?: string
  data?: ApiTopicOption[]
}

type SessionViewModel = {
  id: string
  date: string
  startTime: string
  endTime: string
  status: SessionStatus
  notes: string
  topic: {
    id: string
    title: string
    level: "beginner" | "intermediate" | "advanced"
  } | null
  activities: {
    id: string
    name: string
    orderIndex: number
    status: "pending" | "in_progress" | "completed" | "skipped"
  }[]
}

const statusConfig: Record<
  SessionStatus,
  {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
    icon: React.ElementType
  }
> = {
  upcoming: { label: "A venir", variant: "default", icon: Clock },
  ongoing: { label: "En cours", variant: "secondary", icon: AlertCircle },
  completed: { label: "Terminee", variant: "outline", icon: CheckCircle },
  cancelled: { label: "Annulee", variant: "destructive", icon: XCircle },
}

function normalizeTime(value: string) {
  return value.slice(0, 5)
}

function mapSession(row: ApiSessionRow): SessionViewModel {
  return {
    id: row.id,
    date: row.date,
    startTime: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time),
    status: row.status,
    notes: row.notes ?? "",
    topic: row.topic
      ? {
          id: row.topic.id,
          title: row.topic.title,
          level: row.topic.level,
        }
      : null,
    activities: (row.session_activities ?? [])
      .map((item) => ({
        id: item.id,
        name: item.activity?.name ?? "Activite",
        orderIndex: item.order_index,
        status: item.status,
      }))
      .sort((a, b) => a.orderIndex - b.orderIndex),
  }
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T
}

function CreateSessionDialog({
  onCreate,
  topics,
  isSubmitting,
}: {
  onCreate: (payload: {
    date: string
    startTime: string
    endTime: string
    notes: string
    topicId: string | null
  }) => Promise<{ ok: boolean; error?: string }>
  topics: ApiTopicOption[]
  isSubmitting: boolean
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("18:00")
  const [endTime, setEndTime] = useState("20:00")
  const [notes, setNotes] = useState("")
  const [topicId, setTopicId] = useState("none")

  const reset = () => {
    setDate("")
    setStartTime("18:00")
    setEndTime("20:00")
    setNotes("")
    setTopicId("none")
    setError("")
  }

  const handleCreate = async () => {
    setError("")

    if (!date) {
      setError("La date est obligatoire.")
      return
    }

    const result = await onCreate({
      date,
      startTime,
      endTime,
      notes,
      topicId: topicId === "none" ? null : topicId,
    })

    if (!result.ok) {
      setError(result.error || "Creation impossible.")
      return
    }

    setOpen(false)
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          reset()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle seance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Creer une nouvelle seance</DialogTitle>
          <DialogDescription>
            Planifie une nouvelle seance pour la communaute.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="session-date">Date</Label>
            <Input
              id="session-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Heure de debut</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Heure de fin</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-notes">Notes (optionnel)</Label>
            <Textarea
              id="session-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Objectif, consignes, informations utiles..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-topic">Sujet de la seance (optionnel)</Label>
            <Select value={topicId} onValueChange={setTopicId}>
              <SelectTrigger id="session-topic">
                <SelectValue placeholder="Selectionner un sujet..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun sujet</SelectItem>
                {topics.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creation...
              </>
            ) : (
              "Creer la seance"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SessionCard({
  session,
  isCancelling,
  onCancel,
}: {
  session: SessionViewModel
  isCancelling: boolean
  onCancel: (id: string) => Promise<void>
}) {
  const sessionDate = new Date(`${session.date}T00:00:00`)
  const config = statusConfig[session.status]
  const StatusIcon = config.icon

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        <div className="flex w-20 flex-col items-center justify-center bg-primary/5 p-4">
          <span className="text-2xl font-bold text-primary">{sessionDate.getDate()}</span>
          <span className="text-xs uppercase text-primary/80">
            {sessionDate.toLocaleDateString("fr-FR", { month: "short" })}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            {sessionDate.toLocaleDateString("fr-FR", { weekday: "short" })}
          </span>
        </div>

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
              {session.topic ? (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  Sujet: <span className="font-medium text-foreground">{session.topic.title}</span>
                </p>
              ) : null}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isCancelling}>
                  {isCancelling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/sessions/${session.id}`}>Voir les details</Link>
                </DropdownMenuItem>
                {session.status === "upcoming" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => void onCancel(session.id)}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Annuler
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {session.activities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {session.activities.map((activity) => (
                <span
                  key={activity.id}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                >
                  <BookOpen className="h-3 w-3" />
                  {activity.name}
                </span>
              ))}
            </div>
          )}

          {session.notes && (
            <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
              {session.notes}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {session.activities.length} activite
                {session.activities.length > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function CalendarView({ sessions }: { sessions: SessionViewModel[] }) {
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

  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1)
  const paddingDays = Array.from({ length: adjustedFirstDay }, (_, index) => index)

  const sessionsInMonth = sessions.filter((session) => {
    const sessionDate = new Date(`${session.date}T00:00:00`)
    return (
      sessionDate.getMonth() === currentMonth.getMonth() &&
      sessionDate.getFullYear() === currentMonth.getFullYear()
    )
  })

  const getSessionsForDay = (day: number) => {
    return sessionsInMonth.filter((session) => {
      const sessionDate = new Date(`${session.date}T00:00:00`)
      return sessionDate.getDate() === day
    })
  }

  const previousMonth = () => {
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
            {currentMonth.toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={previousMonth}>
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

          {paddingDays.map((padding) => (
            <div key={`padding-${padding}`} className="p-2" />
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
  const [sessions, setSessions] = useState<SessionViewModel[]>([])
  const [availableTopics, setAvailableTopics] = useState<ApiTopicOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [cancellingSessionId, setCancellingSessionId] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage("")

    try {
      const [sessionsResponse, topicsResponse] = await Promise.all([
        fetch("/api/sessions?limit=100&page=1"),
        fetch("/api/topics?includeArchived=false&limit=100&page=1"),
      ])
      const sessionsPayload = await readJson<ApiListResponse>(sessionsResponse)
      const topicsPayload = await readJson<ApiTopicsResponse>(topicsResponse)

      if (!sessionsResponse.ok || !sessionsPayload.success) {
        setErrorMessage(sessionsPayload.error || "Chargement des seances impossible.")
        setSessions([])
        setAvailableTopics([])
        setIsLoading(false)
        return
      }

      setSessions((sessionsPayload.data ?? []).map(mapSession))
      if (topicsResponse.ok && topicsPayload.success) {
        setAvailableTopics((topicsPayload.data ?? []).filter((item) => !item.is_archived))
      } else {
        setAvailableTopics([])
      }
      setIsLoading(false)
    } catch {
      setErrorMessage("Impossible de joindre le serveur pour charger les seances.")
      setSessions([])
      setAvailableTopics([])
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSessions()
  }, [fetchSessions])

  const handleCreate = useCallback(
    async (payload: {
      date: string
      startTime: string
      endTime: string
      notes: string
      topicId: string | null
    }) => {
      setIsCreating(true)
      setErrorMessage("")
      setSuccessMessage("")

      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        const data = await readJson<{ success?: boolean; error?: string; data?: ApiSessionRow }>(
          response
        )

        if (!response.ok || !data.success || !data.data) {
          setIsCreating(false)
          return { ok: false as const, error: data.error || "Creation impossible." }
        }

        setSessions((previous) => [mapSession(data.data as ApiSessionRow), ...previous])
        setSuccessMessage("Seance creee avec succes.")
        setIsCreating(false)
        return { ok: true as const }
      } catch {
        setIsCreating(false)
        return {
          ok: false as const,
          error: "Impossible de joindre le serveur pour creer la seance.",
        }
      }
    },
    []
  )

  const handleCancel = useCallback(async (sessionId: string) => {
    setCancellingSessionId(sessionId)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      })

      const payload = await readJson<{ success?: boolean; error?: string; data?: ApiSessionRow }>(
        response
      )

      if (!response.ok || !payload.success || !payload.data) {
        setErrorMessage(payload.error || "Annulation impossible.")
        setCancellingSessionId(null)
        return
      }

      const updated = mapSession(payload.data)
      setSessions((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item))
      )
      setSuccessMessage("Seance annulee avec succes.")
      setCancellingSessionId(null)
    } catch {
      setErrorMessage("Impossible de joindre le serveur pour annuler la seance.")
      setCancellingSessionId(null)
    }
  }, [])

  const upcomingSessions = useMemo(
    () => sessions.filter((item) => item.status === "upcoming" || item.status === "ongoing"),
    [sessions]
  )

  const pastSessions = useMemo(
    () => sessions.filter((item) => item.status === "completed" || item.status === "cancelled"),
    [sessions]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Seances</h1>
          <p className="text-muted-foreground">Planifie et gere les seances de la communaute</p>
        </div>
        <CreateSessionDialog
          onCreate={handleCreate}
          topics={availableTopics}
          isSubmitting={isCreating}
        />
      </div>

      {errorMessage && (
        <Card className="border-destructive/40">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{errorMessage}</p>
          </CardContent>
        </Card>
      )}

      {successMessage && (
        <Card className="border-green-500/40">
          <CardContent className="p-4">
            <p className="text-sm text-green-700">{successMessage}</p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-10">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Chargement des seances...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
                  <p className="text-sm text-muted-foreground">Total seances</p>
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
                  <p className="text-sm text-muted-foreground">A venir</p>
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
                  <p className="text-sm text-muted-foreground">Terminees/annulees</p>
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
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Seances a venir</h2>
                {upcomingSessions.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {upcomingSessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        isCancelling={cancellingSessionId === session.id}
                        onCancel={handleCancel}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Calendar className="mb-4 h-12 w-12 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground">Aucune seance planifiee</p>
                      <p className="text-xs text-muted-foreground">
                        Cree une nouvelle seance pour commencer
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {pastSessions.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-foreground">Seances passees</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {pastSessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        isCancelling={cancellingSessionId === session.id}
                        onCancel={handleCancel}
                      />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="calendar">
              <CalendarView sessions={sessions} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
