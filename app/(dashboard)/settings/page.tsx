"use client"

import { useState } from "react"
import {
  Settings,
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
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
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
import { appConfig, invitations } from "@/lib/mock-data"

const daysOfWeek = [
  { value: "monday", label: "Lundi" },
  { value: "tuesday", label: "Mardi" },
  { value: "wednesday", label: "Mercredi" },
  { value: "thursday", label: "Jeudi" },
  { value: "friday", label: "Vendredi" },
  { value: "saturday", label: "Samedi" },
  { value: "sunday", label: "Dimanche" },
]

function GeneralSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Informations générales
        </CardTitle>
        <CardDescription>Configurez les informations de base de votre communauté</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="app-name">Nom de la plateforme</Label>
          <Input id="app-name" defaultValue={appConfig.appName} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Décrivez votre communauté..."
            rows={3}
            defaultValue="Communauté d'apprentissage de l'anglais"
          />
        </div>

        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted">
              <Building className="h-6 w-6 text-muted-foreground" />
            </div>
            <Button variant="outline" size="sm">
              Changer le logo
            </Button>
          </div>
        </div>

        <Button>
          <Save className="mr-2 h-4 w-4" />
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  )
}

function ScheduleSettings() {
  const [selectedDays, setSelectedDays] = useState<string[]>(appConfig.scheduleDays)

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Configuration des séances
        </CardTitle>
        <CardDescription>Définissez le calendrier par défaut des séances</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Jours des séances</Label>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day) => (
              <Button
                key={day.value}
                variant={selectedDays.includes(day.value) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleDay(day.value)}
              >
                {day.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-time">Heure de début</Label>
            <Input id="start-time" type="time" defaultValue={appConfig.startTime} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-time">Heure de fin</Label>
            <Input id="end-time" type="time" defaultValue={appConfig.endTime} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="frequency">Fréquence</Label>
          <Select defaultValue={appConfig.frequency}>
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

        <Button>
          <Save className="mr-2 h-4 w-4" />
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  )
}

function AccessSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Accès et invitations
        </CardTitle>
        <CardDescription>Gérez comment les membres rejoignent la communauté</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="access-type">Type d&apos;accès</Label>
          <Select defaultValue={appConfig.accessType}>
            <SelectTrigger id="access-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Ouvert (inscription libre)</SelectItem>
              <SelectItem value="invitation">Sur invitation uniquement</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            En mode &quot;Sur invitation&quot;, seuls les utilisateurs invités peuvent rejoindre.
          </p>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Liens d&apos;invitation actifs</Label>
              <p className="text-sm text-muted-foreground">
                {invitations.filter((i) => !i.usedAt && new Date(i.expiresAt) > new Date()).length}{" "}
                lien(s) actif(s)
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Link2 className="mr-2 h-4 w-4" />
              Gérer les liens
            </Button>
          </div>
        </div>

        <Button>
          <Save className="mr-2 h-4 w-4" />
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  )
}

function RulesSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Règles de la communauté
        </CardTitle>
        <CardDescription>Définissez le règlement interne visible par tous les membres</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rules">Règlement</Label>
          <Textarea
            id="rules"
            placeholder="Écrivez les règles de votre communauté..."
            rows={8}
            defaultValue={appConfig.rules}
            className="font-mono text-sm"
          />
        </div>

        <Button>
          <Save className="mr-2 h-4 w-4" />
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  )
}

function AbsenceSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Gestion des absences
        </CardTitle>
        <CardDescription>Configurez les règles pour les demandes d&apos;absence</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="absence-delay">Délai minimum de demande</Label>
          <div className="flex items-center gap-2">
            <Input
              id="absence-delay"
              type="number"
              min={1}
              defaultValue={appConfig.absenceMinDelayHours}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">heures avant la séance</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Les membres ne pourront pas soumettre de demande d&apos;absence si ce délai n&apos;est pas respecté.
          </p>
        </div>

        <Button>
          <Save className="mr-2 h-4 w-4" />
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  )
}

function FCCSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Suivi FreeCodeCamp
        </CardTitle>
        <CardDescription>Configurez les rappels de progression</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Activer les rappels</Label>
            <p className="text-sm text-muted-foreground">
              Envoyer des rappels aux membres pour mettre à jour leur progression
            </p>
          </div>
          <Switch defaultChecked />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fcc-reminder">Fréquence des rappels</Label>
          <div className="flex items-center gap-2">
            <Input
              id="fcc-reminder"
              type="number"
              min={1}
              defaultValue={appConfig.fccReminderDays}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">jours</span>
          </div>
        </div>

        <Button>
          <Save className="mr-2 h-4 w-4" />
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  )
}

function DangerZone() {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Zone de danger
        </CardTitle>
        <CardDescription>
          Actions irréversibles. Procédez avec prudence.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="font-medium text-foreground">Exporter toutes les données</p>
            <p className="text-sm text-muted-foreground">
              Télécharger une copie complète de toutes les données (JSON ou CSV)
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Exporter les données</DialogTitle>
                <DialogDescription>
                  Choisissez le format d&apos;export pour vos données.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-4">
                <Button className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Export JSON
                </Button>
                <Button variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <div>
            <p className="font-medium text-foreground">Réinitialiser les séances et présences</p>
            <p className="text-sm text-muted-foreground">
              Supprimer toutes les séances et données de présence. Cette action est irréversible.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Réinitialiser
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Elle supprimera définitivement toutes les séances,
                  présences et demandes d&apos;absence associées.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Confirmer la réinitialisation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground">Configurez votre plateforme English Club</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="schedule">Séances</TabsTrigger>
          <TabsTrigger value="access">Accès</TabsTrigger>
          <TabsTrigger value="rules">Règles</TabsTrigger>
          <TabsTrigger value="absences">Absences</TabsTrigger>
          <TabsTrigger value="fcc">FreeCodeCamp</TabsTrigger>
          <TabsTrigger value="danger">Danger</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleSettings />
        </TabsContent>

        <TabsContent value="access">
          <AccessSettings />
        </TabsContent>

        <TabsContent value="rules">
          <RulesSettings />
        </TabsContent>

        <TabsContent value="absences">
          <AbsenceSettings />
        </TabsContent>

        <TabsContent value="fcc">
          <FCCSettings />
        </TabsContent>

        <TabsContent value="danger">
          <DangerZone />
        </TabsContent>
      </Tabs>
    </div>
  )
}
