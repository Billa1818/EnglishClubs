"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  User,
  Mail,
  AtSign,
  Camera,
  Save,
  Eye,
  EyeOff,
  Lock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Calendar,
  Award,
  TrendingUp,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { currentUser, members, attendances, fccProgressions, sessions } from "@/lib/mock-data"

const englishLevels = [
  { value: "beginner", label: "Debutant" },
  { value: "intermediate", label: "Intermediaire" },
  { value: "advanced", label: "Avance" },
]

export default function ProfilePage() {
  const router = useRouter()
  const member = members.find((m) => m.user.id === currentUser.id)
  const userAttendances = attendances.filter((a) => a.user.id === currentUser.id)
  const userFCCProgress = fccProgressions.filter((p) => p.user.id === currentUser.id)

  const [profileData, setProfileData] = useState({
    firstName: currentUser.firstName,
    lastName: currentUser.lastName,
    pseudo: currentUser.pseudo,
    email: currentUser.email,
    englishLevel: currentUser.englishLevel,
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [profileError, setProfileError] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const passwordRequirements = [
    { test: passwordData.newPassword.length >= 8, label: "Au moins 8 caracteres" },
    { test: /[A-Z]/.test(passwordData.newPassword), label: "Une majuscule" },
    { test: /[a-z]/.test(passwordData.newPassword), label: "Une minuscule" },
    { test: /[0-9]/.test(passwordData.newPassword), label: "Un chiffre" },
  ]

  const isPasswordValid = passwordRequirements.every((req) => req.test) || passwordData.newPassword === ""
  const doPasswordsMatch =
    passwordData.newPassword === passwordData.confirmPassword || passwordData.confirmPassword === ""

  // Stats calculations
  const totalSessions = sessions.filter((s) => s.status === "completed").length
  const attendedSessions = userAttendances.filter((a) => a.status === "confirmed").length
  const attendanceRate = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0
  const completedCertifications = userFCCProgress.filter((p) => p.validatedAt).length

  const handleProfileChange = (field: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }))
    setProfileSuccess(false)
    setProfileError("")
  }

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }))
    setPasswordSuccess(false)
    setPasswordError("")
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError("")
    setIsProfileLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    setProfileSuccess(true)
    setIsProfileLoading(false)
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")

    if (!isPasswordValid) {
      setPasswordError("Le nouveau mot de passe ne respecte pas les criteres requis.")
      return
    }

    if (!doPasswordsMatch) {
      setPasswordError("Les mots de passe ne correspondent pas.")
      return
    }

    setIsPasswordLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Mock validation
    if (passwordData.currentPassword !== "admin123" && passwordData.currentPassword !== "membre123") {
      setPasswordError("Le mot de passe actuel est incorrect.")
      setIsPasswordLoading(false)
      return
    }

    setPasswordSuccess(true)
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    setIsPasswordLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mon Profil</h1>
        <p className="text-muted-foreground">
          Gerez vos informations personnelles et vos preferences
        </p>
      </div>

      {/* Profile Overview Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={currentUser.photoUrl} alt={currentUser.firstName} />
                <AvatarFallback className="text-2xl">
                  {currentUser.firstName[0]}
                  {currentUser.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors">
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-foreground">
                  {currentUser.firstName} {currentUser.lastName}
                </h2>
                <Badge variant={currentUser.role === "admin" ? "default" : "secondary"}>
                  {currentUser.role === "admin" ? "Administrateur" : "Membre"}
                </Badge>
              </div>
              <p className="text-muted-foreground">@{currentUser.pseudo}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {currentUser.email}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Membre depuis{" "}
                  {member
                    ? new Date(member.joinedAt).toLocaleDateString("fr-FR", {
                        month: "long",
                        year: "numeric",
                      })
                    : "janvier 2024"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{attendedSessions}</p>
                <p className="text-xs text-muted-foreground">Seances suivies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{attendanceRate}%</p>
                <p className="text-xs text-muted-foreground">Taux de presence</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Award className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{completedCertifications}</p>
                <p className="text-xs text-muted-foreground">Certifications FCC</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground capitalize">
                  {currentUser.englishLevel === "beginner"
                    ? "Debutant"
                    : currentUser.englishLevel === "intermediate"
                    ? "Inter."
                    : "Avance"}
                </p>
                <p className="text-xs text-muted-foreground">Niveau anglais</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Informations</TabsTrigger>
          <TabsTrigger value="security">Securite</TabsTrigger>
          <TabsTrigger value="activity">Activite</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Modifiez vos informations de profil
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                {profileError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{profileError}</AlertDescription>
                  </Alert>
                )}

                {profileSuccess && (
                  <Alert className="border-green-500 bg-green-50 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>Profil mis a jour avec succes !</AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prenom</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(e) => handleProfileChange("firstName", e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => handleProfileChange("lastName", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pseudo">Pseudo</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="pseudo"
                      value={profileData.pseudo}
                      onChange={(e) => handleProfileChange("pseudo", e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleProfileChange("email", e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="englishLevel">Niveau d&apos;anglais</Label>
                  <Select
                    value={profileData.englishLevel}
                    onValueChange={(value) => handleProfileChange("englishLevel", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {englishLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isProfileLoading}>
                    {isProfileLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Enregistrer les modifications
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Changer le mot de passe</CardTitle>
              <CardDescription>
                Mettez a jour votre mot de passe pour securiser votre compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                {passwordError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{passwordError}</AlertDescription>
                  </Alert>
                )}

                {passwordSuccess && (
                  <Alert className="border-green-500 bg-green-50 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>Mot de passe modifie avec succes !</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="currentPassword"
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords((prev) => ({ ...prev, current: !prev.current }))
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.new ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {passwordData.newPassword && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {passwordRequirements.map((req, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-1.5 text-xs ${
                            req.test ? "text-green-600" : "text-muted-foreground"
                          }`}
                        >
                          <CheckCircle2
                            className={`h-3 w-3 ${
                              req.test ? "text-green-600" : "text-muted-foreground/50"
                            }`}
                          />
                          {req.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {passwordData.confirmPassword && (
                    <p
                      className={`text-xs ${doPasswordsMatch ? "text-green-600" : "text-destructive"}`}
                    >
                      {doPasswordsMatch
                        ? "Les mots de passe correspondent"
                        : "Les mots de passe ne correspondent pas"}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={
                      isPasswordLoading ||
                      !passwordData.currentPassword ||
                      !passwordData.newPassword ||
                      !doPasswordsMatch ||
                      !isPasswordValid
                    }
                  >
                    {isPasswordLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Modification...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Modifier le mot de passe
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle>Seances recentes</CardTitle>
                <CardDescription>Vos dernieres participations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userAttendances.slice(0, 5).map((attendance) => {
                    const session = sessions.find((s) => s.id === attendance.sessionId)
                    return (
                      <div
                        key={attendance.id}
                        className="flex items-center justify-between py-2 border-b border-border last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {session
                              ? new Date(session.date).toLocaleDateString("fr-FR", {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "long",
                                })
                              : "Seance inconnue"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session?.startTime} - {session?.endTime}
                          </p>
                        </div>
                        <Badge
                          variant={
                            attendance.status === "confirmed"
                              ? "default"
                              : attendance.status === "declared"
                              ? "secondary"
                              : attendance.status === "excused"
                              ? "outline"
                              : "destructive"
                          }
                        >
                          {attendance.status === "confirmed"
                            ? "Present"
                            : attendance.status === "declared"
                            ? "Declare"
                            : attendance.status === "excused"
                            ? "Excuse"
                            : "Absent"}
                        </Badge>
                      </div>
                    )
                  })}
                  {userAttendances.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucune participation enregistree
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* FreeCodeCamp Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Progression FreeCodeCamp</CardTitle>
                <CardDescription>Vos certifications et cours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userFCCProgress.map((progress) => (
                    <div
                      key={progress.id}
                      className="flex items-start justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{progress.track}</p>
                        <p className="text-xs text-muted-foreground">
                          {progress.modulesCompleted} modules completes
                        </p>
                      </div>
                      <Badge
                        variant={
                          progress.validatedAt
                            ? "default"
                            : progress.level === "Completed"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {progress.validatedAt
                          ? "Certifie"
                          : progress.level === "Completed"
                          ? "A valider"
                          : progress.level}
                      </Badge>
                    </div>
                  ))}
                  {userFCCProgress.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucune progression FreeCodeCamp
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
