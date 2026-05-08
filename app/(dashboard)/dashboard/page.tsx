"use client"

import { useEffect, useState } from "react"
import {
  Users,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  BookOpen,
  GraduationCap,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"

type MemberRow = {
  id: string
  status: "pending" | "active" | "suspended" | "removed"
  role: "admin" | "member"
  profile: {
    first_name: string
    last_name: string
    pseudo: string
    photo_url: string | null
  } | null
}

type SessionRow = {
  id: string
  date: string
  start_time: string
  end_time: string
  status: "upcoming" | "ongoing" | "completed" | "cancelled"
  session_activities?: Array<{
    id: string
    activity: {
      id: string
      name: string
      category: string
    } | null
  }> | null
}

type AttendanceRow = {
  id: string
  status: "declared" | "confirmed" | "absent" | "excused"
}

type AbsenceRow = {
  id: string
  status: "pending" | "approved" | "rejected"
  user: {
    first_name: string
    last_name: string
    photo_url: string | null
  } | null
  session: {
    id: string
    date: string
  } | null
}

type FccRow = {
  id: string
  track: string
  modules_completed: number
  validated_at: string | null
  user: {
    first_name: string
    photo_url: string | null
  } | null
}

type DashboardData = {
  members: MemberRow[]
  sessions: SessionRow[]
  absences: AbsenceRow[]
  fcc: FccRow[]
  attendanceRate: number
  attendanceSessionCount: number
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

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  description?: string
  trend?: { value: number; positive: boolean }
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
            {trend ? (
              <div className="flex items-center gap-1">
                <TrendingUp
                  className={`h-3 w-3 ${trend.positive ? "text-accent" : "text-destructive"}`}
                />
                <span
                  className={`text-xs font-medium ${trend.positive ? "text-accent" : "text-destructive"}`}
                >
                  {trend.positive ? "+" : "-"}
                  {trend.value}%
                </span>
              </div>
            ) : null}
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function UpcomingSession({ session }: { session: SessionRow | null }) {
  if (!session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prochaine séance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune séance planifiée</p>
        </CardContent>
      </Card>
    )
  }

  const sessionDate = new Date(session.date)
  const activities = session.session_activities ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Prochaine séance</CardTitle>
          <Badge variant="secondary">
            {activities.length} activité{activities.length > 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/10">
            <span className="text-lg font-bold text-primary">{sessionDate.getDate()}</span>
            <span className="text-[10px] uppercase text-primary">
              {sessionDate.toLocaleDateString("fr-FR", { month: "short" })}
            </span>
          </div>
          <div>
            <p className="font-medium capitalize text-foreground">
              {formatSessionDate(session.date)}
            </p>
            <p className="text-sm text-muted-foreground">
              {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
            </p>
          </div>
        </div>

        {activities.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Activités prévues</p>
            <div className="flex flex-wrap gap-2">
              {activities.slice(0, 4).map((sessionActivity) => (
                <Badge key={sessionActivity.id} variant="outline">
                  {sessionActivity.activity?.name ?? "Activité"}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <Button asChild className="w-full">
          <Link href={`/sessions/${session.id}`}>
            Voir les détails
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function PendingRequests({
  pendingAbsences,
  pendingMembers,
}: {
  pendingAbsences: AbsenceRow[]
  pendingMembers: MemberRow[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Demandes en attente</CardTitle>
        <CardDescription>Actions requises</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingAbsences.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Demandes d&apos;absence</p>
              <Badge variant="destructive">{pendingAbsences.length}</Badge>
            </div>
            {pendingAbsences.slice(0, 2).map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={request.user?.photo_url ?? undefined} />
                  <AvatarFallback>
                    {request.user?.first_name?.[0] ?? "?"}
                    {request.user?.last_name?.[0] ?? ""}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {request.user
                      ? `${request.user.first_name} ${request.user.last_name}`
                      : "Membre"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {request.session
                      ? `Séance du ${new Date(request.session.date).toLocaleDateString("fr-FR")}`
                      : "Séance"}
                  </p>
                </div>
                <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </div>
            ))}
            <Button variant="outline" asChild className="w-full">
              <Link href="/absences">Voir tout</Link>
            </Button>
          </div>
        ) : null}

        {pendingMembers.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Demandes d&apos;adhésion</p>
              <Badge variant="destructive">{pendingMembers.length}</Badge>
            </div>
            {pendingMembers.slice(0, 2).map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.profile?.photo_url ?? undefined} />
                  <AvatarFallback>
                    {member.profile?.first_name?.[0] ?? "?"}
                    {member.profile?.last_name?.[0] ?? ""}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {member.profile
                      ? `${member.profile.first_name} ${member.profile.last_name}`
                      : "Membre"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.role === "admin" ? "Administrateur" : "Membre"}
                  </p>
                </div>
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </div>
            ))}
            <Button variant="outline" asChild className="w-full">
              <Link href="/members">Gérer</Link>
            </Button>
          </div>
        ) : null}

        {pendingAbsences.length === 0 && pendingMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="mb-2 h-10 w-10 text-accent" />
            <p className="text-sm font-medium text-foreground">Tout est à jour</p>
            <p className="text-xs text-muted-foreground">Aucune action en attente</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function FCCProgressOverview({ rows }: { rows: FccRow[] }) {
  const pendingValidations = rows.filter((item) => !item.validated_at)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Progressions FreeCodeCamp</CardTitle>
            <CardDescription>Suivi des membres</CardDescription>
          </div>
          <GraduationCap className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingValidations.length > 0 ? (
          <div className="rounded-lg bg-primary/5 p-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">
                {pendingValidations.length} progression(s) à valider
              </span>
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {rows.slice(0, 3).map((progression) => (
            <div key={progression.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={progression.user?.photo_url ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {progression.user?.first_name?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">
                    {progression.user?.first_name ?? "Membre"}
                  </span>
                </div>
                <Badge
                  variant={progression.validated_at ? "secondary" : "outline"}
                  className="text-xs"
                >
                  {progression.validated_at ? "Validé" : "En attente"}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="max-w-[180px] truncate">{progression.track}</span>
                  <span>{progression.modules_completed} modules</span>
                </div>
                <Progress
                  value={Math.min(100, progression.modules_completed * 10)}
                  className="h-1.5"
                />
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" asChild className="w-full">
          <Link href="/freecodecamp">Voir tout</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Actions rapides</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Button variant="outline" asChild className="h-auto flex-col py-4">
          <Link href="/sessions">
            <Calendar className="mb-2 h-5 w-5" />
            <span className="text-xs">Gérer les séances</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-auto flex-col py-4">
          <Link href="/members">
            <Users className="mb-2 h-5 w-5" />
            <span className="text-xs">Gérer les membres</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-auto flex-col py-4">
          <Link href="/activities">
            <BookOpen className="mb-2 h-5 w-5" />
            <span className="text-xs">Gérer les activités</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-auto flex-col py-4">
          <Link href="/topics">
            <GraduationCap className="mb-2 h-5 w-5" />
            <span className="text-xs">Gérer les sujets</span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadDashboard = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [membersResponse, sessionsResponse, absencesResponse, fccResponse] =
          await Promise.all([
            fetchJson<{ data: MemberRow[] }>("/api/members?limit=100&page=1"),
            fetchJson<{ data: SessionRow[] }>("/api/sessions?limit=100&page=1"),
            fetchJson<{ data: AbsenceRow[] }>("/api/absences?limit=100&page=1"),
            fetchJson<{ data: FccRow[] }>("/api/fcc?limit=100&page=1"),
          ])

        const members = membersResponse.data ?? []
        const sessions = sessionsResponse.data ?? []
        const absences = absencesResponse.data ?? []
        const fcc = fccResponse.data ?? []

        const activeMembers = members.filter((member) => member.status === "active")
        const completedSessions = sessions.filter((session) => session.status === "completed")
        const sessionsForRate = completedSessions.slice(0, 12)

        const attendanceResponses = await Promise.all(
          sessionsForRate.map((session) =>
            fetchJson<{ data: AttendanceRow[] }>(
              `/api/sessions/${session.id}/attendances?limit=100&page=1`
            )
          )
        )

        const confirmedAttendances = attendanceResponses.reduce((total, response) => {
          return (
            total +
            (response.data ?? []).filter((attendance) => attendance.status === "confirmed")
              .length
          )
        }, 0)

        const attendanceRate =
          activeMembers.length > 0 && sessionsForRate.length > 0
            ? Math.round(
                (confirmedAttendances / (activeMembers.length * sessionsForRate.length)) *
                  100
              )
            : 0

        if (!isMounted) {
          return
        }

        setData({
          members,
          sessions,
          absences,
          fcc,
          attendanceRate,
          attendanceSessionCount: sessionsForRate.length,
        })
      } catch (caughtError) {
        if (!isMounted) {
          return
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Impossible de charger le tableau de bord."
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
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

  const activeMembers = data.members.filter((member) => member.status === "active")
  const pendingMembers = data.members.filter((member) => member.status === "pending")
  const pendingAbsences = data.absences.filter((absence) => absence.status === "pending")
  const pendingValidations = data.fcc.filter((item) => !item.validated_at)
  const upcomingSessions = data.sessions
    .filter((session) => session.status === "upcoming" || session.status === "ongoing")
    .sort(
      (left, right) =>
        toDateTimeValue(left.date, left.start_time).getTime() -
        toDateTimeValue(right.date, right.start_time).getTime()
    )
  const nextSession = upcomingSessions[0] ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Vue d&apos;ensemble de votre communauté English Club
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Membres actifs"
          value={activeMembers.length}
          icon={Users}
          description={`${pendingMembers.length} en attente`}
        />
        <StatCard
          title="Taux de présence"
          value={`${data.attendanceRate}%`}
          icon={CheckCircle}
          description={
            data.attendanceSessionCount > 0
              ? `sur les ${data.attendanceSessionCount} dernières séances`
              : "aucune séance terminée"
          }
        />
        <StatCard
          title="Séances à venir"
          value={upcomingSessions.length}
          icon={Calendar}
        />
        <StatCard
          title="FCC à valider"
          value={pendingValidations.length}
          icon={GraduationCap}
          description={`${data.fcc.length} progression(s) suivie(s)`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <UpcomingSession session={nextSession} />
          <PendingRequests
            pendingAbsences={pendingAbsences}
            pendingMembers={pendingMembers}
          />
        </div>
        <div className="space-y-6">
          <QuickActions />
          <FCCProgressOverview rows={data.fcc} />
        </div>
      </div>
    </div>
  )
}
