"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
  Loader2,
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

const trackColors: Record<string, string> = {
  "Responsive Web Design": "bg-chart-1/20 text-chart-1",
  "JavaScript Algorithms and Data Structures": "bg-chart-3/20 text-chart-3",
  "Front End Development Libraries": "bg-chart-2/20 text-chart-2",
  "Back End Development and APIs": "bg-chart-4/20 text-chart-4",
  "Data Visualization": "bg-primary/20 text-primary",
}

type ApiFccUser = {
  id: string
  first_name: string
  last_name: string
  pseudo: string
  photo_url: string | null
  english_level: "beginner" | "intermediate" | "advanced"
}

type ApiFccProgression = {
  id: string
  user_id: string
  track: string
  level: "Starting" | "In Progress" | "Almost Done" | "Completed"
  modules_completed: number
  certificate_name: string | null
  screenshot_url: string | null
  screenshot_signed_url: string | null
  validated_by: string | null
  validated_at: string | null
  created_at: string
  updated_at: string
  user: ApiFccUser | null
  validator: ApiFccUser | null
}

type ApiListResponse = {
  success?: boolean
  error?: string
  data?: ApiFccProgression[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

type ApiMutationResponse = {
  success?: boolean
  error?: string
  data?: ApiFccProgression
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T
}

function ProgressionCard({
  progression,
  actionId,
  onValidate,
}: {
  progression: ApiFccProgression
  actionId: string | null
  onValidate: (id: string, validated: boolean) => Promise<void>
}) {
  const progressPercent = (progression.modules_completed / 5) * 100
  const trackColor = trackColors[progression.track] || "bg-muted text-muted-foreground"
  const isValidated = !!progression.validated_at
  const isBusy = actionId === progression.id
  const userName = progression.user
    ? `${progression.user.first_name} ${progression.user.last_name}`
    : progression.user_id
  const userPseudo = progression.user?.pseudo ?? progression.user_id

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={progression.user?.photo_url ?? undefined} />
              <AvatarFallback>
                {(progression.user?.first_name?.[0] ?? "U").toUpperCase()}
                {(progression.user?.last_name?.[0] ?? "N").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{userName}</CardTitle>
              <CardDescription>@{userPseudo}</CardDescription>
            </div>
          </div>
          {isValidated ? (
            <Badge variant="default" className="gap-1 bg-accent">
              <CheckCircle className="h-3 w-3" />
              Valide
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
            <span className="font-medium text-foreground">{progression.modules_completed}/5 modules</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Niveau</span>
          <Badge variant="outline">{progression.level}</Badge>
        </div>

        {progression.certificate_name ? (
          <div className="flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-chart-3" />
            <span className="text-foreground">{progression.certificate_name}</span>
          </div>
        ) : null}

        <div className="text-xs text-muted-foreground">
          Mis a jour le {new Date(progression.updated_at).toLocaleDateString("fr-FR")}
        </div>

        {!isValidated ? (
          <div className="flex gap-2 border-t border-border pt-2">
            {progression.screenshot_signed_url ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Image className="mr-2 h-4 w-4" />
                    Voir la preuve
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Capture d'ecran</DialogTitle>
                    <DialogDescription>Preuve de progression de {userName}</DialogDescription>
                  </DialogHeader>
                  <div className="overflow-hidden rounded-lg border bg-muted/20">
                    <img
                      src={progression.screenshot_signed_url}
                      alt={`Preuve de ${userName}`}
                      className="h-auto w-full object-contain"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            ) : null}
            <Button
              size="sm"
              className="flex-1 bg-accent hover:bg-accent/90"
              onClick={() => void onValidate(progression.id, true)}
              disabled={isBusy}
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Valider
                </>
              )}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ProgressionsTable({
  rows,
  actionId,
  onValidate,
}: {
  rows: ApiFccProgression[]
  actionId: string | null
  onValidate: (id: string, validated: boolean) => Promise<void>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Vue d'ensemble</CardTitle>
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
              <TableHead>Mis a jour</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((progression) => {
              const trackColor = trackColors[progression.track] || "bg-muted text-muted-foreground"
              const userName = progression.user
                ? `${progression.user.first_name} ${progression.user.last_name}`
                : progression.user_id
              const isBusy = actionId === progression.id

              return (
                <TableRow key={progression.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={progression.user?.photo_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {(progression.user?.first_name?.[0] ?? "U").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">{userName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${trackColor}`}>
                      {progression.track.length > 25
                        ? `${progression.track.substring(0, 25)}...`
                        : progression.track}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Progress value={(progression.modules_completed / 5) * 100} className="h-1.5 w-12" />
                      <span className="text-xs text-muted-foreground">{progression.modules_completed}/5</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {progression.level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {progression.validated_at ? (
                      <Badge variant="default" className="bg-accent text-xs">
                        Valide
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        En attente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(progression.updated_at).toLocaleDateString("fr-FR")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Details de la progression</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={progression.user?.photo_url ?? undefined} />
                              <AvatarFallback>
                                {(progression.user?.first_name?.[0] ?? "U").toUpperCase()}
                                {(progression.user?.last_name?.[0] ?? "N").toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{userName}</p>
                              <p className="text-sm text-muted-foreground">
                                @{progression.user?.pseudo ?? progression.user_id}
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
                              <strong>Modules termines :</strong> {progression.modules_completed}/5
                            </p>
                            {progression.certificate_name ? (
                              <p>
                                <strong>Certificat :</strong> {progression.certificate_name}
                              </p>
                            ) : null}
                          </div>
                          <div className="space-y-2">
                            <strong className="text-sm">Progression</strong>
                            <Progress value={(progression.modules_completed / 5) * 100} className="h-2" />
                          </div>
                          {progression.screenshot_signed_url ? (
                            <div className="space-y-2">
                              <strong className="text-sm">Preuve</strong>
                              <img
                                src={progression.screenshot_signed_url}
                                alt={`Preuve ${userName}`}
                                className="max-h-[320px] w-full rounded-lg border object-contain"
                              />
                            </div>
                          ) : null}
                        </div>
                        <DialogFooter>
                          {!progression.validated_at ? (
                            <Button
                              className="bg-accent hover:bg-accent/90"
                              onClick={() => void onValidate(progression.id, true)}
                              disabled={isBusy}
                            >
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Valider la progression
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => void onValidate(progression.id, false)}
                              disabled={isBusy}
                            >
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Retirer la validation"
                              )}
                            </Button>
                          )}
                        </DialogFooter>
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
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "validated">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [actionId, setActionId] = useState<string | null>(null)
  const [progressions, setProgressions] = useState<ApiFccProgression[]>([])

  const loadProgressions = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage("")

    try {
      const response = await fetch("/api/fcc?limit=100&page=1", {
        method: "GET",
        cache: "no-store",
      })
      const payload = await readJson<ApiListResponse>(response)

      if (!response.ok) {
        setErrorMessage(payload.error || "Impossible de charger les progressions FCC.")
        setProgressions([])
        return
      }

      setProgressions(payload.data ?? [])
    } catch {
      setErrorMessage("Impossible de contacter le serveur.")
      setProgressions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProgressions()
  }, [loadProgressions])

  const handleValidate = useCallback(
    async (progressionId: string, validated: boolean) => {
      setActionId(progressionId)
      setErrorMessage("")

      try {
        const response = await fetch(`/api/fcc/${encodeURIComponent(progressionId)}/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ validated }),
        })
        const payload = await readJson<ApiMutationResponse>(response)

        if (!response.ok || !payload.data) {
          setErrorMessage(payload.error || "Impossible de mettre a jour la validation.")
          return
        }

        setProgressions((prev) =>
          prev.map((row) => (row.id === payload.data?.id ? payload.data : row))
        )
      } catch {
        setErrorMessage("Impossible de contacter le serveur.")
      } finally {
        setActionId(null)
      }
    },
    []
  )

  const pendingValidations = useMemo(
    () => progressions.filter((item) => !item.validated_at),
    [progressions]
  )
  const validatedProgressions = useMemo(
    () => progressions.filter((item) => !!item.validated_at),
    [progressions]
  )
  const completedCount = useMemo(
    () => progressions.filter((item) => item.level === "Completed").length,
    [progressions]
  )

  const filteredProgressions = useMemo(() => {
    if (statusFilter === "pending") {
      return pendingValidations
    }
    if (statusFilter === "validated") {
      return validatedProgressions
    }
    return progressions
  }, [pendingValidations, progressions, statusFilter, validatedProgressions])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suivi FreeCodeCamp</h1>
          <p className="text-muted-foreground">Suivez et validez les progressions des membres.</p>
        </div>
        <Button variant="outline" asChild>
          <a href="https://www.freecodecamp.org" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Ouvrir FreeCodeCamp
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{progressions.length}</p>
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
              <p className="text-sm text-muted-foreground">A valider</p>
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
              <p className="text-sm text-muted-foreground">Validees</p>
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
              <p className="text-sm text-muted-foreground">Parcours termines</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <TrendingUp className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
          <div>
            <p className="font-medium text-foreground">Rappels automatiques</p>
            <p className="text-sm text-muted-foreground">
              Les rappels FCC sont bases sur la configuration de l'application.
            </p>
          </div>
        </CardContent>
      </Card>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des progressions...
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && pendingValidations.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            A valider ({pendingValidations.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingValidations.map((progression) => (
              <ProgressionCard
                key={progression.id}
                progression={progression}
                actionId={actionId}
                onValidate={handleValidate}
              />
            ))}
          </div>
        </div>
      ) : null}

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as "all" | "pending" | "validated")}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les progressions</SelectItem>
                <SelectItem value="pending">A valider</SelectItem>
                <SelectItem value="validated">Validees</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <ProgressionsTable rows={filteredProgressions} actionId={actionId} onValidate={handleValidate} />
    </div>
  )
}
