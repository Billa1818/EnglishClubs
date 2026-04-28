"use client"

import { useState } from "react"
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
import { useAuth } from "@/lib/auth-context"
import { sessions, attendances } from "@/lib/mock-data"

export default function MemberSessionsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("upcoming")

  if (!user) return null

  const upcomingSessions = sessions.filter((s) => s.status === "upcoming" || s.status === "ongoing")
  const pastSessions = sessions.filter((s) => s.status === "completed")

  const getUserAttendanceStatus = (sessionId: string) => {
    return attendances.find((a) => a.sessionId === sessionId && a.user.id === user.id)
  }

  const getStatusBadge = (status: string | undefined) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Seances</h1>
        <p className="text-muted-foreground">
          Consultez et inscrivez-vous aux seances du club
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">
            A venir ({upcomingSessions.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Passees ({pastSessions.length})
          </TabsTrigger>
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
                const attendance = getUserAttendanceStatus(session.id)
                const sessionActivities = session.activities || []

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
                                {session.startTime} - {session.endTime}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {session.attendees?.filter(a => a.status === "declared" || a.status === "confirmed").length || 0} inscrits
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(attendance?.status)}
                          {session.status === "ongoing" && (
                            <Badge className="bg-accent">En cours</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {sessionActivities.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium mb-2">Activites prevues:</p>
                          <div className="flex flex-wrap gap-2">
                            {sessionActivities.map((sa) => (
                              <Badge key={sa.id} variant="outline">
                                <BookOpen className="mr-1 h-3 w-3" />
                                {sa.activity.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        {!attendance && (
                          <Button size="sm">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Declarer ma presence
                          </Button>
                        )}
                        {attendance?.status === "declared" && (
                          <Button size="sm" variant="outline">
                            <XCircle className="mr-2 h-4 w-4" />
                            Annuler mon inscription
                          </Button>
                        )}
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
                const attendance = getUserAttendanceStatus(session.id)

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
                                {session.startTime} - {session.endTime}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {session.attendees?.filter(a => a.status === "confirmed").length || 0} presents
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
