"use client"

import { useState } from "react"
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
  AlertCircle,
  BookOpen,
  PlayCircle,
  Radio,
  Users,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { sessions, attendances, absenceRequests, fccProgressions, activities } from "@/lib/mock-data"

export default function MemberDashboardPage() {
  const { user } = useAuth()

  if (!user) return null

  // Get user-specific data
  const userAttendances = attendances.filter((a) => a.user.id === user.id)
  const userAbsenceRequests = absenceRequests.filter((ar) => ar.user.id === user.id)
  const userFCCProgressions = fccProgressions.filter((p) => p.user.id === user.id)
  
  // Calculate stats
  const totalSessions = sessions.filter(s => s.status === "completed").length
  const attendedSessions = userAttendances.filter(a => a.status === "confirmed").length
  const attendanceRate = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0
  const pendingAbsences = userAbsenceRequests.filter(ar => ar.status === "pending").length
  const completedCertificates = userFCCProgressions.filter(p => p.certificateName).length

  // Ongoing session (live)
  const ongoingSession = sessions.find((s) => s.status === "ongoing")

  // Upcoming sessions (scheduled only, not ongoing)
  const upcomingSessions = sessions
    .filter((s) => s.status === "upcoming")
    .slice(0, 3)

  // Recent activities assigned to user
  const myUpcomingActivities = sessions
    .filter(s => s.status === "upcoming")
    .flatMap(s => s.activities || [])
    .filter(sa => sa.assignments?.some(a => a.user.id === user.id))
    .slice(0, 2)

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary">
            <AvatarImage src={user.photoUrl} alt={user.firstName} />
            <AvatarFallback className="text-xl">
              {user.firstName[0]}{user.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-balance">
              Bonjour, {user.firstName}!
            </h1>
            <p className="text-muted-foreground">
              Niveau: {user.englishLevel === "beginner" ? "Debutant" : 
                       user.englishLevel === "intermediate" ? "Intermediaire" : "Avance"}
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
            <p className="text-xs text-muted-foreground mt-2">
              {attendedSessions} sur {totalSessions} seances
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
            <p className="text-xs text-muted-foreground">
              seances planifiees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Absences en attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingAbsences}</div>
            <p className="text-xs text-muted-foreground">
              demande{pendingAbsences !== 1 ? "s" : ""} a traiter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Certificats FCC</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCertificates}</div>
            <p className="text-xs text-muted-foreground">
              certificat{completedCertificates !== 1 ? "s" : ""} obtenu{completedCertificates !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Session Banner */}
      {ongoingSession && (
        <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500">
                  <Radio className="h-6 w-6 text-white" />
                </div>
                <span className="absolute -right-1 -top-1 flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex h-4 w-4 rounded-full bg-green-500"></span>
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-green-700 dark:text-green-400">Seance en cours</CardTitle>
                  <Badge className="bg-green-500 text-white animate-pulse">LIVE</Badge>
                </div>
                <CardDescription className="text-green-600 dark:text-green-400">
                  Aujourd&apos;hui {ongoingSession.startTime} - {ongoingSession.endTime}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Current Activity */}
              {ongoingSession.activities && ongoingSession.activities.length > 0 && (
                <div className="rounded-lg bg-white dark:bg-background p-4 border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Activite en cours</p>
                  {ongoingSession.activities.map((activity, index) => (
                    activity.status === "in_progress" && (
                      <div key={activity.id} className="flex items-center gap-3">
                        <PlayCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-semibold">{activity.activity.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {activity.activity.category === "ice_breaker" ? "Ice Breaker" :
                             activity.activity.category === "vocabulary" ? "Vocabulaire" :
                             activity.activity.category === "conversation" ? "Conversation" :
                             activity.activity.category === "comprehension" ? "Comprehension" : "Ecriture"}
                            {" "}- {activity.duration} min
                          </p>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}

              {/* Participants count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <Users className="h-4 w-4" />
                  <span>{ongoingSession.attendees?.filter(a => a.status === "confirmed").length || 0} participants confirmes</span>
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
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Sessions */}
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
              <p className="text-center text-muted-foreground py-8">
                Aucune seance planifiee pour le moment.
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingSessions.map((session) => {
                  const userAttendance = attendances.find(
                    (a) => a.sessionId === session.id && a.user.id === user.id
                  )
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
                          <p className="font-medium">
                            {new Date(session.date).toLocaleDateString("fr-FR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {session.startTime} - {session.endTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {userAttendance?.status === "declared" && (
                          <Badge variant="outline" className="bg-accent/10">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Inscrit
                          </Badge>
                        )}
                        {!userAttendance && (
                          <Button size="sm" asChild>
                            <Link href={`/member/sessions/${session.id}`}>
                              S&apos;inscrire
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Activities */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Mes activites assignees</CardTitle>
                <CardDescription>Activites pour les prochaines seances</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {myUpcomingActivities.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-muted-foreground">
                  Aucune activite assignee pour le moment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myUpcomingActivities.map((sa) => {
                  const myAssignment = sa.assignments?.find(a => a.user.id === user.id)
                  return (
                    <div
                      key={sa.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                          <BookOpen className="h-6 w-6 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium">{sa.activity.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Role: {myAssignment?.assignmentType === "presenter" ? "Presentateur" :
                                   myAssignment?.assignmentType === "host" ? "Animateur" :
                                   myAssignment?.assignmentType === "team_a" ? "Equipe A" :
                                   myAssignment?.assignmentType === "team_b" ? "Equipe B" : "Participant"}
                          </p>
                        </div>
                      </div>
                      <Badge>A venir</Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* FreeCodeCamp Progress */}
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
          {userFCCProgressions.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">
                Vous n&apos;avez pas encore declare de progression FreeCodeCamp.
              </p>
              <Button className="mt-4" asChild>
                <Link href="/member/freecodecamp">
                  Commencer
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {userFCCProgressions.map((progression) => (
                <div
                  key={progression.id}
                  className="rounded-lg border p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{progression.track}</p>
                      <p className="text-sm text-muted-foreground">
                        {progression.modulesCompleted} modules completes
                      </p>
                    </div>
                    {progression.certificateName ? (
                      <Badge className="bg-accent text-accent-foreground">
                        <Award className="mr-1 h-3 w-3" />
                        Certifie
                      </Badge>
                    ) : (
                      <Badge variant="secondary">En cours</Badge>
                    )}
                  </div>
                  <Progress 
                    value={(progression.modulesCompleted / 5) * 100} 
                    className="mt-3" 
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
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
