"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  BookOpen,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth-context"

type SessionRow = {
  id: string
  date: string
  start_time: string
  end_time: string
  status: "upcoming" | "ongoing" | "completed" | "cancelled"
}

type AttendanceHistoryRow = {
  id: string
  session_id: string
  status: "declared" | "confirmed" | "absent" | "excused"
}

type SessionDetailRow = {
  id: string
  session_activities: Array<{
    id: string
    activity: {
      id: string
      name: string
    } | null
  }> | null
}

function parseApiError(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error
  }
  return fallback
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(parseApiError(payload, `Echec de chargement: ${url}`))
  }
  return payload as T
}

function getStatusBadge(status: string | undefined) {
  switch (status) {
    case "declared":
      return (
        <Badge variant="outline" className="bg-accent/10 text-accent">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Inscrit
        </Badge>
      )
    case "confirmed":
      return (
        <Badge className="bg-accent text-accent-foreground">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Present
        </Badge>
      )
    case "absent":
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Absent
        </Badge>
      )
    case "excused":
      return (
        <Badge variant="secondary">
          <AlertCircle className="mr-1 h-3 w-3" />
          Excuse
        </Badge>
      )
    default:
      return null
  }
}

export default function MemberSessionsPage() {
  const { member, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState("upcoming")
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [attendances, setAttendances] = useState<AttendanceHistoryRow[]>([])
  const [detailsBySessionId, setDetailsBySessionId] = useState<Record<string, SessionDetailRow>>(
    {}
  )
  const [error, setError] = useState<string | null>(null)
  const [isPageLoading, setIsPageLoading] = useState(true)

  useEffect(() => {
    if (!member?.id) {
      return
    }

    let isMounted = true

    const loadData = async () => {
      setIsPageLoading(true)
      setError(null)

      try {
        const [sessionsResponse, attendancesResponse] = await Promise.all([
          fetchJson<{ data: SessionRow[] }>("/api/sessions?limit=100&page=1"),
          fetchJson<{ data: AttendanceHistoryRow[] }>(
            `/api/members/${member.id}/attendances?limit=100&page=1`
          ),
        ])

        const sessionsData = sessionsResponse.data ?? []
        const detailTargets = sessionsData
          .filter((session) => session.status !== "cancelled")
          .slice(0, 16)

        const detailResponses = await Promise.all(
          detailTargets.map((session) =>
            fetchJson<{ data: SessionDetailRow }>(`/api/sessions/${session.id}`)
          )
        )

        if (!isMounted) {
          return
        }

        setSessions(sessionsData)
        setAttendances(attendancesResponse.data ?? [])
        setDetailsBySessionId(
          Object.fromEntries(detailResponses.map((response) => [response.data.id, response.data]))
        )
      } catch (caughtError) {
        if (!isMounted) {
          return
        }
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Impossible de charger les seances."
        )
      } finally {
        if (isMounted) {
          setIsPageLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      isMounted = false
    }
  }, [member?.id])

  if (isLoading || isPageLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!member) {
    return null
  }

  const attendanceBySessionId = new Map(
    attendances.map((attendance) => [attendance.session_id, attendance])
  )
  const upcomingSessions = sessions.filter(
    (session) => session.status === "upcoming" || session.status === "ongoing"
  )
  const pastSessions = sessions.filter((session) => session.status === "completed")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Seances</h1>
        <p className="text-muted-foreground">
          Consultez et inscrivez-vous aux seances du club
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">A venir ({upcomingSessions.length})</TabsTrigger>
          <TabsTrigger value="past">Passees ({pastSessions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {upcomingSessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-center text-muted-foreground">
                  Aucune seance planifiee pour le moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingSessions.map((session) => {
                const attendance = attendanceBySessionId.get(session.id)
                const sessionActivities =
                  detailsBySessionId[session.id]?.session_activities?.filter(
                    (item) => item.activity
                  ) ?? []

                return (
                  <Card key={session.id}>
                    <CardHeader>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                            <Calendar className="h-7 w-7 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {new Date(session.date).toLocaleDateString("fr-FR", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </CardTitle>
                            <CardDescription className="mt-1 flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {attendance ? "Presence enregistree" : "Ouverte aux inscriptions"}
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(attendance?.status)}
                          {session.status === "ongoing" ? (
                            <Badge className="bg-accent">En cours</Badge>
                          ) : null}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {sessionActivities.length > 0 ? (
                        <div className="mb-4">
                          <p className="mb-2 text-sm font-medium">Activites prevues:</p>
                          <div className="flex flex-wrap gap-2">
                            {sessionActivities.map((sessionActivity) => (
                              <Badge key={sessionActivity.id} variant="outline">
                                <BookOpen className="mr-1 h-3 w-3" />
                                {sessionActivity.activity?.name ?? "Activite"}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/member/sessions/${session.id}`}>
                            Details
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {pastSessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-center text-muted-foreground">
                  Aucune seance passee.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pastSessions.map((session) => {
                const attendance = attendanceBySessionId.get(session.id)

                return (
                  <Card key={session.id} className="opacity-80">
                    <CardHeader>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
                            <Calendar className="h-7 w-7 text-muted-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {new Date(session.date).toLocaleDateString("fr-FR", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </CardTitle>
                            <CardDescription className="mt-1 flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(attendance?.status)}
                          <Badge variant="secondary">Terminee</Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
