"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  GraduationCap,
  Award,
  Plus,
  CheckCircle2,
  Clock,
  ExternalLink,
  Pencil,
  BookOpen,
  Loader2,
  Eye,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"

const FCC_TRACKS = [
  "Responsive Web Design",
  "JavaScript Algorithms and Data Structures",
  "Front End Development Libraries",
  "Data Visualization",
  "Back End Development and APIs",
  "Quality Assurance",
  "Scientific Computing with Python",
  "Data Analysis with Python",
  "Information Security",
  "Machine Learning with Python",
]

const FCC_LEVELS = ["Starting", "In Progress", "Almost Done", "Completed"] as const

type FccLevel = (typeof FCC_LEVELS)[number]

type ApiFccProgression = {
  id: string
  user_id: string
  track: string
  level: FccLevel
  modules_completed: number
  certificate_name: string | null
  screenshot_url: string | null
  screenshot_signed_url: string | null
  validated_by: string | null
  validated_at: string | null
  created_at: string
  updated_at: string
}

type ApiListResponse = {
  success?: boolean
  error?: string
  data?: ApiFccProgression[]
}

type ApiMutationResponse = {
  success?: boolean
  error?: string
  data?: ApiFccProgression
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T
}

export default function MemberFreeCodeCampPage() {
  const { user } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pageError, setPageError] = useState("")
  const [formError, setFormError] = useState("")
  const [progressions, setProgressions] = useState<ApiFccProgression[]>([])

  const [selectedTrack, setSelectedTrack] = useState("")
  const [selectedLevel, setSelectedLevel] = useState("")
  const [modulesCompleted, setModulesCompleted] = useState("")
  const [certificateName, setCertificateName] = useState("")
  const [proofFile, setProofFile] = useState<File | null>(null)

  const resetForm = useCallback(() => {
    setEditingId(null)
    setSelectedTrack("")
    setSelectedLevel("")
    setModulesCompleted("")
    setCertificateName("")
    setProofFile(null)
    setFormError("")
  }, [])

  const loadProgressions = useCallback(async () => {
    if (!user?.id) {
      setProgressions([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setPageError("")

    try {
      const response = await fetch(`/api/fcc/${encodeURIComponent(user.id)}`, {
        method: "GET",
        cache: "no-store",
      })
      const payload = await readJson<ApiListResponse>(response)

      if (!response.ok) {
        setPageError(payload.error || "Impossible de charger vos progressions.")
        setProgressions([])
        return
      }

      setProgressions(payload.data ?? [])
    } catch {
      setPageError("Impossible de contacter le serveur.")
      setProgressions([])
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void loadProgressions()
  }, [loadProgressions])

  const handleOpenDialog = useCallback(
    (progressionId?: string) => {
      setFormError("")

      if (progressionId) {
        const progression = progressions.find((item) => item.id === progressionId)
        if (!progression) {
          return
        }

        setEditingId(progressionId)
        setSelectedTrack(progression.track)
        setSelectedLevel(progression.level)
        setModulesCompleted(String(progression.modules_completed))
        setCertificateName(progression.certificate_name ?? "")
        setProofFile(null)
      } else {
        resetForm()
      }

      setIsDialogOpen(true)
    },
    [progressions, resetForm]
  )

  const handleSubmit = useCallback(async () => {
    if (!selectedTrack || !selectedLevel || modulesCompleted === "") {
      setFormError("Complete les champs obligatoires.")
      return
    }

    const parsedModules = Number(modulesCompleted)
    if (!Number.isInteger(parsedModules) || parsedModules < 0 || parsedModules > 5) {
      setFormError("Le nombre de modules doit etre un entier entre 0 et 5.")
      return
    }

    if (selectedLevel === "Completed" && !certificateName.trim()) {
      setFormError("Le nom du certificat est requis pour Completed.")
      return
    }

    setIsSaving(true)
    setFormError("")

    try {
      const saveResponse = await fetch("/api/fcc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId ?? undefined,
          track: selectedTrack,
          level: selectedLevel,
          modulesCompleted: parsedModules,
          certificateName: certificateName.trim() || null,
        }),
      })

      const savePayload = await readJson<ApiMutationResponse>(saveResponse)
      if (!saveResponse.ok || !savePayload.data) {
        setFormError(savePayload.error || "Impossible d'enregistrer la progression.")
        return
      }

      if (proofFile) {
        const formData = new FormData()
        formData.set("file", proofFile)

        const screenshotResponse = await fetch(
          `/api/fcc/${encodeURIComponent(savePayload.data.id)}/screenshot`,
          {
            method: "POST",
            body: formData,
          }
        )

        const screenshotPayload = await readJson<ApiMutationResponse>(screenshotResponse)
        if (!screenshotResponse.ok) {
          setFormError(
            screenshotPayload.error ||
              "Progression enregistree, mais upload de la preuve impossible."
          )
          return
        }
      }

      await loadProgressions()
      setIsDialogOpen(false)
      resetForm()
    } catch {
      setFormError("Impossible de contacter le serveur.")
    } finally {
      setIsSaving(false)
    }
  }, [
    certificateName,
    editingId,
    loadProgressions,
    modulesCompleted,
    proofFile,
    resetForm,
    selectedLevel,
    selectedTrack,
  ])

  const completedCertificates = useMemo(
    () => progressions.filter((item) => !!item.certificate_name).length,
    [progressions]
  )
  const inProgressTracks = useMemo(
    () => progressions.filter((item) => !item.certificate_name).length,
    [progressions]
  )
  const totalModules = useMemo(
    () => progressions.reduce((acc, item) => acc + item.modules_completed, 0),
    [progressions]
  )

  const getProgressValue = useCallback((level: string, modules: number) => {
    if (level === "Completed") {
      return 100
    }
    return Math.min((modules / 5) * 100, 95)
  }, [])

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">FreeCodeCamp</h1>
          <p className="text-muted-foreground">Suivez et mettez a jour votre progression.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="https://www.freecodecamp.org" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Aller sur FCC
            </a>
          </Button>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) {
                resetForm()
              }
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle progression
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Modifier la progression" : "Ajouter une progression"}
                </DialogTitle>
                <DialogDescription>
                  Selectionnez un parcours, votre niveau et ajoutez une preuve si besoin.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="fcc-track">Parcours</Label>
                  <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                    <SelectTrigger id="fcc-track">
                      <SelectValue placeholder="Selectionnez un parcours" />
                    </SelectTrigger>
                    <SelectContent>
                      {FCC_TRACKS.map((track) => (
                        <SelectItem key={track} value={track}>
                          {track}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fcc-level">Niveau</Label>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger id="fcc-level">
                      <SelectValue placeholder="Selectionnez un niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      {FCC_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fcc-modules">Modules completes</Label>
                  <Input
                    id="fcc-modules"
                    type="number"
                    min={0}
                    max={5}
                    placeholder="Ex: 3"
                    value={modulesCompleted}
                    onChange={(event) => setModulesCompleted(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Nombre de modules completes sur ce parcours (0-5)
                  </p>
                </div>

                {selectedLevel === "Completed" ? (
                  <div className="space-y-2">
                    <Label htmlFor="fcc-certificate">Nom du certificat</Label>
                    <Input
                      id="fcc-certificate"
                      placeholder="Ex: Responsive Web Design Certificate"
                      value={certificateName}
                      onChange={(event) => setCertificateName(event.target.value)}
                    />
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="fcc-proof-file">Capture d'ecran (optionnel)</Label>
                  <Input
                    id="fcc-proof-file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null
                      setProofFile(nextFile)
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    JPG/PNG/WEBP, taille max 5 MB.
                  </p>
                </div>

                {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSaving}
                >
                  Annuler
                </Button>
                <Button onClick={() => void handleSubmit()} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : editingId ? (
                    "Mettre a jour"
                  ) : (
                    "Ajouter"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Certificats obtenus</CardTitle>
            <Award className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{completedCertificates}</div>
            <p className="text-xs text-muted-foreground">certification(s) FreeCodeCamp</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressTracks}</div>
            <p className="text-xs text-muted-foreground">parcours en progression</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Modules completes</CardTitle>
            <GraduationCap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalModules}</div>
            <p className="text-xs text-muted-foreground">modules au total</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mes progressions</CardTitle>
          <CardDescription>Vos parcours FreeCodeCamp et leur avancement</CardDescription>
        </CardHeader>
        <CardContent>
          {pageError ? <p className="text-sm text-destructive">{pageError}</p> : null}

          {isLoading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des progressions...
            </div>
          ) : progressions.length === 0 ? (
            <div className="py-12 text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">
                Vous n'avez pas encore declare de progression FreeCodeCamp.
              </p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter ma premiere progression
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {progressions.map((progression) => (
                <div key={progression.id} className="rounded-lg border p-4">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                          progression.certificate_name ? "bg-amber-500/10" : "bg-blue-500/10"
                        }`}
                      >
                        {progression.certificate_name ? (
                          <Award className="h-6 w-6 text-amber-500" />
                        ) : (
                          <BookOpen className="h-6 w-6 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{progression.track}</h3>
                          {progression.validated_at ? (
                            <Badge className="bg-green-600 text-white">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Valide
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-amber-500/20 bg-amber-500/10 text-amber-600"
                            >
                              <Clock className="mr-1 h-3 w-3" />
                              En attente
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {progression.modules_completed} modules completes sur 5
                        </p>
                        {progression.certificate_name ? (
                          <p className="mt-1 text-sm font-medium text-amber-600">
                            {progression.certificate_name}
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs text-muted-foreground">
                          Mis a jour le{" "}
                          {new Date(progression.updated_at).toLocaleDateString("fr-FR")}
                        </p>
                        {progression.screenshot_signed_url ? (
                          <Button variant="link" size="sm" className="h-auto px-0 py-1" asChild>
                            <a
                              href={progression.screenshot_signed_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              Voir la preuve
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(progression.id)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Modifier
                    </Button>
                  </div>
                  <Progress
                    value={getProgressValue(progression.level, progression.modules_completed)}
                    className="mt-4"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parcours disponibles</CardTitle>
          <CardDescription>Tous les parcours FreeCodeCamp que vous pouvez suivre</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {FCC_TRACKS.map((track) => {
              const progression = progressions.find((item) => item.track === track)

              return (
                <div
                  key={track}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    progression ? "bg-muted/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <GraduationCap
                      className={`h-5 w-5 ${
                        progression?.certificate_name
                          ? "text-amber-500"
                          : progression
                            ? "text-blue-500"
                            : "text-muted-foreground"
                      }`}
                    />
                    <span className="text-sm">{track}</span>
                  </div>
                  {progression?.certificate_name ? (
                    <Badge className="border-0 bg-amber-500/10 text-amber-600">
                      <Award className="mr-1 h-3 w-3" />
                      Certifie
                    </Badge>
                  ) : progression ? (
                    <Badge variant="secondary">En cours</Badge>
                  ) : null}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
