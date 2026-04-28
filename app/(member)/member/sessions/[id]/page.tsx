"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  BookOpen,
  User,
  MapPin,
  PlayCircle,
  Radio,
  Pause,
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
import { useAuth } from "@/lib/auth-context"
import { sessions, attendances, users } from "@/lib/mock-data"

export default function MemberSessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [hasDeclared, setHasDeclared] = useState(false)

  if (!user) return null

  const sessionId = params.id as string
  const session = sessions.find(s => s.id === sessionId)

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Calendar className="h-12 w-12 text-muted-foreground/30" />
        <h2 className="mt-4 text-xl font-semibold">Seance non trouvee</h2>
        <p className="mt-2 text-muted-foreground">
          Cette seance n&apos;existe pas ou a ete supprimee.
        </p>
        <Button className="mt-4" asChild>
          <Link href="/member/sessions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux seances
          </Link>
        </Button>
      </div>
    )
  }

  const sessionAttendances = attendances.filter(a => a.sessionId === session.id)
  const userAttendance = sessionAttendances.find(a => a.user.id === user.id)
  const declaredCount = sessionAttendances.filter(a => 
    a.status === "declared" || a.status === "confirmed"
  ).length

  const isUpcoming = session.status === "upcoming"
  const isOngoing = session.status === "ongoing"
  const isPast = session.status === "completed" || session.status === "cancelled"

  const currentUserStatus = hasDeclared ? "declared" : userAttendance?.status || null

  const handleDeclarePresence = () => {
    setHasDeclared(true)
  }

  const handleCancelDeclaration = () => {
    setHasDeclared(false)
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "declared":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
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

  const getSessionStatusBadge = () => {
    switch (session.status) {
      case "upcoming":
        return <Badge className="bg-blue-500">A venir</Badge>
      case "ongoing":
        return <Badge className="bg-green-500">En cours</Badge>
      case "completed":
        return <Badge variant="secondary">Terminee</Badge>
      case "cancelled":
        return <Badge variant="destructive">Annulee</Badge>
      default:
        return null
    }
  }

  // Find user's assignments in this session
  const userAssignments = session.activities?.flatMap(sa => 
    sa.assignments?.filter(a => a.user.id === user.id).map(a => ({
      activityName: sa.activity.name,
      assignmentType: a.assignmentType,
    })) || []
  ) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/member/sessions">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Seance du {new Date(session.date).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h1>
            {getSessionStatusBadge()}
          </div>
          <p className="text-muted-foreground">
            {session.startTime} - {session.endTime}
          </p>
        </div>
      </div>

      {/* Live Session Banner */}
      {isOngoing && (
        <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
                    <Radio className="h-5 w-5 text-white" />
                  </div>
                  <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-green-700 dark:text-green-400">Seance en cours</p>
                    <Badge className="bg-green-500 text-white animate-pulse">LIVE</Badge>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {session.activities?.find(a => a.status === "in_progress")
                      ? `Activite en cours: ${session.activities.find(a => a.status === "in_progress")?.activity.name}`
                      : "La seance a demarre"}
                  </p>
                </div>
              </div>
              {session.startedAt && (
                <div className="text-sm text-green-600 dark:text-green-400">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Demarree depuis {Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000)} min
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Status Card */}
          <Card className={currentUserStatus ? "border-primary/50" : ""}>
            <CardHeader>
              <CardTitle>Mon statut</CardTitle>
              <CardDescription>
                Votre statut de presence pour cette seance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.photoUrl} alt={user.firstName} />
                    <AvatarFallback>
                      {user.firstName[0]}{user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.firstName} {user.lastName}</p>
                    <p className="text-sm text-muted-foreground">@{user.pseudo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {currentUserStatus && getStatusBadge(currentUserStatus)}
                  {(isUpcoming || isOngoing) && !currentUserStatus && (
                    <Button onClick={handleDeclarePresence}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Declarer ma presence
                    </Button>
                  )}
                  {(isUpcoming || isOngoing) && currentUserStatus === "declared" && !userAttendance && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline">
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
                          <AlertDialogAction onClick={handleCancelDeclaration}>
                            Oui, annuler
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>

              {/* User Assignments */}
              {userAssignments.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm font-medium mb-3">Mes activites assignees</p>
                    <div className="space-y-2">
                      {userAssignments.map((assignment, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
                        >
                          <BookOpen className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{assignment.activityName}</p>
                            <p className="text-sm text-muted-foreground">
                              Role: {
                                assignment.assignmentType === "presenter" ? "Presentateur" :
                                assignment.assignmentType === "host" ? "Animateur" :
                                assignment.assignmentType === "team_a" ? "Equipe A" :
                                assignment.assignmentType === "team_b" ? "Equipe B" : 
                                "Participant"
                              }
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Programme</CardTitle>
              <CardDescription>
                Activites prevues pour cette seance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {session.activities && session.activities.length > 0 ? (
                <div className="space-y-4">
                  {session.activities
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((sa, index) => (
                    <div 
                      key={sa.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border ${
                        sa.status === "in_progress" 
                          ? "border-2 border-green-500 bg-green-50 dark:bg-green-950/20" 
                          : sa.status === "completed"
                          ? "border-muted bg-muted/30"
                          : ""
                      }`}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                        sa.status === "in_progress" 
                          ? "bg-green-500 text-white" 
                          : sa.status === "completed"
                          ? "bg-muted-foreground/20 text-muted-foreground"
                          : "bg-muted"
                      }`}>
                        {sa.status === "in_progress" ? (
                          <PlayCircle className="h-4 w-4" />
                        ) : sa.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`font-medium ${sa.status === "completed" ? "text-muted-foreground" : ""}`}>
                            {sa.activity.name}
                          </h4>
                          {sa.status === "in_progress" && (
                            <Badge className="bg-green-500 text-white animate-pulse">
                              En cours
                            </Badge>
                          )}
                          {sa.status === "completed" && (
                            <Badge variant="secondary">
                              Termine
                            </Badge>
                          )}
                          {sa.activity.requiresTopic && (
                            <Badge variant="outline" className="text-xs">
                              Sujet requis
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {sa.activity.description}
                        </p>
                        {sa.assignments && sa.assignments.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Responsables:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {sa.assignments.map((assignment) => (
                                <div 
                                  key={assignment.id}
                                  className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs ${
                                    assignment.user.id === user.id 
                                      ? "bg-primary/10 text-primary border border-primary/20" 
                                      : "bg-muted"
                                  }`}
                                >
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={assignment.user.photoUrl} />
                                    <AvatarFallback className="text-[10px]">
                                      {assignment.user.firstName[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{assignment.user.firstName}</span>
                                  {assignment.user.id === user.id && (
                                    <Badge variant="secondary" className="h-4 text-[10px]">
                                      Vous
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-muted-foreground">
                    Aucune activite planifiee pour le moment.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Session Info */}
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
                    {session.startTime} - {session.endTime}
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

          {/* Attendees */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Participants</CardTitle>
              <CardDescription>
                {isPast ? "Qui etait present" : "Qui a declare sa presence"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionAttendances.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun participant pour le moment
                </p>
              ) : (
                <div className="space-y-3">
                  {sessionAttendances.map((attendance) => (
                    <div 
                      key={attendance.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={attendance.user.photoUrl} />
                          <AvatarFallback className="text-xs">
                            {attendance.user.firstName[0]}{attendance.user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {attendance.user.firstName} {attendance.user.lastName}
                            {attendance.user.id === user.id && (
                              <span className="text-muted-foreground ml-1">(vous)</span>
                            )}
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

          {/* Quick Actions */}
          {(isUpcoming || isOngoing) && (
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
          )}
        </div>
      </div>
    </div>
  )
}
