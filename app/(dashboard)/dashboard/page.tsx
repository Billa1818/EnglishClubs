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
import {
  dashboardStats,
  sessions,
  absenceRequests,
  fccProgressions,
  members,
  currentUser,
} from "@/lib/mock-data"

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
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            {trend && (
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
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function UpcomingSession() {
  const upcomingSession = sessions.find((s) => s.status === "upcoming")

  if (!upcomingSession) {
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

  const sessionDate = new Date(upcomingSession.date)
  const formattedDate = sessionDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Prochaine séance</CardTitle>
          <Badge variant="secondary">
            {upcomingSession.attendees.filter((a) => a.status === "declared").length} inscrits
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
            <p className="font-medium capitalize text-foreground">{formattedDate}</p>
            <p className="text-sm text-muted-foreground">
              {upcomingSession.startTime} - {upcomingSession.endTime}
            </p>
          </div>
        </div>

        {upcomingSession.activities.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Activités prévues</p>
            <div className="flex flex-wrap gap-2">
              {upcomingSession.activities.map((sa) => (
                <Badge key={sa.id} variant="outline">
                  {sa.activity.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button asChild className="w-full">
          <Link href={`/sessions/${upcomingSession.id}`}>
            Voir les détails
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function PendingRequests() {
  const pendingAbsences = absenceRequests.filter((ar) => ar.status === "pending")
  const pendingMembers = members.filter((m) => m.status === "pending")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Demandes en attente</CardTitle>
        <CardDescription>Actions requises</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingAbsences.length > 0 && (
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
                  <AvatarImage src={request.user.photoUrl} />
                  <AvatarFallback>
                    {request.user.firstName[0]}
                    {request.user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">
                    {request.user.firstName} {request.user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Séance du {new Date(request.session.date).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            ))}
            <Button variant="outline" asChild className="w-full">
              <Link href="/absences">Voir tout</Link>
            </Button>
          </div>
        )}

        {pendingMembers.length > 0 && (
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
                  <AvatarImage src={member.user.photoUrl} />
                  <AvatarFallback>
                    {member.user.firstName[0]}
                    {member.user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">
                    {member.user.firstName} {member.user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.user.email}</p>
                </div>
                <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            ))}
            <Button variant="outline" asChild className="w-full">
              <Link href="/members">Gérer</Link>
            </Button>
          </div>
        )}

        {pendingAbsences.length === 0 && pendingMembers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="h-10 w-10 text-accent mb-2" />
            <p className="text-sm font-medium text-foreground">Tout est à jour</p>
            <p className="text-xs text-muted-foreground">Aucune action en attente</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function FCCProgressOverview() {
  const pendingValidations = fccProgressions.filter((p) => !p.validatedAt)

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
        {pendingValidations.length > 0 && (
          <div className="rounded-lg bg-primary/5 p-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">
                {pendingValidations.length} progression(s) à valider
              </span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {fccProgressions.slice(0, 3).map((progression) => (
            <div key={progression.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={progression.user.photoUrl} />
                    <AvatarFallback className="text-xs">
                      {progression.user.firstName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">
                    {progression.user.firstName}
                  </span>
                </div>
                <Badge variant={progression.validatedAt ? "secondary" : "outline"} className="text-xs">
                  {progression.validatedAt ? "Validé" : "En attente"}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="truncate max-w-[180px]">{progression.track}</span>
                  <span>{progression.modulesCompleted}/5 modules</span>
                </div>
                <Progress value={(progression.modulesCompleted / 5) * 100} className="h-1.5" />
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
          <Link href="/sessions/new">
            <Calendar className="mb-2 h-5 w-5" />
            <span className="text-xs">Créer une séance</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-auto flex-col py-4">
          <Link href="/members?invite=true">
            <Users className="mb-2 h-5 w-5" />
            <span className="text-xs">Inviter un membre</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-auto flex-col py-4">
          <Link href="/activities/new">
            <BookOpen className="mb-2 h-5 w-5" />
            <span className="text-xs">Nouvelle activité</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-auto flex-col py-4">
          <Link href="/topics/new">
            <GraduationCap className="mb-2 h-5 w-5" />
            <span className="text-xs">Nouveau sujet</span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const isAdmin = currentUser.role === "admin"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Vue d&apos;ensemble de votre communauté English Club
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Membres actifs"
          value={dashboardStats.totalMembers}
          icon={Users}
          description={`${dashboardStats.pendingMembers} en attente`}
        />
        <StatCard
          title="Taux de présence"
          value={`${dashboardStats.averageAttendanceRate}%`}
          icon={CheckCircle}
          trend={{ value: 5, positive: true }}
        />
        <StatCard
          title="Séances à venir"
          value={dashboardStats.upcomingSessions}
          icon={Calendar}
        />
        <StatCard
          title="Sujets actifs"
          value={dashboardStats.activeTopics}
          icon={BookOpen}
          description={`${dashboardStats.usedTopics} utilisés`}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <UpcomingSession />
          {isAdmin && <PendingRequests />}
        </div>
        <div className="space-y-6">
          {isAdmin && <QuickActions />}
          <FCCProgressOverview />
        </div>
      </div>
    </div>
  )
}
