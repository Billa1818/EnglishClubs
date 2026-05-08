"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  BookOpen,
  PlayCircle,
  Radio,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
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

type SessionDetailRow = {
  id: string
  date: string
  start_time: string
  end_time: string
  status: "upcoming" | "ongoing" | "completed" | "cancelled"
  started_at: string | null
  topic: {
    id: string
    title: string
    description: string
    level: "beginner" | "intermediate" | "advanced"
  } | null
  session_activities: Array<{
    id: string
    order_index: number
    duration: number
    status: "pending" | "in_progress" | "completed" | "skipped"
    activity: {
      id: string
      name: string
      description: string
      requires_topic: boolean
    } | null
    assignments: Array<{
      id: string
      user_id: string
      assignment_type: string
      user: {
        id: string
        first_name: string
        last_name: string
        photo_url: string | null
      } | null
    }> | null
  }> | null
}

type AttendanceRow = {
  id: string
  user_id: string
  status: "declared" | "confirmed" | "absent" | "excused"
  user: {
    id: string
    first_name: string
    last_name: string
    pseudo: string
    photo_url: string | null
  } | null
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
          Inscrit
        </Badge>
      )
    case "confirmed":
      return (
        <Badge className="bg-green-500 text-white">
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

function getSessionStatusBadge(status: SessionDetailRow["status"]) {
  if (status === "upcoming") {
    return <Badge className="bg-blue-500">A venir</Badge>
  }
  if (status === "ongoing") {
    return <Badge className="bg-green-500">En cours</Badge>
  }
  if (status === "completed") {
    return <Badge variant="secondary">Terminee</Badge>
  }
  return <Badge variant="destructive">Annulee</Badge>
}

function getAssignmentLabel(value: string) {
  if (value === "presenter") {
    return "Presentateur"
  }
  if (value === "host") {
    return "Animateur"
  }
  if (value === "team_a") {
    return "Equipe A"
  }
  if (value === "team_b") {
    return "Equipe B"
  }
  return "Participant"
}

export default function MemberSessionDetailPage() {
  const params = useParams()
  const { user, isLoading } = useAuth()
  const [session, setSession] = useState<SessionDetailRow | null>(null)
  const [attendances, setAttendances] = useState<AttendanceRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const sessionId = params.id as string

  useEffect(() => {
    if (!sessionId) {
      return
    }

    let isMounted = true

    const loadData = async () => {
      setIsPageLoading(true)
      setError(null)

      try {
        const [sessionResponse, attendancesResponse] = await Promise.all([
          fetchJson<{ data: SessionDetailRow }>(`/api/sessions/${sessionId}`),
          fetchJson<{ data: AttendanceRow[] }>(
            `/api/sessions/${sessionId}/attendances?limit=100&page=1`
          ),
        ])

        if (!isMounted) {
          return
        }

        setSession(sessionResponse.data)
        setAttendances(attendancesResponse.data ?? [])
      } catch (caughtError) {
        if (!isMounted) {
          return
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Impossible de charger la seance."
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
  }, [sessionId])

  const refreshAttendances = async () => {
    const attendancesResponse = await fetchJson<{ data: AttendanceRow[] }>(
      `/api/sessions/${sessionId}/attendances?limit=100&page=1`
    )
    setAttendances(attendancesResponse.data ?? [])
  }

  const handleDeclarePresence = async () => {
    setIsSubmitting(true)
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
      setIsSubmitting(false)
    }
  }

  const handleCancelDeclaration = async () => {
    setIsSubmitting(true)
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
      setIsSubmitting(false)
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

  if (error && !session) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href="/member/sessions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux seances
          </Link>
        </Button>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const userAttendance =
    attendances.find((attendance) => attendance.user_id === user.id) ?? null
  const declaredCount = attendances.filter(
    (attendance) => attendance.status === "declared" || attendance.status === "confirmed"
  ).length
  const isUpcoming = session.status === "upcoming"
  const isOngoing = session.status === "ongoing"
  const isPast = session.status === "completed" || session.status === "cancelled"

  const userAssignments = (session.session_activities ?? [])
    .flatMap((sessionActivity) =>
      (sessionActivity.assignments ?? [])
        .filter((assignment) => assignment.user_id === user.id)
        .map((assignment) => ({
          activityName: sessionActivity.activity?.name ?? "Activite",
          assignmentType: assignment.assignment_type,
        }))
    )

  const sortedActivities = [...(session.session_activities ?? [])].sort(
    (left, right) => left.order_index - right.order_index
  )

  const currentActivity = sortedActivities.find((activity) => activity.status === "in_progress")

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/member/sessions">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Seance du{" "}
              {new Date(session.date).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h1>
            {getSessionStatusBadge(session.status)}
          </div>
          <p className="text-muted-foreground">
            {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
          </p>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {isOngoing ? (
        <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardContent className="py-4">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
                    <Radio className="h-5 w-5 text-white" />
                  </div>
                  <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-green-700 dark:text-green-400">
                      Seance en cours
                    </p>
                    <Badge className="bg-green-500 text-white animate-pulse">LIVE</Badge>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {currentActivity
                      ? `Activite en cours: ${currentActivity.activity?.name ?? "Activite"}`
                      : "La seance a demarre"}
                  </p>
                </div>
              </div>
              {session.started_at ? (
                <div className="text-sm text-green-600 dark:text-green-400">
                  <Clock className="mr-1 inline h-4 w-4" />
                  Demarree depuis{" "}
                  {Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000)} min
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {session.topic ? (
        <Card>
          <CardHeader>
            <CardTitle>Sujet de la seance</CardTitle>
            <CardDescription>Theme principal de cette rencontre</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{session.topic.level}</Badge>
            </div>
            <p className="font-medium text-foreground">{session.topic.title}</p>
            <p className="text-sm text-muted-foreground">{session.topic.description}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className={userAttendance ? "border-primary/50" : ""}>
            <CardHeader>
              <CardTitle>Mon statut</CardTitle>
              <CardDescription>
                Votre statut de presence pour cette seance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.photoUrl} alt={user.firstName} />
                    <AvatarFallback>
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">@{user.pseudo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {userAttendance ? getStatusBadge(userAttendance.status) : null}
                  {(isUpcoming || isOngoing) && !userAttendance ? (
                    <Button onClick={() => void handleDeclarePresence()} disabled={isSubmitting}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Declarer ma presence
                    </Button>
                  ) : null}
                  {(isUpcoming || isOngoing) && userAttendance?.status === "declared" ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={isSubmitting}>
                          <XCircle className="mr-2 h-4 w-4" />
                          Annuler
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Annuler la declaration ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Voulez-vous vraiment annuler votre declaration de presence ?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Non, garder</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void handleCancelDeclaration()}>
                            Oui, annuler
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                </div>
              </div>

              {userAssignments.length > 0 ? (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="mb-3 text-sm font-medium">Mes activites assignees</p>
                    <div className="space-y-2">
                      {userAssignments.map((assignment, index) => (
                        <div
                          key={`${assignment.activityName}-${index}`}
                          className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3"
                        >
                          <BookOpen className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{assignment.activityName}</p>
                            <p className="text-sm text-muted-foreground">
                              Role: {getAssignmentLabel(assignment.assignmentType)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Programme</CardTitle>
              <CardDescription>Activites prevues pour cette seance</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedActivities.length > 0 ? (
                <div className="space-y-4">
                  {sortedActivities.map((sessionActivity, index) => (
                    <div
                      key={sessionActivity.id}
                      className={`flex items-start gap-4 rounded-lg border p-4 ${
                        sessionActivity.status === "in_progress"
                          ? "border-2 border-green-500 bg-green-50 dark:bg-green-950/20"
                          : sessionActivity.status === "completed"
                            ? "border-muted bg-muted/30"
                            : ""
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                          sessionActivity.status === "in_progress"
                            ? "bg-green-500 text-white"
                            : sessionActivity.status === "completed"
                              ? "bg-muted-foreground/20 text-muted-foreground"
                              : "bg-muted"
                        }`}
                      >
                        {sessionActivity.status === "in_progress" ? (
                          <PlayCircle className="h-4 w-4" />
                        ) : sessionActivity.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4
                            className={`font-medium ${
                              sessionActivity.status === "completed"
                                ? "text-muted-foreground"
                                : ""
                            }`}
                          >
                            {sessionActivity.activity?.name ?? "Activite"}
                          </h4>
                          {sessionActivity.status === "in_progress" ? (
                            <Badge className="bg-green-500 text-white animate-pulse">
                              En cours
                            </Badge>
                          ) : null}
                          {sessionActivity.status === "completed" ? (
                            <Badge variant="secondary">Termine</Badge>
                          ) : null}
                          {sessionActivity.activity?.requires_topic ? (
                            <Badge variant="outline" className="text-xs">
                              Sujet requis
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {sessionActivity.activity?.description ?? "Aucune description"}
                        </p>
                        {(sessionActivity.assignments ?? []).length > 0 ? (
                          <div className="mt-3">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                              Responsables:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(sessionActivity.assignments ?? []).map((assignment) => (
                                <div
                                  key={assignment.id}
                                  className={`flex items-center gap-2 rounded-full px-2 py-1 text-xs ${
                                    assignment.user?.id === user.id
                                      ? "border border-primary/20 bg-primary/10 text-primary"
                                      : "bg-muted"
                                  }`}
                                >
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={assignment.user?.photo_url ?? undefined} />
                                    <AvatarFallback className="text-[10px]">
                                      {assignment.user?.first_name?.[0] ?? "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{assignment.user?.first_name ?? "Membre"}</span>
                                  {assignment.user?.id === user.id ? (
                                    <Badge variant="secondary" className="h-4 text-[10px]">
                                      Vous
                                    </Badge>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-muted-foreground">
                    Aucune activite planifiee pour le moment.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(session.date).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Horaires</p>
                  <p className="text-sm text-muted-foreground">
                    {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Participants</p>
                  <p className="text-sm text-muted-foreground">
                    {declaredCount} inscrit{declaredCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Participants</CardTitle>
              <CardDescription>
                {isPast ? "Qui etait present" : "Qui a declare sa presence"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendances.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Aucun participant pour le moment
                </p>
              ) : (
                <div className="space-y-3">
                  {attendances.map((attendance) => (
                    <div key={attendance.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={attendance.user?.photo_url ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {attendance.user?.first_name?.[0] ?? "?"}
                            {attendance.user?.last_name?.[0] ?? ""}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {attendance.user
                              ? `${attendance.user.first_name} ${attendance.user.last_name}`
                              : "Membre"}
                            {attendance.user?.id === user.id ? (
                              <span className="ml-1 text-muted-foreground">(vous)</span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(attendance.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {isUpcoming || isOngoing ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/member/absences">
                    <Clock className="mr-2 h-4 w-4" />
                    Demander une absence
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
