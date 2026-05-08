"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ClipboardCheck,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Download,
  Filter,
  Users,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { AttendanceStatus } from "@/lib/types"

type ApiSessionRow = {
  id: string
  date: string
  start_time: string
  end_time: string
  status: "upcoming" | "ongoing" | "completed" | "cancelled"
}

type ApiMemberRow = {
  id: string
  user_id: string
  status: "pending" | "active" | "suspended" | "removed"
  role: "admin" | "member"
  profile: {
    id: string
    first_name: string
    last_name: string
    pseudo: string
    photo_url: string | null
    english_level: "beginner" | "intermediate" | "advanced"
  } | null
}

type ApiAttendanceRow = {
  id: string
  session_id: string
  user_id: string
  status: AttendanceStatus
  declared_at: string | null
  confirmed_at: string | null
  confirmed_by: string | null
  user: {
    id: string
    first_name: string
    last_name: string
    pseudo: string
    photo_url: string | null
    english_level: "beginner" | "intermediate" | "advanced"
  } | null
}

type ApiListResponse<T> = {
  success?: boolean
  error?: string
  data?: T[]
}

const statusConfig: Record<
  AttendanceStatus,
  {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
    icon: React.ElementType
  }
> = {
  declared: { label: "Declare", variant: "secondary", icon: Clock },
  confirmed: { label: "Confirme", variant: "default", icon: CheckCircle },
  absent: { label: "Absent", variant: "destructive", icon: XCircle },
  excused: { label: "Excuse", variant: "outline", icon: AlertCircle },
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T
}

function SessionAttendanceCard({
  session,
  attendances,
}: {
  session: ApiSessionRow
  attendances: ApiAttendanceRow[]
}) {
  const sessionDate = new Date(session.date)
  const totalAttendees = attendances.length
  const confirmedCount = attendances.filter(
    (item) => item.status === "confirmed" || item.status === "declared"
  ).length
  const absentCount = attendances.filter((item) => item.status === "absent").length
  const excusedCount = attendances.filter((item) => item.status === "excused").length
  const attendanceRate = totalAttendees > 0 ? (confirmedCount / totalAttendees) * 100 : 0
  const sortedAttendances = [...attendances].sort((a, b) => {
    const aName = `${a.user?.first_name ?? ""} ${a.user?.last_name ?? ""}`.trim()
    const bName = `${b.user?.first_name ?? ""} ${b.user?.last_name ?? ""}`.trim()
    return aName.localeCompare(bName, "fr")
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/10">
              <span className="text-lg font-bold text-primary">{sessionDate.getDate()}</span>
              <span className="text-[10px] uppercase text-primary">
                {sessionDate.toLocaleDateString("fr-FR", { month: "short" })}
              </span>
            </div>
            <div>
              <CardTitle className="text-base">
                {sessionDate.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </CardTitle>
              <CardDescription>
                {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={
              session.status === "completed"
                ? "outline"
                : session.status === "ongoing"
                  ? "secondary"
                  : "default"
            }
          >
            {session.status === "completed"
              ? "Terminee"
              : session.status === "ongoing"
                ? "En cours"
                : session.status === "cancelled"
                  ? "Annulee"
                  : "A venir"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taux de presence</span>
            <span className="font-medium text-foreground">{Math.round(attendanceRate)}%</span>
          </div>
          <Progress value={attendanceRate} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg bg-accent/10 p-2">
            <p className="text-lg font-bold text-accent">{confirmedCount}</p>
            <p className="text-xs text-muted-foreground">Presents</p>
          </div>
          <div className="rounded-lg bg-destructive/10 p-2">
            <p className="text-lg font-bold text-destructive">{absentCount}</p>
            <p className="text-xs text-muted-foreground">Absents</p>
          </div>
          <div className="rounded-lg bg-muted p-2">
            <p className="text-lg font-bold text-foreground">{excusedCount}</p>
            <p className="text-xs text-muted-foreground">Excuses</p>
          </div>
        </div>

        {attendances.length > 0 ? (
          <div className="space-y-2">
            <div className="flex -space-x-2">
              {attendances.slice(0, 6).map((attendance) => (
                <Avatar key={attendance.id} className="h-7 w-7 border-2 border-card">
                  <AvatarImage src={attendance.user?.photo_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {(attendance.user?.first_name?.[0] ?? "U").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {attendances.length > 6 ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">
                  +{attendances.length - 6}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {session.status === "completed" ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                Voir la liste de presence
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Liste de presence</DialogTitle>
                <DialogDescription>
                  {sessionDate.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  - {session.start_time.slice(0, 5)} a {session.end_time.slice(0, 5)}
                </DialogDescription>
              </DialogHeader>

              {sortedAttendances.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune presence enregistree pour cette seance.
                </p>
              ) : (
                <div className="max-h-[360px] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Membre</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAttendances.map((attendance) => {
                        const config = statusConfig[attendance.status]
                        const Icon = config.icon
                        return (
                          <TableRow key={attendance.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={attendance.user?.photo_url ?? undefined} />
                                  <AvatarFallback>
                                    {(attendance.user?.first_name?.[0] ?? "U").toUpperCase()}
                                    {(attendance.user?.last_name?.[0] ?? "N").toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {attendance.user
                                      ? `${attendance.user.first_name} ${attendance.user.last_name}`
                                      : attendance.user_id}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    @{attendance.user?.pseudo ?? attendance.user_id}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={config.variant} className="gap-1">
                                <Icon className="h-3 w-3" />
                                {config.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </DialogContent>
          </Dialog>
        ) : null}
      </CardContent>
    </Card>
  )
}

function MemberAttendanceTable({
  members,
  completedSessions,
  attendancesBySessionId,
}: {
  members: ApiMemberRow[]
  completedSessions: ApiSessionRow[]
  attendancesBySessionId: Map<string, ApiAttendanceRow[]>
}) {
  const totalCompletedSessions = completedSessions.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Presences par membre</CardTitle>
            <CardDescription>Recapitulatif des presences de chaque membre</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membre</TableHead>
              <TableHead className="text-center">Presences</TableHead>
              <TableHead className="text-center">Absences</TableHead>
              <TableHead className="text-center">Taux</TableHead>
              <TableHead className="hidden md:table-cell">Progression</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const presenceCount = completedSessions.reduce((count, session) => {
                const row = (attendancesBySessionId.get(session.id) ?? []).find(
                  (item) => item.user_id === member.user_id
                )
                if (!row) {
                  return count
                }
                return row.status === "confirmed" || row.status === "declared"
                  ? count + 1
                  : count
              }, 0)

              const absenceCount = Math.max(totalCompletedSessions - presenceCount, 0)
              const attendanceRate =
                totalCompletedSessions > 0
                  ? (presenceCount / totalCompletedSessions) * 100
                  : 0

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.profile?.photo_url ?? undefined} />
                        <AvatarFallback>
                          {(member.profile?.first_name?.[0] ?? "U").toUpperCase()}
                          {(member.profile?.last_name?.[0] ?? "N").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {member.profile
                            ? `${member.profile.first_name} ${member.profile.last_name}`
                            : member.user_id}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{member.profile?.pseudo ?? member.user_id}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="default" className="bg-accent text-accent-foreground">
                      {presenceCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="destructive">{absenceCount}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`font-medium ${
                        attendanceRate >= 80
                          ? "text-accent"
                          : attendanceRate >= 50
                            ? "text-chart-3"
                            : "text-destructive"
                      }`}
                    >
                      {Math.round(attendanceRate)}%
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Progress value={attendanceRate} className="h-2 w-24" />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default function AttendancePage() {
  const [sessionFilter, setSessionFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [sessions, setSessions] = useState<ApiSessionRow[]>([])
  const [members, setMembers] = useState<ApiMemberRow[]>([])
  const [attendancesBySessionId, setAttendancesBySessionId] = useState<
    Map<string, ApiAttendanceRow[]>
  >(new Map())

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage("")

    try {
      const [sessionsResponse, membersResponse] = await Promise.all([
        fetch("/api/sessions?limit=100&page=1", { cache: "no-store" }),
        fetch("/api/members?status=active&limit=100&page=1", { cache: "no-store" }),
      ])

      const sessionsPayload = await readJson<ApiListResponse<ApiSessionRow>>(sessionsResponse)
      const membersPayload = await readJson<ApiListResponse<ApiMemberRow>>(membersResponse)

      if (!sessionsResponse.ok || !sessionsPayload.success || !sessionsPayload.data) {
        setErrorMessage(sessionsPayload.error || "Impossible de charger les seances.")
        setSessions([])
        setMembers([])
        setAttendancesBySessionId(new Map())
        return
      }

      if (!membersResponse.ok || !membersPayload.success || !membersPayload.data) {
        setErrorMessage(membersPayload.error || "Impossible de charger les membres.")
        setSessions([])
        setMembers([])
        setAttendancesBySessionId(new Map())
        return
      }

      const loadedSessions = sessionsPayload.data
      setSessions(loadedSessions)
      setMembers(membersPayload.data)

      const attendanceResults = await Promise.all(
        loadedSessions.map(async (session) => {
          const response = await fetch(
            `/api/sessions/${encodeURIComponent(session.id)}/attendances?limit=100&page=1`,
            { cache: "no-store" }
          )
          const payload = await readJson<ApiListResponse<ApiAttendanceRow>>(response)

          if (!response.ok || !payload.success || !payload.data) {
            return {
              sessionId: session.id,
              data: [] as ApiAttendanceRow[],
              error: payload.error || "Chargement des presences impossible.",
            }
          }

          return {
            sessionId: session.id,
            data: payload.data,
            error: "",
          }
        })
      )

      const nextMap = new Map<string, ApiAttendanceRow[]>()
      let firstError = ""

      for (const result of attendanceResults) {
        nextMap.set(result.sessionId, result.data)
        if (!firstError && result.error) {
          firstError = result.error
        }
      }

      if (firstError) {
        setErrorMessage(firstError)
      }

      setAttendancesBySessionId(nextMap)
    } catch {
      setErrorMessage("Impossible de contacter le serveur.")
      setSessions([])
      setMembers([])
      setAttendancesBySessionId(new Map())
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredSessions = useMemo(() => {
    if (sessionFilter === "all") {
      return sessions
    }
    return sessions.filter((session) => session.status === sessionFilter)
  }, [sessionFilter, sessions])

  const allAttendances = useMemo(
    () => Array.from(attendancesBySessionId.values()).flat(),
    [attendancesBySessionId]
  )

  const totalAttendances = allAttendances.length
  const confirmedAttendances = allAttendances.filter(
    (attendance) => attendance.status === "confirmed" || attendance.status === "declared"
  ).length
  const averageRate = totalAttendances > 0 ? (confirmedAttendances / totalAttendances) * 100 : 0
  const completedSessions = sessions.filter((session) => session.status === "completed")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Presences</h1>
          <p className="text-muted-foreground">Suivi des presences pour chaque seance</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exporter tout
        </Button>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalAttendances}</p>
              <p className="text-sm text-muted-foreground">Total enregistrements</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-accent/10 p-2">
              <CheckCircle className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{confirmedAttendances}</p>
              <p className="text-sm text-muted-foreground">Presences confirmees</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-chart-3/10 p-2">
              <Users className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{Math.round(averageRate)}%</p>
              <p className="text-sm text-muted-foreground">Taux moyen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-chart-1/10 p-2">
              <Calendar className="h-5 w-5 text-chart-1" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
              <p className="text-sm text-muted-foreground">Seances</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={sessionFilter} onValueChange={setSessionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les seances</SelectItem>
                <SelectItem value="upcoming">A venir</SelectItem>
                <SelectItem value="ongoing">En cours</SelectItem>
                <SelectItem value="completed">Terminees</SelectItem>
                <SelectItem value="cancelled">Annulees</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des presences...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Presences par seance</h2>
            {filteredSessions.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSessions.map((session) => (
                  <SessionAttendanceCard
                    key={session.id}
                    session={session}
                    attendances={attendancesBySessionId.get(session.id) ?? []}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-foreground">Aucune seance trouvee</p>
                  <p className="text-xs text-muted-foreground">
                    Modifiez vos filtres pour voir plus de resultats
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <MemberAttendanceTable
            members={members}
            completedSessions={completedSessions}
            attendancesBySessionId={attendancesBySessionId}
          />
        </>
      )}
    </div>
  )
}
