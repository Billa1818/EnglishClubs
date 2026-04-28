"use client"

import { useState } from "react"
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
import { sessions, attendances, members } from "@/lib/mock-data"
import type { AttendanceStatus } from "@/lib/types"

const statusConfig: Record<
  AttendanceStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }
> = {
  declared: { label: "Déclaré", variant: "secondary", icon: Clock },
  confirmed: { label: "Confirmé", variant: "default", icon: CheckCircle },
  absent: { label: "Absent", variant: "destructive", icon: XCircle },
  excused: { label: "Excusé", variant: "outline", icon: AlertCircle },
}

function SessionAttendanceCard({ session }: { session: typeof sessions[0] }) {
  const sessionDate = new Date(session.date)
  const totalAttendees = session.attendees.length
  const confirmedCount = session.attendees.filter(
    (a) => a.status === "confirmed" || a.status === "declared"
  ).length
  const absentCount = session.attendees.filter((a) => a.status === "absent").length
  const excusedCount = session.attendees.filter((a) => a.status === "excused").length
  const attendanceRate = totalAttendees > 0 ? (confirmedCount / totalAttendees) * 100 : 0

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
                {session.startTime} - {session.endTime}
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
              ? "Terminée"
              : session.status === "ongoing"
                ? "En cours"
                : "À venir"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taux de présence</span>
            <span className="font-medium text-foreground">{Math.round(attendanceRate)}%</span>
          </div>
          <Progress value={attendanceRate} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg bg-accent/10 p-2">
            <p className="text-lg font-bold text-accent">{confirmedCount}</p>
            <p className="text-xs text-muted-foreground">Présents</p>
          </div>
          <div className="rounded-lg bg-destructive/10 p-2">
            <p className="text-lg font-bold text-destructive">{absentCount}</p>
            <p className="text-xs text-muted-foreground">Absents</p>
          </div>
          <div className="rounded-lg bg-muted p-2">
            <p className="text-lg font-bold text-foreground">{excusedCount}</p>
            <p className="text-xs text-muted-foreground">Excusés</p>
          </div>
        </div>

        {session.attendees.length > 0 && (
          <div className="space-y-2">
            <div className="flex -space-x-2">
              {session.attendees.slice(0, 6).map((attendance) => (
                <Avatar key={attendance.id} className="h-7 w-7 border-2 border-card">
                  <AvatarImage src={attendance.user.photoUrl} />
                  <AvatarFallback className="text-[10px]">
                    {attendance.user.firstName[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
              {session.attendees.length > 6 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">
                  +{session.attendees.length - 6}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MemberAttendanceTable() {
  const activeMembers = members.filter((m) => m.status === "active")
  const totalSessions = sessions.filter((s) => s.status === "completed").length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Présences par membre</CardTitle>
            <CardDescription>Récapitulatif des présences de chaque membre</CardDescription>
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
              <TableHead className="text-center">Présences</TableHead>
              <TableHead className="text-center">Absences</TableHead>
              <TableHead className="text-center">Taux</TableHead>
              <TableHead className="hidden md:table-cell">Progression</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeMembers.map((member) => {
              const attendanceRate =
                totalSessions > 0
                  ? (member.presenceCount / (member.presenceCount + member.absenceCount)) * 100
                  : 0

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user.photoUrl} />
                        <AvatarFallback>
                          {member.user.firstName[0]}
                          {member.user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {member.user.firstName} {member.user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">@{member.user.pseudo}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="default" className="bg-accent text-accent-foreground">
                      {member.presenceCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="destructive">{member.absenceCount}</Badge>
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

  const filteredSessions =
    sessionFilter === "all"
      ? sessions
      : sessions.filter((s) => s.status === sessionFilter)

  const totalAttendances = attendances.length
  const confirmedAttendances = attendances.filter(
    (a) => a.status === "confirmed" || a.status === "declared"
  ).length
  const averageRate = totalAttendances > 0 ? (confirmedAttendances / totalAttendances) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Présences</h1>
          <p className="text-muted-foreground">Suivi des présences pour chaque séance</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exporter tout
        </Button>
      </div>

      {/* Stats */}
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
              <p className="text-sm text-muted-foreground">Présences confirmées</p>
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
              <p className="text-sm text-muted-foreground">Séances</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={sessionFilter} onValueChange={setSessionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les séances</SelectItem>
                <SelectItem value="upcoming">À venir</SelectItem>
                <SelectItem value="ongoing">En cours</SelectItem>
                <SelectItem value="completed">Terminées</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Présences par séance</h2>
        {filteredSessions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSessions.map((session) => (
              <SessionAttendanceCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm font-medium text-foreground">Aucune séance trouvée</p>
              <p className="text-xs text-muted-foreground">
                Modifiez vos filtres pour voir plus de résultats
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Member Table */}
      <MemberAttendanceTable />
    </div>
  )
}
