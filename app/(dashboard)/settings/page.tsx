"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  Building,
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  Download,
  Trash2,
  Save,
  Link2,
  GraduationCap,
  FileText,
  Loader2,
  ImageIcon,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

const DEFAULT_SETTINGS = {
  appName: "English Club",
  appLogoUrl: "",
  rules: "",
  absenceMinDelayHours: 24,
  fccReminderDays: 7,
}

const daysOfWeek = [
  { value: "monday", label: "Lundi" },
  { value: "tuesday", label: "Mardi" },
  { value: "wednesday", label: "Mercredi" },
  { value: "thursday", label: "Jeudi" },
  { value: "friday", label: "Vendredi" },
  { value: "saturday", label: "Samedi" },
  { value: "sunday", label: "Dimanche" },
]

type SettingsData = {
  appName: string
  appLogoUrl?: string
  rules: string
  absenceMinDelayHours: number
  fccReminderDays: number
}

type SettingsApiResponse = {
  success?: boolean
  error?: string
  data?: SettingsData
}

type SaveSettingsResult = {
  ok: boolean
  error?: string
}

type LogoApiResponse = {
  success?: boolean
  error?: string
  data?: {
    appLogoUrl?: string
  }
}

type ResetApiResponse = {
  success?: boolean
  error?: string
  data?: {
    deletedSessions?: number
  }
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T
}

function GeneralSettings({
  data,
  isLoading,
  onSave,
  onLogoUpdated,
}: {
  data: SettingsData | null
  isLoading: boolean
  onSave: (patch: Partial<SettingsData>) => Promise<SaveSettingsResult>
  onLogoUpdated: (appLogoUrl: string) => void
}) {
  const [appName, setAppName] = useState(DEFAULT_SETTINGS.appName)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [feedback, setFeedback] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  useEffect(() => {
    setAppName(data?.appName ?? DEFAULT_SETTINGS.appName)
  }, [data?.appName])

  const saveGeneral = async () => {
    if (!appName.trim()) {
      setFeedback("Le nom de la plateforme est requis.")
      return
    }

    setIsSaving(true)
    setFeedback("")

    const result = await onSave({ appName: appName.trim() })
    setIsSaving(false)

    if (!result.ok) {
      setFeedback(result.error || "Mise a jour impossible.")
      return
    }

    setFeedback("Informations generales enregistrees.")
  }

  const uploadLogo = async () => {
    if (!logoFile) {
      setFeedback("Selectionne un fichier image pour le logo.")
      return
    }

    setIsUploadingLogo(true)
    setFeedback("")

    try {
      const formData = new FormData()
      formData.append("logo", logoFile)

      const response = await fetch("/api/settings/logo", {
        method: "POST",
        body: formData,
      })
      const payload = await readJson<LogoApiResponse>(response)

      if (!response.ok || !payload.success) {
        setFeedback(payload.error || "Upload du logo impossible.")
        return
      }

      const appLogoUrl = payload.data?.appLogoUrl ?? ""
      onLogoUpdated(appLogoUrl)
      setLogoFile(null)
      setFeedback("Logo mis a jour avec succes.")
    } catch {
      setFeedback("Upload du logo impossible pour le moment.")
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const removeLogo = async () => {
    setIsUploadingLogo(true)
    setFeedback("")

    try {
      const response = await fetch("/api/settings/logo", {
        method: "DELETE",
      })
      const payload = await readJson<LogoApiResponse>(response)

      if (!response.ok || !payload.success) {
        setFeedback(payload.error || "Suppression du logo impossible.")
        return
      }

      onLogoUpdated("")
      setLogoFile(null)
      setFeedback("Logo supprime.")
    } catch {
      setFeedback("Suppression du logo impossible pour le moment.")
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const logoUrl = data?.appLogoUrl?.trim() || ""

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Informations generales
        </CardTitle>
        <CardDescription>Configurez les informations de base de votre communaute</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="app-name">Nom de la plateforme</Label>
          <Input
            id="app-name"
            value={appName}
            onChange={(event) => setAppName(event.target.value)}
            disabled={isLoading || isSaving}
          />
        </div>

        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Logo plateforme"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                  disabled={isLoading || isUploadingLogo || isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  Formats acceptes: JPG, PNG, WEBP, SVG (max 2 MB).
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void uploadLogo()}
                disabled={isLoading || isUploadingLogo || !logoFile}
              >
                {isUploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Mettre a jour le logo
              </Button>
              {logoUrl ? (
                <Button
                  variant="ghost"
                  onClick={() => void removeLogo()}
                  disabled={isLoading || isUploadingLogo}
                >
                  Retirer le logo
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {feedback ? <p className="text-xs text-muted-foreground">{feedback}</p> : null}

        <Button
          onClick={() => void saveGeneral()}
          disabled={isLoading || isSaving || isUploadingLogo}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

function ScheduleSettings() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedDays, setSelectedDays] = useState<string[]>(["saturday"])
  const [startTime, setStartTime] = useState("18:00")
  const [endTime, setEndTime] = useState("20:00")
  const [frequency, setFrequency] = useState<"weekly" | "biweekly" | "monthly">("weekly")
  const [feedback, setFeedback] = useState("")

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setFeedback("")

      try {
        const response = await fetch("/api/settings/schedule")
        const payload = (await response.json().catch(() => ({}))) as {
          success?: boolean
          error?: string
          data?: {
            scheduleDays?: string[]
            startTime?: string
            endTime?: string
            frequency?: "weekly" | "biweekly" | "monthly"
          }
        }

        if (!response.ok || !payload.success || !payload.data) {
          if (isMounted) {
            setFeedback(payload.error || "Impossible de charger la configuration des seances.")
          }
          return
        }

        if (!isMounted) {
          return
        }

        setSelectedDays(payload.data.scheduleDays ?? ["saturday"])
        setStartTime(payload.data.startTime ?? "18:00")
        setEndTime(payload.data.endTime ?? "20:00")
        setFrequency(payload.data.frequency ?? "weekly")
      } catch {
        if (isMounted) {
          setFeedback("Impossible de charger la configuration des seances.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [])

  const toggleDay = (day: string) => {
    if (isLoading || isSaving) {
      return
    }

    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const saveSchedule = async () => {
    if (selectedDays.length === 0) {
      setFeedback("Selectionne au moins un jour de seance.")
      return
    }

    setIsSaving(true)
    setFeedback("")

    try {
      const response = await fetch("/api/settings/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleDays: selectedDays,
          startTime,
          endTime,
          frequency,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
        data?: {
          scheduleDays?: string[]
          startTime?: string
          endTime?: string
          frequency?: "weekly" | "biweekly" | "monthly"
        }
      }

      if (!response.ok || !payload.success || !payload.data) {
        setFeedback(payload.error || "Mise a jour impossible.")
        return
      }

      setSelectedDays(payload.data.scheduleDays ?? selectedDays)
      setStartTime(payload.data.startTime ?? startTime)
      setEndTime(payload.data.endTime ?? endTime)
      setFrequency(payload.data.frequency ?? frequency)
      setFeedback("Configuration des seances enregistree.")
    } catch {
      setFeedback("Mise a jour impossible pour le moment.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Configuration des seances
        </CardTitle>
        <CardDescription>Definissez le calendrier par defaut des seances</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Jours des seances</Label>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day) => (
              <Button
                key={day.value}
                variant={selectedDays.includes(day.value) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleDay(day.value)}
                disabled={isLoading || isSaving}
              >
                {day.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-time">Heure de debut</Label>
            <Input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              disabled={isLoading || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-time">Heure de fin</Label>
            <Input
              id="end-time"
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              disabled={isLoading || isSaving}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="frequency">Frequence</Label>
          <Select
            value={frequency}
            onValueChange={(value) =>
              setFrequency(value as "weekly" | "biweekly" | "monthly")
            }
            disabled={isLoading || isSaving}
          >
            <SelectTrigger id="frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Hebdomadaire</SelectItem>
              <SelectItem value="biweekly">Bimensuel</SelectItem>
              <SelectItem value="monthly">Mensuel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {feedback ? <p className="text-xs text-muted-foreground">{feedback}</p> : null}

        <Button onClick={() => void saveSchedule()} disabled={isLoading || isSaving}>
          {isSaving ? (
            "Enregistrement..."
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

function AccessSettings() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [accessType, setAccessType] = useState<"open" | "invitation">("open")
  const [activeInvitationCount, setActiveInvitationCount] = useState(0)
  const [feedback, setFeedback] = useState("")

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setFeedback("")

      try {
        const response = await fetch("/api/settings/access")
        const payload = (await response.json().catch(() => ({}))) as {
          success?: boolean
          error?: string
          data?: {
            accessType?: "open" | "invitation"
            activeInvitationCount?: number
          }
        }

        if (!response.ok || !payload.success || !payload.data) {
          if (isMounted) {
            setFeedback(payload.error || "Impossible de charger les parametres d'acces.")
          }
          return
        }

        if (!isMounted) {
          return
        }

        setAccessType(payload.data.accessType ?? "open")
        setActiveInvitationCount(payload.data.activeInvitationCount ?? 0)
      } catch {
        if (isMounted) {
          setFeedback("Impossible de charger les parametres d'acces.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [])

  const updateAccessType = async (nextValue: "open" | "invitation") => {
    const previous = accessType
    setAccessType(nextValue)
    setIsSaving(true)
    setFeedback("")

    try {
      const response = await fetch("/api/settings/access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessType: nextValue }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
        data?: {
          accessType?: "open" | "invitation"
        }
      }

      if (!response.ok || !payload.success || !payload.data?.accessType) {
        setAccessType(previous)
        setFeedback(payload.error || "Mise a jour impossible.")
        return
      }

      setAccessType(payload.data.accessType)
      setFeedback("Parametre d'acces mis a jour.")
    } catch {
      setAccessType(previous)
      setFeedback("Mise a jour impossible pour le moment.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Acces et invitations
        </CardTitle>
        <CardDescription>Gerez comment les membres rejoignent la communaute</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="access-type">Type d'acces</Label>
          <Select
            value={accessType}
            onValueChange={(value) => void updateAccessType(value as "open" | "invitation")}
            disabled={isLoading || isSaving}
          >
            <SelectTrigger id="access-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Ouvert (inscription libre)</SelectItem>
              <SelectItem value="invitation">Sur invitation uniquement</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            En mode invitation, les inscriptions sans lien valide sont bloquees.
          </p>
          {feedback ? <p className="text-xs text-muted-foreground">{feedback}</p> : null}
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Liens d'invitation actifs</Label>
              <p className="text-sm text-muted-foreground">
                {activeInvitationCount} lien(s) actif(s)
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/members">
                <Link2 className="mr-2 h-4 w-4" />
                Gerer les liens
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RulesSettings({
  data,
  isLoading,
  onSave,
}: {
  data: SettingsData | null
  isLoading: boolean
  onSave: (patch: Partial<SettingsData>) => Promise<SaveSettingsResult>
}) {
  const [rules, setRules] = useState("")
  const [feedback, setFeedback] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setRules(data?.rules ?? "")
  }, [data?.rules])

  const saveRules = async () => {
    setIsSaving(true)
    setFeedback("")

    const result = await onSave({ rules })
    setIsSaving(false)

    if (!result.ok) {
      setFeedback(result.error || "Mise a jour impossible.")
      return
    }

    setFeedback("Regles de la communaute enregistrees.")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Regles de la communaute
        </CardTitle>
        <CardDescription>Definissez le reglement visible par tous les membres</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rules">Reglement</Label>
          <Textarea
            id="rules"
            placeholder="Ecrivez les regles de votre communaute..."
            rows={8}
            value={rules}
            onChange={(event) => setRules(event.target.value)}
            className="font-mono text-sm"
            disabled={isLoading || isSaving}
          />
        </div>

        {feedback ? <p className="text-xs text-muted-foreground">{feedback}</p> : null}

        <Button onClick={() => void saveRules()} disabled={isLoading || isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

function AbsenceSettings({
  data,
  isLoading,
  onSave,
}: {
  data: SettingsData | null
  isLoading: boolean
  onSave: (patch: Partial<SettingsData>) => Promise<SaveSettingsResult>
}) {
  const [absenceMinDelayHours, setAbsenceMinDelayHours] = useState(
    DEFAULT_SETTINGS.absenceMinDelayHours
  )
  const [feedback, setFeedback] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setAbsenceMinDelayHours(data?.absenceMinDelayHours ?? DEFAULT_SETTINGS.absenceMinDelayHours)
  }, [data?.absenceMinDelayHours])

  const saveAbsence = async () => {
    if (!Number.isFinite(absenceMinDelayHours) || absenceMinDelayHours < 1) {
      setFeedback("Le delai doit etre superieur ou egal a 1 heure.")
      return
    }

    setIsSaving(true)
    setFeedback("")

    const result = await onSave({ absenceMinDelayHours })
    setIsSaving(false)

    if (!result.ok) {
      setFeedback(result.error || "Mise a jour impossible.")
      return
    }

    setFeedback("Regles d'absence enregistrees.")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Gestion des absences
        </CardTitle>
        <CardDescription>Configurez les regles pour les demandes d'absence</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="absence-delay">Delai minimum de demande</Label>
          <div className="flex items-center gap-2">
            <Input
              id="absence-delay"
              type="number"
              min={1}
              value={absenceMinDelayHours}
              onChange={(event) =>
                setAbsenceMinDelayHours(Number.parseInt(event.target.value || "0", 10))
              }
              className="w-24"
              disabled={isLoading || isSaving}
            />
            <span className="text-sm text-muted-foreground">heures avant la seance</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Les membres ne peuvent pas soumettre une absence en dessous de ce delai.
          </p>
        </div>

        {feedback ? <p className="text-xs text-muted-foreground">{feedback}</p> : null}

        <Button onClick={() => void saveAbsence()} disabled={isLoading || isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

function FCCSettings({
  data,
  isLoading,
  onSave,
}: {
  data: SettingsData | null
  isLoading: boolean
  onSave: (patch: Partial<SettingsData>) => Promise<SaveSettingsResult>
}) {
  const [fccReminderDays, setFccReminderDays] = useState(DEFAULT_SETTINGS.fccReminderDays)
  const [feedback, setFeedback] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setFccReminderDays(data?.fccReminderDays ?? DEFAULT_SETTINGS.fccReminderDays)
  }, [data?.fccReminderDays])

  const saveFcc = async () => {
    if (!Number.isFinite(fccReminderDays) || fccReminderDays < 1) {
      setFeedback("La frequence doit etre superieure ou egale a 1 jour.")
      return
    }

    setIsSaving(true)
    setFeedback("")

    const result = await onSave({ fccReminderDays })
    setIsSaving(false)

    if (!result.ok) {
      setFeedback(result.error || "Mise a jour impossible.")
      return
    }

    setFeedback("Parametres FreeCodeCamp enregistres.")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Suivi FreeCodeCamp
        </CardTitle>
        <CardDescription>Configurez la frequence des rappels</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fcc-reminder">Frequence des rappels</Label>
          <div className="flex items-center gap-2">
            <Input
              id="fcc-reminder"
              type="number"
              min={1}
              value={fccReminderDays}
              onChange={(event) =>
                setFccReminderDays(Number.parseInt(event.target.value || "0", 10))
              }
              className="w-24"
              disabled={isLoading || isSaving}
            />
            <span className="text-sm text-muted-foreground">jours</span>
          </div>
        </div>

        {feedback ? <p className="text-xs text-muted-foreground">{feedback}</p> : null}

        <Button onClick={() => void saveFcc()} disabled={isLoading || isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

function DangerZone({ onAfterReset }: { onAfterReset: () => Promise<void> }) {
  const [feedback, setFeedback] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const exportData = async () => {
    setIsExporting(true)
    setFeedback("")

    try {
      const response = await fetch("/api/settings/export?format=json", {
        method: "GET",
      })

      if (!response.ok) {
        const payload = await readJson<{ error?: string }>(response)
        setFeedback(payload.error || "Export impossible.")
        return
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get("content-disposition") || ""
      const filenameMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/)
      const filename = filenameMatch?.[1] || `englishclub-export-${Date.now()}.json`

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)

      setFeedback("Export termine.")
    } catch {
      setFeedback("Export impossible pour le moment.")
    } finally {
      setIsExporting(false)
    }
  }

  const resetSessions = async () => {
    setIsResetting(true)
    setFeedback("")

    try {
      const response = await fetch("/api/settings/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      })

      const payload = await readJson<ResetApiResponse>(response)
      if (!response.ok || !payload.success) {
        setFeedback(payload.error || "Reinitialisation impossible.")
        return
      }

      const deletedCount = payload.data?.deletedSessions ?? 0
      setFeedback(`Reinitialisation terminee: ${deletedCount} seance(s) supprimee(s).`)
      await onAfterReset()
    } catch {
      setFeedback("Reinitialisation impossible pour le moment.")
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Zone de danger
        </CardTitle>
        <CardDescription>Actions irreversibles. Procedez avec prudence.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="font-medium text-foreground">Exporter toutes les donnees</p>
            <p className="text-sm text-muted-foreground">
              Telecharger une copie complete de toutes les donnees (JSON).
            </p>
          </div>
          <Button variant="outline" onClick={() => void exportData()} disabled={isExporting || isResetting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Exporter
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <div>
            <p className="font-medium text-foreground">Reinitialiser les seances et presences</p>
            <p className="text-sm text-muted-foreground">
              Supprimer toutes les seances et donnees de presence. Action irreversible.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isResetting || isExporting}>
                <Trash2 className="mr-2 h-4 w-4" />
                Reinitialiser
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Etes-vous absolument sur ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action supprimera definitivement les seances, presences et absences
                  associees.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void resetSessions()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirmer la reinitialisation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {feedback ? <p className="text-xs text-muted-foreground">{feedback}</p> : null}
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [settingsError, setSettingsError] = useState("")

  const loadSettings = useCallback(async () => {
    setIsLoadingSettings(true)
    setSettingsError("")

    try {
      const response = await fetch("/api/settings", { cache: "no-store" })
      const payload = await readJson<SettingsApiResponse>(response)

      if (!response.ok || !payload.success || !payload.data) {
        setSettingsError(payload.error || "Impossible de charger les parametres.")
        setSettings(DEFAULT_SETTINGS)
        return
      }

      setSettings(payload.data)
    } catch {
      setSettingsError("Impossible de contacter le serveur.")
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setIsLoadingSettings(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const saveSettings = useCallback(async (patch: Partial<SettingsData>) => {
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })

      const payload = await readJson<SettingsApiResponse>(response)
      if (!response.ok || !payload.success || !payload.data) {
        return {
          ok: false,
          error: payload.error || "Mise a jour impossible.",
        }
      }

      setSettings(payload.data)
      return { ok: true }
    } catch {
      return {
        ok: false,
        error: "Impossible de contacter le serveur.",
      }
    }
  }, [])

  const updateLogo = useCallback((appLogoUrl: string) => {
    setSettings((prev) => ({
      ...(prev ?? DEFAULT_SETTINGS),
      appLogoUrl,
    }))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Parametres</h1>
        <p className="text-muted-foreground">Configurez votre plateforme English Club</p>
      </div>

      {settingsError ? (
        <p className="text-sm text-destructive">{settingsError}</p>
      ) : null}

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="schedule">Seances</TabsTrigger>
          <TabsTrigger value="access">Acces</TabsTrigger>
          <TabsTrigger value="rules">Regles</TabsTrigger>
          <TabsTrigger value="absences">Absences</TabsTrigger>
          <TabsTrigger value="fcc">FreeCodeCamp</TabsTrigger>
          <TabsTrigger value="danger">Danger</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettings
            data={settings}
            isLoading={isLoadingSettings}
            onSave={saveSettings}
            onLogoUpdated={updateLogo}
          />
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleSettings />
        </TabsContent>

        <TabsContent value="access">
          <AccessSettings />
        </TabsContent>

        <TabsContent value="rules">
          <RulesSettings data={settings} isLoading={isLoadingSettings} onSave={saveSettings} />
        </TabsContent>

        <TabsContent value="absences">
          <AbsenceSettings data={settings} isLoading={isLoadingSettings} onSave={saveSettings} />
        </TabsContent>

        <TabsContent value="fcc">
          <FCCSettings data={settings} isLoading={isLoadingSettings} onSave={saveSettings} />
        </TabsContent>

        <TabsContent value="danger">
          <DangerZone onAfterReset={loadSettings} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
