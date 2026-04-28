"use client"

import { useState } from "react"
import {
  GraduationCap,
  Award,
  Plus,
  Upload,
  CheckCircle2,
  Clock,
  ExternalLink,
  Pencil,
  BookOpen,
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
import { fccProgressions } from "@/lib/mock-data"

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

const FCC_LEVELS = [
  "Starting",
  "In Progress",
  "Almost Done",
  "Completed",
]

export default function MemberFreeCodeCampPage() {
  const { user } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Form state
  const [selectedTrack, setSelectedTrack] = useState("")
  const [selectedLevel, setSelectedLevel] = useState("")
  const [modulesCompleted, setModulesCompleted] = useState("")
  const [certificateName, setCertificateName] = useState("")

  if (!user) return null

  // Get user progressions
  const userProgressions = fccProgressions.filter((p) => p.user.id === user.id)
  const completedCertificates = userProgressions.filter(p => p.certificateName).length
  const inProgressTracks = userProgressions.filter(p => !p.certificateName).length
  const totalModules = userProgressions.reduce((acc, p) => acc + p.modulesCompleted, 0)

  const handleOpenDialog = (progressionId?: string) => {
    if (progressionId) {
      const progression = userProgressions.find(p => p.id === progressionId)
      if (progression) {
        setEditingId(progressionId)
        setSelectedTrack(progression.track)
        setSelectedLevel(progression.level)
        setModulesCompleted(progression.modulesCompleted.toString())
        setCertificateName(progression.certificateName || "")
      }
    } else {
      setEditingId(null)
      setSelectedTrack("")
      setSelectedLevel("")
      setModulesCompleted("")
      setCertificateName("")
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = () => {
    // In real app, this would call an API
    console.log("Submitting FCC progression:", {
      track: selectedTrack,
      level: selectedLevel,
      modulesCompleted: parseInt(modulesCompleted),
      certificateName: certificateName || null,
    })
    setIsDialogOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setEditingId(null)
    setSelectedTrack("")
    setSelectedLevel("")
    setModulesCompleted("")
    setCertificateName("")
  }

  const getProgressValue = (level: string, modules: number) => {
    if (level === "Completed") return 100
    // Assuming 5 modules per track
    return Math.min((modules / 5) * 100, 95)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">FreeCodeCamp</h1>
          <p className="text-muted-foreground">
            Suivez et mettez a jour votre progression FreeCodeCamp
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="https://www.freecodecamp.org" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Aller sur FCC
            </a>
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}>
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
                  {editingId 
                    ? "Mettez a jour votre progression sur ce parcours."
                    : "Selectionnez un parcours et indiquez votre progression actuelle."
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="track">Parcours</Label>
                  <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                    <SelectTrigger>
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
                  <Label htmlFor="level">Niveau</Label>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger>
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
                  <Label htmlFor="modules">Modules completes</Label>
                  <Input
                    id="modules"
                    type="number"
                    min="0"
                    max="5"
                    placeholder="Ex: 3"
                    value={modulesCompleted}
                    onChange={(e) => setModulesCompleted(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Nombre de modules completes sur ce parcours (0-5)
                  </p>
                </div>

                {selectedLevel === "Completed" && (
                  <div className="space-y-2">
                    <Label htmlFor="certificate">Nom du certificat</Label>
                    <Input
                      id="certificate"
                      placeholder="Ex: Responsive Web Design Certificate"
                      value={certificateName}
                      onChange={(e) => setCertificateName(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Capture d&apos;ecran (preuve)</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Glissez une image ou cliquez pour selectionner
                    </p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Parcourir
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={!selectedTrack || !selectedLevel || !modulesCompleted}
                >
                  {editingId ? "Mettre a jour" : "Ajouter"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Certificats obtenus</CardTitle>
            <Award className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{completedCertificates}</div>
            <p className="text-xs text-muted-foreground">
              certification{completedCertificates !== 1 ? "s" : ""} FreeCodeCamp
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressTracks}</div>
            <p className="text-xs text-muted-foreground">
              parcours en progression
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Modules completes</CardTitle>
            <GraduationCap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalModules}</div>
            <p className="text-xs text-muted-foreground">
              modules au total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progressions */}
      <Card>
        <CardHeader>
          <CardTitle>Mes progressions</CardTitle>
          <CardDescription>
            Vos parcours FreeCodeCamp et leur avancement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userProgressions.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">
                Vous n&apos;avez pas encore declare de progression FreeCodeCamp.
              </p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter ma premiere progression
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {userProgressions.map((progression) => (
                <div
                  key={progression.id}
                  className="rounded-lg border p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                        progression.certificateName 
                          ? "bg-amber-500/10" 
                          : "bg-blue-500/10"
                      }`}>
                        {progression.certificateName ? (
                          <Award className="h-6 w-6 text-amber-500" />
                        ) : (
                          <BookOpen className="h-6 w-6 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{progression.track}</h3>
                          {progression.validatedAt ? (
                            <Badge className="bg-green-500 text-white">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Valide
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                              <Clock className="mr-1 h-3 w-3" />
                              En attente
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {progression.modulesCompleted} modules completes sur 5
                        </p>
                        {progression.certificateName && (
                          <p className="text-sm font-medium text-amber-600 mt-1">
                            {progression.certificateName}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Mis a jour le {new Date(progression.updatedAt).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenDialog(progression.id)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Modifier
                    </Button>
                  </div>
                  <Progress 
                    value={getProgressValue(progression.level, progression.modulesCompleted)} 
                    className="mt-4"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Tracks */}
      <Card>
        <CardHeader>
          <CardTitle>Parcours disponibles</CardTitle>
          <CardDescription>
            Tous les parcours FreeCodeCamp que vous pouvez suivre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {FCC_TRACKS.map((track) => {
              const userProgress = userProgressions.find(p => p.track === track)
              return (
                <div
                  key={track}
                  className={`rounded-lg border p-3 flex items-center justify-between ${
                    userProgress ? "bg-muted/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <GraduationCap className={`h-5 w-5 ${
                      userProgress?.certificateName 
                        ? "text-amber-500" 
                        : userProgress 
                          ? "text-blue-500" 
                          : "text-muted-foreground"
                    }`} />
                    <span className="text-sm">{track}</span>
                  </div>
                  {userProgress?.certificateName ? (
                    <Badge className="bg-amber-500/10 text-amber-600 border-0">
                      <Award className="mr-1 h-3 w-3" />
                      Certifie
                    </Badge>
                  ) : userProgress ? (
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
