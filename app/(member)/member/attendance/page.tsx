"use client"

import { useState } from "react"
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
import { useAuth } from "@/lib/auth-context"
import { sessions, attendances } from "@/lib/mock-data"

export default function MemberAttendancePage() {
  const { user } = useAuth()
  const [declaredSessions, setDeclaredSessions] = useState<string[]>([])

  if (!user) return null

  // Get user attendance data
  const userAttendances = attendances.filter((a) => a.user.id === user.id)
  
  // Calculate stats
  const completedSessions = sessions.filter(s => s.status === "completed")
  const confirmedAttendances = userAttendances.filter(a => a.status === "confirmed")
  const absentCount = userAttendances.filter(a => a.status === "absent").length
  const excusedCount = userAttendances.filter(a => a.status === "excused").length
  const attendanceRate = completedSessions.length > 0 
    ? Math.round((confirmedAttendances.length / completedSessions.length) * 100) 
    : 0

  // Upcoming sessions where user can declare presence
  const upcomingSessions = sessions.filter(s => s.status === "upcoming" || s.status === "ongoing")

  const getUserAttendanceStatus = (sessionId: string) => {
    const existing = attendances.find((a) => a.sessionId === sessionId && a.user.id === user.id)
    if (existing) return existing.status
    if (declaredSessions.includes(sessionId)) return "declared"
    return null
  }

  const handleDeclarePresence = (sessionId: string) => {
    setDeclaredSessions([...declaredSessions, sessionId])
  }

  const handleCancelDeclaration = (sessionId: string) => {
    setDeclaredSessions(declaredSessions.filter(id => id !== sessionId))
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "declared":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ma Presence</h1>
        <p className="text-muted-foreground">
          Declarez votre presence aux seances et suivez votre historique
        </p>
      </div>

      {/* Stats Cards */}
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

      {/* Upcoming Sessions - Declare Presence */}
      <Card>
        <CardHeader>
          <CardTitle>Prochaines seances</CardTitle>
          <CardDescription>
            Declarez votre presence pour les seances a venir
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">
                Aucune seance planifiee pour le moment.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingSessions.map((session) => {
                const status = getUserAttendanceStatus(session.id)
                const canDeclare = !status || status === null
                const canCancel = status === "declared" && !attendances.find(a => a.sessionId === session.id && a.user.id === user.id)

                return (
                  <div
                    key={session.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-4"
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
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {session.startTime} - {session.endTime}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(status)}
                      {canDeclare && (
                        <Button size="sm" onClick={() => handleDeclarePresence(session.id)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Declarer ma presence
                        </Button>
                      )}
                      {canCancel && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
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
                              <AlertDialogAction onClick={() => handleCancelDeclaration(session.id)}>
                                Oui, annuler
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle>Historique de presence</CardTitle>
          <CardDescription>
            Votre historique de presence aux seances passees
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedSessions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">
                Aucun historique disponible.
              </p>
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
                  const attendance = userAttendances.find(a => a.sessionId === session.id)
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
                        {session.startTime} - {session.endTime}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(attendance?.status || "absent")}
                      </TableCell>
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
