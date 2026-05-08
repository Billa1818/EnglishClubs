"use client"

import { useEffect, useState } from "react"
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  CalendarCheck,
  CalendarX,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
  session: SessionRow | null
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

function getStatusBadge(status: string | null) {
  switch (status) {
    case "declared":
      return (
        <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Declare
        </Badge>
      )
    case "confirmed":
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Confirme
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
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Non declare
        </Badge>
      )
  }
}

export default function MemberAttendancePage() {
  const { user, member, isLoading } = useAuth()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [attendances, setAttendances] = useState<AttendanceHistoryRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isSubmittingSessionId, setIsSubmittingSessionId] = useState<string | null>(null)

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

        if (!isMounted) {
          return
        }

        setSessions(sessionsResponse.data ?? [])
        setAttendances(attendancesResponse.data ?? [])
      } catch (caughtError) {
        if (!isMounted) {
          return
        }
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Impossible de charger les presences."
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

  const refreshAttendances = async () => {
    if (!member?.id) {
      return
    }

    const attendancesResponse = await fetchJson<{ data: AttendanceHistoryRow[] }>(
      `/api/members/${member.id}/attendances?limit=100&page=1`
    )
    setAttendances(attendancesResponse.data ?? [])
  }

  const handleDeclarePresence = async (sessionId: string) => {
    setIsSubmittingSessionId(sessionId)
    setError(null)

    try {
      const response = await fetch(`/api/sessions/${sessionId}/attendances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "declared" }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(parseApiError(payload, "Impossible de declarer votre presence."))
      }
      await refreshAttendances()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de declarer votre presence."
      )
    } finally {
      setIsSubmittingSessionId(null)
    }
  }

  const handleCancelDeclaration = async (sessionId: string) => {
    setIsSubmittingSessionId(sessionId)
    setError(null)

    try {
      const response = await fetch(`/api/sessions/${sessionId}/attendances`, {
        method: "DELETE",
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(parseApiError(payload, "Impossible d'annuler la declaration."))
      }
      await refreshAttendances()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible d'annuler la declaration."
      )
    } finally {
      setIsSubmittingSessionId(null)
    }
  }

  if (isLoading || isPageLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const attendanceBySessionId = new Map(
    attendances.map((attendance) => [attendance.session_id, attendance])
  )
  const completedSessions = sessions.filter((session) => session.status === "completed")
  const confirmedAttendances = attendances.filter((attendance) => attendance.status === "confirmed")
  const absentCount = attendances.filter((attendance) => attendance.status === "absent").length
  const excusedCount = attendances.filter((attendance) => attendance.status === "excused").length
  const attendanceRate =
    completedSessions.length > 0
      ? Math.round((confirmedAttendances.length / completedSessions.length) * 100)
      : 0
  const upcomingSessions = sessions.filter(
    (session) => session.status === "upcoming" || session.status === "ongoing"
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ma Presence</h1>
        <p className="text-muted-foreground">
          Declarez votre presence aux seances et suivez votre historique
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taux de presence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate}%</div>
            <Progress value={attendanceRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Seances confirmees</CardTitle>
            <CalendarCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{confirmedAttendances.length}</div>
            <p className="text-xs text-muted-foreground">
              sur {completedSessions.length} seances passees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Absences</CardTitle>
            <CalendarX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{absentCount}</div>
            <p className="text-xs text-muted-foreground">
              absence{absentCount !== 1 ? "s" : ""} non justifiee{absentCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Excuses</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{excusedCount}</div>
            <p className="text-xs text-muted-foreground">
              absence{excusedCount !== 1 ? "s" : ""} justifiee{excusedCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prochaines seances</CardTitle>
          <CardDescription>
            Declarez votre presence pour les seances a venir
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <div className="py-8 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">
                Aucune seance planifiee pour le moment.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingSessions.map((session) => {
                const attendance = attendanceBySessionId.get(session.id) ?? null
                const status = attendance?.status ?? null
                const canDeclare = !status
                const canCancel = status === "declared"
                const isSubmitting = isSubmittingSessionId === session.id

                return (
                  <div
                    key={session.id}
                    className="flex flex-col justify-between gap-4 rounded-lg border p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {new Date(session.date).toLocaleDateString("fr-FR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </p>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(status)}
                      {canDeclare ? (
                        <Button
                          size="sm"
                          onClick={() => void handleDeclarePresence(session.id)}
                          disabled={isSubmitting}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Declarer ma presence
                        </Button>
                      ) : null}
                      {canCancel ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" disabled={isSubmitting}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Annuler
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Annuler la declaration ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Voulez-vous vraiment annuler votre declaration de presence pour cette seance ?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Non, garder</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => void handleCancelDeclaration(session.id)}
                              >
                                Oui, annuler
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique de presence</CardTitle>
          <CardDescription>
            Votre historique de presence aux seances passees
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedSessions.length === 0 ? (
            <div className="py-8 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">Aucun historique disponible.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Horaires</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedSessions.map((session) => {
                  const attendance = attendanceBySessionId.get(session.id)
                  return (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        {new Date(session.date).toLocaleDateString("fr-FR", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                      </TableCell>
                      <TableCell>{getStatusBadge(attendance?.status ?? "absent")}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
