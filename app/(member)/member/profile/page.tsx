"use client"

import { useEffect, useMemo, useState } from "react"
import {
  User,
  Mail,
  Camera,
  Save,
  Award,
  Calendar,
  TrendingUp,
  BookOpen,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { useAuth } from "@/lib/auth-context"
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client"
import { sessions, attendances, fccProgressions } from "@/lib/mock-data"
import { Spinner } from "@/components/ui/spinner"

function mapClientAuthError(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes("invalid login credentials")) {
    return "Le mot de passe actuel est incorrect."
  }

  if (normalized.includes("password should be at least")) {
    return "Le mot de passe ne respecte pas les criteres de securite."
  }

  if (normalized.includes("same_password")) {
    return "Le nouveau mot de passe doit etre different de l'ancien."
  }

  return message
}

function mapProfileError(message: string, code?: string) {
  if (code === "23505" || message.toLowerCase().includes("duplicate key")) {
    return "Ce pseudo est deja utilise. Choisissez-en un autre."
  }

  return "Impossible de mettre a jour le profil pour le moment."
}

export default function MemberProfilePage() {
  const { user, member, refreshProfile, isLoading } = useAuth()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const [isEditing, setIsEditing] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  
  // Form state
  const [firstName, setFirstName] = useState(user?.firstName || "")
  const [lastName, setLastName] = useState(user?.lastName || "")
  const [pseudo, setPseudo] = useState(user?.pseudo || "")
  const [englishLevel, setEnglishLevel] = useState<"beginner" | "intermediate" | "advanced">(user?.englishLevel || "beginner")
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    if (!user) {
      return
    }

    setFirstName(user.firstName)
    setLastName(user.lastName)
    setPseudo(user.pseudo)
    setEnglishLevel(user.englishLevel)
  }, [user])

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user) return null

  // Get user stats
  const userAttendances = attendances.filter(a => a.user.id === user.id)
  const userFCCProgressions = fccProgressions.filter(p => p.user.id === user.id)
  
  const completedSessions = sessions.filter(s => s.status === "completed")
  const confirmedAttendances = userAttendances.filter(a => a.status === "confirmed")
  const attendanceRate = completedSessions.length > 0 
    ? Math.round((confirmedAttendances.length / completedSessions.length) * 100) 
    : 0
  
  const completedCertificates = userFCCProgressions.filter(p => p.certificateName).length

  const handleSaveProfile = async () => {
    setProfileError("")
    setProfileSuccess(false)

    const nextFirstName = firstName.trim()
    const nextLastName = lastName.trim()
    const nextPseudo = pseudo.trim()

    if (!nextFirstName || !nextLastName || !nextPseudo) {
      setProfileError("Tous les champs de profil sont obligatoires.")
      return
    }

    setIsProfileLoading(true)

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        first_name: nextFirstName,
        last_name: nextLastName,
        pseudo: nextPseudo,
        english_level: englishLevel,
      })
      .eq("id", user.id)

    if (profileUpdateError) {
      setProfileError(mapProfileError(profileUpdateError.message, profileUpdateError.code))
      setIsProfileLoading(false)
      return
    }

    const { error: authUpdateError } = await supabase.auth.updateUser({
      data: {
        first_name: nextFirstName,
        last_name: nextLastName,
        pseudo: nextPseudo,
        english_level: englishLevel,
      },
    })

    if (authUpdateError) {
      setProfileError(mapClientAuthError(authUpdateError.message))
      setIsProfileLoading(false)
      return
    }

    await refreshProfile()

    setProfileSuccess(true)
    setIsEditing(false)
    setIsProfileLoading(false)
  }

  const handleChangePassword = async () => {
    setPasswordError("")
    setPasswordSuccess(false)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Veuillez remplir tous les champs du mot de passe.")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas.")
      return
    }

    if (newPassword.length < 8) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 8 caracteres.")
      return
    }

    if (newPassword === currentPassword) {
      setPasswordError("Le nouveau mot de passe doit etre different de l'ancien.")
      return
    }

    setIsPasswordLoading(true)

    const { error: updatePasswordError } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    })

    if (updatePasswordError) {
      setPasswordError(mapClientAuthError(updatePasswordError.message))
      setIsPasswordLoading(false)
      return
    }

    setPasswordSuccess(true)
    setIsPasswordDialogOpen(false)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setIsPasswordLoading(false)
  }

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "beginner": return "Debutant"
      case "intermediate": return "Intermediaire"
      case "advanced": return "Avance"
      default: return level
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon Profil</h1>
        <p className="text-muted-foreground">
          Gerez vos informations personnelles et parametres
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Informations personnelles</CardTitle>
                  <CardDescription>
                    Mettez a jour vos informations de profil
                  </CardDescription>
                </div>
                {!isEditing ? (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Modifier
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      disabled={isProfileLoading}
                    >
                      Annuler
                    </Button>
                    <Button onClick={handleSaveProfile} disabled={isProfileLoading}>
                      <Save className="mr-2 h-4 w-4" />
                      {isProfileLoading ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {profileError && (
                <Alert variant="destructive">
                  <AlertDescription>{profileError}</AlertDescription>
                </Alert>
              )}

              {profileSuccess && (
                <Alert className="border-green-500 bg-green-50 text-green-700">
                  <AlertDescription>Profil mis a jour avec succes.</AlertDescription>
                </Alert>
              )}

              {/* Avatar */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                    <AvatarImage src={user.photoUrl} alt={user.firstName} />
                    <AvatarFallback className="text-2xl">
                      {user.firstName[0]}{user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button 
                      size="icon" 
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-muted-foreground">@{user.pseudo}</p>
                  <Badge variant="secondary" className="mt-2">
                    {getLevelLabel(user.englishLevel)}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Form Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prenom</Label>
                  {isEditing ? (
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value)
                        setProfileError("")
                        setProfileSuccess(false)
                      }}
                    />
                  ) : (
                    <p className="py-2 text-foreground">{user.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  {isEditing ? (
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value)
                        setProfileError("")
                        setProfileSuccess(false)
                      }}
                    />
                  ) : (
                    <p className="py-2 text-foreground">{user.lastName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pseudo">Pseudo</Label>
                  {isEditing ? (
                    <Input
                      id="pseudo"
                      value={pseudo}
                      onChange={(e) => {
                        setPseudo(e.target.value)
                        setProfileError("")
                        setProfileSuccess(false)
                      }}
                    />
                  ) : (
                    <p className="py-2 text-foreground">@{user.pseudo}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">Niveau d&apos;anglais</Label>
                  {isEditing ? (
                    <Select
                      value={englishLevel}
                      onValueChange={(value) => {
                        setEnglishLevel(value as "beginner" | "intermediate" | "advanced")
                        setProfileError("")
                        setProfileSuccess(false)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Debutant</SelectItem>
                        <SelectItem value="intermediate">Intermediaire</SelectItem>
                        <SelectItem value="advanced">Avance</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="py-2 text-foreground">{getLevelLabel(user.englishLevel)}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label>Adresse email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  L&apos;adresse email ne peut pas etre modifiee
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card>
            <CardHeader>
              <CardTitle>Securite</CardTitle>
              <CardDescription>
                Gerez votre mot de passe
              </CardDescription>
            </CardHeader>
            <CardContent>
              {passwordSuccess && (
                <Alert className="mb-4 border-green-500 bg-green-50 text-green-700">
                  <AlertDescription>Mot de passe modifie avec succes.</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Mot de passe</p>
                    <p className="text-sm text-muted-foreground">
                      Derniere modification il y a 30 jours
                    </p>
                  </div>
                </div>
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Modifier</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Modifier le mot de passe</DialogTitle>
                      <DialogDescription>
                        Entrez votre mot de passe actuel et choisissez un nouveau mot de passe
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {passwordError && (
                        <Alert variant="destructive">
                          <AlertDescription>{passwordError}</AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => {
                              setCurrentPassword(e.target.value)
                              setPasswordError("")
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value)
                              setPasswordError("")
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value)
                            setPasswordError("")
                          }}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button 
                        onClick={handleChangePassword}
                        disabled={
                          isPasswordLoading ||
                          !currentPassword ||
                          !newPassword ||
                          newPassword !== confirmPassword
                        }
                      >
                        {isPasswordLoading ? "Modification..." : "Modifier"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Taux de presence</span>
                  <span className="text-sm font-medium">{attendanceRate}%</span>
                </div>
                <Progress value={attendanceRate} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold">{confirmedAttendances.length}</p>
                  <p className="text-xs text-muted-foreground">Presences</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Award className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                  <p className="text-2xl font-bold">{completedCertificates}</p>
                  <p className="text-xs text-muted-foreground">Certificats</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-3">Membre depuis</p>
                <p className="text-muted-foreground">
                  {member ? new Date(member.joined_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  }) : "N/A"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progression FCC</CardTitle>
            </CardHeader>
            <CardContent>
              {userFCCProgressions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune progression enregistree
                </p>
              ) : (
                <div className="space-y-3">
                  {userFCCProgressions.slice(0, 3).map((prog) => (
                    <div key={prog.id} className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        prog.certificateName ? "bg-amber-500/10" : "bg-blue-500/10"
                      }`}>
                        {prog.certificateName ? (
                          <Award className="h-4 w-4 text-amber-500" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{prog.track}</p>
                        <p className="text-xs text-muted-foreground">
                          {prog.modulesCompleted}/5 modules
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
