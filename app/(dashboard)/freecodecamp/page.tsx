"use client"

import { useState } from "react"
import {
  GraduationCap,
  CheckCircle,
  Clock,
  Award,
  ExternalLink,
  Eye,
  Image,
  Filter,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { fccProgressions, appConfig } from "@/lib/mock-data"

const trackColors: Record<string, string> = {
  "Responsive Web Design": "bg-chart-1/20 text-chart-1",
  "JavaScript Algorithms and Data Structures": "bg-chart-3/20 text-chart-3",
  "Front End Development Libraries": "bg-chart-2/20 text-chart-2",
  "Back End Development and APIs": "bg-chart-4/20 text-chart-4",
  "Data Visualization": "bg-primary/20 text-primary",
}

function ProgressionCard({ progression }: { progression: typeof fccProgressions[0] }) {
  const progressPercent = (progression.modulesCompleted / 5) * 100
  const trackColor = trackColors[progression.track] || "bg-muted text-muted-foreground"
  const isValidated = !!progression.validatedAt

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={progression.user.photoUrl} />
              <AvatarFallback>
                {progression.user.firstName[0]}
                {progression.user.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">
                {progression.user.firstName} {progression.user.lastName}
              </CardTitle>
              <CardDescription>@{progression.user.pseudo}</CardDescription>
            </div>
          </div>
          {isValidated ? (
            <Badge variant="default" className="gap-1 bg-accent">
              <CheckCircle className="h-3 w-3" />
              Validé
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              En attente
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${trackColor}`}>
            {progression.track}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-medium text-foreground">
              {progression.modulesCompleted}/5 modules
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Niveau</span>
          <Badge variant="outline">{progression.level}</Badge>
        </div>

        {progression.certificateName && (
          <div className="flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-chart-3" />
            <span className="text-foreground">{progression.certificateName}</span>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Mis à jour le {new Date(progression.updatedAt).toLocaleDateString("fr-FR")}
        </div>

        {!isValidated && (
          <div className="flex gap-2 pt-2 border-t border-border">
            {progression.screenshotUrl && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Image className="mr-2 h-4 w-4" />
                    Voir la preuve
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Capture d&apos;écran</DialogTitle>
                    <DialogDescription>
                      Preuve de progression de {progression.user.firstName}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <span className="text-muted-foreground">Capture d&apos;écran</span>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Button size="sm" className="flex-1 bg-accent hover:bg-accent/90">
              <CheckCircle className="mr-2 h-4 w-4" />
              Valider
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProgressionsTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Vue d&apos;ensemble</CardTitle>
        <CardDescription>Toutes les progressions FreeCodeCamp</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membre</TableHead>
              <TableHead>Parcours</TableHead>
              <TableHead className="text-center">Modules</TableHead>
              <TableHead>Niveau</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Mis à jour</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fccProgressions.map((progression) => {
              const trackColor = trackColors[progression.track] || "bg-muted text-muted-foreground"

              return (
                <TableRow key={progression.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={progression.user.photoUrl} />
                        <AvatarFallback className="text-xs">
                          {progression.user.firstName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">
                        {progression.user.firstName} {progression.user.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${trackColor}`}>
                      {progression.track.length > 25
                        ? progression.track.substring(0, 25) + "..."
                        : progression.track}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Progress value={(progression.modulesCompleted / 5) * 100} className="h-1.5 w-12" />
                      <span className="text-xs text-muted-foreground">
                        {progression.modulesCompleted}/5
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {progression.level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {progression.validatedAt ? (
                      <Badge variant="default" className="bg-accent text-xs">
                        Validé
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        En attente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(progression.updatedAt).toLocaleDateString("fr-FR")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Détails de la progression</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={progression.user.photoUrl} />
                              <AvatarFallback>
                                {progression.user.firstName[0]}
                                {progression.user.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">
                                {progression.user.firstName} {progression.user.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                @{progression.user.pseudo}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <p>
                              <strong>Parcours :</strong> {progression.track}
                            </p>
                            <p>
                              <strong>Niveau :</strong> {progression.level}
                            </p>
                            <p>
                              <strong>Modules terminés :</strong> {progression.modulesCompleted}/5
                            </p>
                            {progression.certificateName && (
                              <p>
                                <strong>Certificat :</strong> {progression.certificateName}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <strong className="text-sm">Progression</strong>
                            <Progress
                              value={(progression.modulesCompleted / 5) * 100}
                              className="h-2"
                            />
                          </div>
                        </div>
                        {!progression.validatedAt && (
                          <DialogFooter>
                            <Button className="bg-accent hover:bg-accent/90">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Valider la progression
                            </Button>
                          </DialogFooter>
                        )}
                      </DialogContent>
                    </Dialog>
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

export default function FreeCodeCampPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const pendingValidations = fccProgressions.filter((p) => !p.validatedAt)
  const validatedProgressions = fccProgressions.filter((p) => p.validatedAt)
  const completedCount = fccProgressions.filter((p) => p.level === "Completed").length

  const filteredProgressions =
    statusFilter === "all"
      ? fccProgressions
      : statusFilter === "pending"
        ? pendingValidations
        : validatedProgressions

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suivi FreeCodeCamp</h1>
          <p className="text-muted-foreground">
            Suivez et validez les progressions des membres
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href="https://www.freecodecamp.org" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Ouvrir FreeCodeCamp
          </a>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{fccProgressions.length}</p>
              <p className="text-sm text-muted-foreground">Progressions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-chart-4/10 p-2">
              <Clock className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingValidations.length}</p>
              <p className="text-sm text-muted-foreground">À valider</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-accent/10 p-2">
              <CheckCircle className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{validatedProgressions.length}</p>
              <p className="text-sm text-muted-foreground">Validées</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-chart-3/10 p-2">
              <Award className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedCount}</p>
              <p className="text-sm text-muted-foreground">Parcours terminés</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reminder Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Rappels automatiques</p>
            <p className="text-sm text-muted-foreground">
              Les membres reçoivent un rappel tous les{" "}
              <strong>{appConfig.fccReminderDays} jours</strong> s&apos;ils n&apos;ont pas mis à jour leur progression.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pending Validations */}
      {pendingValidations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            À valider ({pendingValidations.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingValidations.map((progression) => (
              <ProgressionCard key={progression.id} progression={progression} />
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les progressions</SelectItem>
                <SelectItem value="pending">À valider</SelectItem>
                <SelectItem value="validated">Validées</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* All Progressions Table */}
      <ProgressionsTable />
    </div>
  )
}
