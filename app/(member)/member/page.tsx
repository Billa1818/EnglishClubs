"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Calendar,
  ClipboardCheck,
  Clock,
  GraduationCap,
  TrendingUp,
  Award,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  BookOpen,
  PlayCircle,
  Radio,
  Users,
  Bell,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
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
  session: {
    id: string
    date: string
    start_time: string
    end_time: string
    status: "upcoming" | "ongoing" | "completed" | "cancelled"
  } | null
}

type AbsenceRow = {
  id: string
  status: "pending" | "approved" | "rejected"
}

type FccRow = {
  id: string
  track: string
  modules_completed: number
  certificate_name: string | null
  validated_at: string | null
}

type NotificationRow = {
  id: string
  title: string
  body: string
  is_read: boolean
  created_at: string
}

type SessionDetailRow = {
  id: string
  date: string
  start_time: string
  end_time: string
  status: "upcoming" | "ongoing" | "completed" | "cancelled"
  session_activities: Array<{
    id: string
    duration: number
    status: "pending" | "in_progress" | "completed" | "skipped"
    activity: {
      id: string
      name: string
      category:
        | "ice_breaker"
        | "vocabulary"
        | "conversation"
        | "comprehension"
        | "writing"
    } | null
    assignments: Array<{
      id: string
      user_id: string
      assignment_type: string
      user: {
        first_name: string
        last_name: string
      } | null
    }> | null
  }> | null
}

type DashboardData = {
  sessions: SessionRow[]
  attendances: AttendanceHistoryRow[]
  absences: AbsenceRow[]
  fcc: FccRow[]
  notifications: NotificationRow[]
  detailsBySessionId: Record<string, SessionDetailRow>
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

function toDateTimeValue(date: string, time: string) {
  return new Date(`${date}T${time}`)
}

function formatSessionDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

function getLevelLabel(level: "beginner" | "intermediate" | "advanced") {
  if (level === "advanced") {
    return "Avance"
  }
  if (level === "intermediate") {
    return "Intermediaire"
  }
  return "Debutant"
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

function getActivityCategoryLabel(
  value: "ice_breaker" | "vocabulary" | "conversation" | "comprehension" | "writing"
) {
  if (value === "ice_breaker") {
    return "Ice Breaker"
  }
  if (value === "vocabulary") {
    return "Vocabulaire"
  }
  if (value === "conversation") {
    return "Conversation"
  }
  if (value === "comprehension") {
    return "Comprehension"
  }
  return "Ecriture"
}

function getNotificationTimeLabel(value: string) {
  const date = new Date(value)
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function MemberDashboardPage() {
  const { user, member, isLoading } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPageLoading, setIsPageLoading] = useState(true)

  useEffect(() => {
    if (!user || !member?.id) {
      return
    }

    let isMounted = true

    const loadDashboard = async () => {
      setIsPageLoading(true)
      setError(null)

      try {
        const [sessionsResponse, attendancesResponse, absencesResponse, fccResponse, notificationsResponse] =
          await Promise.all([
            fetchJson<{ data: SessionRow[] }>("/api/sessions?limit=100&page=1"),
            fetchJson<{ data: AttendanceHistoryRow[] }>(
              `/api/members/${member.id}/attendances?limit=100&page=1`
            ),
            fetchJson<{ data: AbsenceRow[] }>("/api/absences?limit=100&page=1"),
            fetchJson<{ data: FccRow[] }>(`/api/fcc/${encodeURIComponent(user.id)}`),
            fetchJson<{ data: NotificationRow[] }>("/api/notifications?limit=5&page=1"),
          ])

        const sessions = sessionsResponse.data ?? []
        const sessionsToInspect = sessions
          .filter((session) => session.status === "ongoing" || session.status === "upcoming")
          .sort(
            (left, right) =>
              toDateTimeValue(left.date, left.start_time).getTime() -
              toDateTimeValue(right.date, right.start_time).getTime()
          )
          .slice(0, 4)

        const detailResponses = await Promise.all(
          sessionsToInspect.map((session) =>
            fetchJson<{ data: SessionDetailRow }>(`/api/sessions/${session.id}`)
          )
        )

        const detailsBySessionId = Object.fromEntries(
          detailResponses.map((response) => [response.data.id, response.data])
        )

        if (!isMounted) {
          return
        }

        setData({
          sessions,
          attendances: attendancesResponse.data ?? [],
          absences: absencesResponse.data ?? [],
          fcc: fccResponse.data ?? [],
          notifications: notificationsResponse.data ?? [],
          detailsBySessionId,
        })
      } catch (caughtError) {
        if (!isMounted) {
          return
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Impossible de charger le tableau de bord membre."
        )
      } finally {
        if (isMounted) {
          setIsPageLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      isMounted = false
    }
  }, [member?.id, user?.id])

  if (isLoading || isPageLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user || !member) {
    return null
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!data) {
    return null
  }

  const completedSessions = data.sessions.filter((session) => session.status === "completed")
  const confirmedAttendances = data.attendances.filter(
    (attendance) => attendance.status === "confirmed"
  )
  const attendanceRate =
    completedSessions.length > 0
      ? Math.round((confirmedAttendances.length / completedSessions.length) * 100)
      : 0
  const pendingAbsences = data.absences.filter((absence) => absence.status === "pending")
  const completedCertificates = data.fcc.filter((progression) => progression.certificate_name)
  const ongoingSession = data.sessions.find((session) => session.status === "ongoing") ?? null
  const ongoingSessionDetail = ongoingSession
    ? data.detailsBySessionId[ongoingSession.id] ?? null
    : null
  const upcomingSessions = data.sessions
    .filter((session) => session.status === "upcoming")
    .sort(
      (left, right) =>
        toDateTimeValue(left.date, left.start_time).getTime() -
        toDateTimeValue(right.date, right.start_time).getTime()
    )
    .slice(0, 3)

  const attendanceBySessionId = new Map(
    data.attendances.map((attendance) => [attendance.session_id, attendance])
  )
  const ongoingAttendance = ongoingSession
    ? attendanceBySessionId.get(ongoingSession.id) ?? null
    : null

  const myUpcomingActivities = Object.values(data.detailsBySessionId)
    .filter((session) => session.status === "upcoming")
    .flatMap((session) =>
      (session.session_activities ?? [])
        .map((sessionActivity) => {
          const assignment = (sessionActivity.assignments ?? []).find(
            (item) => item.user_id === user.id
          )

          if (!assignment || !sessionActivity.activity) {
            return null
          }

          return {
            sessionId: session.id,
            sessionDate: session.date,
            sessionActivityId: sessionActivity.id,
            activityName: sessionActivity.activity.name,
            assignmentType: assignment.assignment_type,
          }
        })
        .filter(Boolean)
    )
    .slice(0, 2) as Array<{
    sessionId: string
    sessionDate: string
    sessionActivityId: string
    activityName: string
    assignmentType: string
  }>

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary">
            <AvatarImage src={user.photoUrl} alt={user.firstName} />
            <AvatarFallback className="text-xl">
              {user.firstName[0]}
              {user.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-balance">
              Bonjour, {user.firstName}!
            </h1>
            <p className="text-muted-foreground">
              Niveau: {getLevelLabel(user.englishLevel)}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/member/sessions">
            <Calendar className="mr-2 h-4 w-4" />
            Voir les seances
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taux de presence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate}%</div>
            <Progress value={attendanceRate} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              {confirmedAttendances.length} sur {completedSessions.length} seances
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Prochaines seances</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingSessions.length}</div>
            <p className="text-xs text-muted-foreground">seances planifiees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Absences en attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingAbsences.length}</div>
            <p className="text-xs text-muted-foreground">
              demande{pendingAbsences.length > 1 ? "s" : ""} a traiter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Certificats FCC</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCertificates.length}</div>
            <p className="text-xs text-muted-foreground">
              certificat{completedCertificates.length > 1 ? "s" : ""} obtenu
              {completedCertificates.length > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {ongoingSession && ongoingSessionDetail ? (
        <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500">
                  <Radio className="h-6 w-6 text-white" />
                </div>
                <span className="absolute -right-1 -top-1 flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-4 w-4 rounded-full bg-green-500" />
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-green-700 dark:text-green-400">
                    Seance en cours
                  </CardTitle>
                  <Badge className="bg-green-500 text-white animate-pulse">LIVE</Badge>
                </div>
                <CardDescription className="text-green-600 dark:text-green-400">
                  Aujourd&apos;hui {ongoingSession.start_time.slice(0, 5)} -{" "}
                  {ongoingSession.end_time.slice(0, 5)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(ongoingSessionDetail.session_activities ?? []).some(
                (activity) => activity.status === "in_progress"
              ) ? (
                <div className="rounded-lg border border-green-200 bg-white p-4 dark:border-green-800 dark:bg-background">
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Activite en cours
                  </p>
                  {(ongoingSessionDetail.session_activities ?? []).map((activity) =>
                    activity.status === "in_progress" && activity.activity ? (
                      <div key={activity.id} className="flex items-center gap-3">
                        <PlayCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-semibold">{activity.activity.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {getActivityCategoryLabel(activity.activity.category)} -{" "}
                            {activity.duration} min
                          </p>
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <Users className="h-4 w-4" />
                  <span>
                    {ongoingAttendance?.status === "confirmed"
                      ? "Votre presence est confirmee"
                      : ongoingAttendance?.status === "declared"
                        ? "Votre presence est declaree"
                        : "Consultez le detail de la seance"}
                  </span>
                </div>
                <Button asChild className="bg-green-600 hover:bg-green-700">
                  <Link href={`/member/sessions/${ongoingSession.id}`}>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Voir la seance
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Prochaines seances</CardTitle>
                <CardDescription>Les seances a venir</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/member/sessions">
                  Voir tout
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Aucune seance planifiee pour le moment.
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingSessions.map((session) => {
                  const attendance = attendanceBySessionId.get(session.id)

                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <Calendar className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{formatSessionDate(session.date)}</p>
                          <p className="text-sm text-muted-foreground">
                            {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {attendance?.status === "declared" ? (
                          <Badge variant="outline" className="bg-accent/10">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Inscrit
                          </Badge>
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
            <CardTitle>Mes activites assignees</CardTitle>
            <CardDescription>Activites pour les prochaines seances</CardDescription>
          </CardHeader>
          <CardContent>
            {myUpcomingActivities.length === 0 ? (
              <div className="py-8 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-muted-foreground">
                  Aucune activite assignee pour le moment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myUpcomingActivities.map((activity) => (
                  <div
                    key={activity.sessionActivityId}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                        <BookOpen className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium">{activity.activityName}</p>
                        <p className="text-sm text-muted-foreground">
                          Role: {getAssignmentLabel(activity.assignmentType)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatSessionDate(activity.sessionDate)}
                        </p>
                      </div>
                    </div>
                    <Badge>A venir</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Ma progression FreeCodeCamp</CardTitle>
                <CardDescription>Suivez votre avancement dans les certifications</CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/member/freecodecamp">
                  Mettre a jour
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.fcc.length === 0 ? (
              <div className="py-8 text-center">
                <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-muted-foreground">
                  Vous n&apos;avez pas encore declare de progression FreeCodeCamp.
                </p>
                <Button className="mt-4" asChild>
                  <Link href="/member/freecodecamp">Commencer</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {data.fcc.map((progression) => (
                  <div key={progression.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{progression.track}</p>
                        <p className="text-sm text-muted-foreground">
                          {progression.modules_completed} modules completes
                        </p>
                      </div>
                      {progression.certificate_name ? (
                        <Badge className="bg-accent text-accent-foreground">
                          <Award className="mr-1 h-3 w-3" />
                          Certifie
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {progression.validated_at ? "Valide" : "En cours"}
                        </Badge>
                      )}
                    </div>
                    <Progress
                      value={Math.min(100, progression.modules_completed * 10)}
                      className="mt-3"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Notifications recentes</CardTitle>
                <CardDescription>Les derniers messages du club</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/member/notifications">
                  Voir tout
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-muted-foreground">
                  Aucune notification recente.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{notification.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {notification.body}
                        </p>
                      </div>
                      {!notification.is_read ? (
                        <Badge variant="destructive">Nouveau</Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {getNotificationTimeLabel(notification.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Button variant="outline" className="h-auto flex-col gap-2 p-6" asChild>
          <Link href="/member/attendance">
            <ClipboardCheck className="h-8 w-8 text-primary" />
            <span>Declarer ma presence</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-2 p-6" asChild>
          <Link href="/member/absences">
            <Clock className="h-8 w-8 text-primary" />
            <span>Demander une absence</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-2 p-6" asChild>
          <Link href="/member/freecodecamp">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span>Mettre a jour FCC</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-2 p-6" asChild>
          <Link href="/member/profile">
            <Award className="h-8 w-8 text-primary" />
            <span>Mon profil</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
