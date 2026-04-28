"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Mail, Lock, User, AtSign, AlertCircle, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { appConfig } from "@/lib/mock-data"

const englishLevels = [
  { value: "beginner", label: "Debutant", description: "Je debute en anglais" },
  { value: "intermediate", label: "Intermediaire", description: "Je peux tenir une conversation simple" },
  { value: "advanced", label: "Avance", description: "Je suis a l&apos;aise en anglais" },
]

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationToken = searchParams.get("token")

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    pseudo: "",
    email: "",
    password: "",
    confirmPassword: "",
    englishLevel: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const passwordRequirements = [
    { test: formData.password.length >= 8, label: "Au moins 8 caracteres" },
    { test: /[A-Z]/.test(formData.password), label: "Une majuscule" },
    { test: /[a-z]/.test(formData.password), label: "Une minuscule" },
    { test: /[0-9]/.test(formData.password), label: "Un chiffre" },
  ]

  const isPasswordValid = passwordRequirements.every((req) => req.test)
  const doPasswordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== ""

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!isPasswordValid) {
      setError("Le mot de passe ne respecte pas les criteres requis.")
      return
    }

    if (!doPasswordsMatch) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    setIsLoading(true)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Check if registration requires invitation
    if (appConfig.accessType === "invitation" && !invitationToken) {
      setError("Une invitation est requise pour s&apos;inscrire. Contactez un administrateur.")
      setIsLoading(false)
      return
    }

    // Redirect to pending page
    router.push("/pending")
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Creer un compte</h1>
        <p className="text-muted-foreground">
          {invitationToken
            ? "Vous avez ete invite a rejoindre English Club"
            : "Rejoignez notre communaute d&apos;apprentissage"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Prenom</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="firstName"
                placeholder="Jean"
                value={formData.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Nom</Label>
            <Input
              id="lastName"
              placeholder="Dupont"
              value={formData.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
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
              placeholder="JeanD"
              value={formData.pseudo}
              onChange={(e) => handleChange("pseudo", e.target.value)}
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
              placeholder="vous@exemple.com"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="englishLevel">Niveau d&apos;anglais</Label>
          <Select
            value={formData.englishLevel}
            onValueChange={(value) => handleChange("englishLevel", value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Selectionnez votre niveau" />
            </SelectTrigger>
            <SelectContent>
              {englishLevels.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  <div>
                    <span className="font-medium">{level.label}</span>
                    <span className="text-muted-foreground"> - {level.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Creez un mot de passe"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              className="pl-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {formData.password && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {passwordRequirements.map((req, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-1.5 text-xs ${
                    req.test ? "text-green-600" : "text-muted-foreground"
                  }`}
                >
                  <CheckCircle2 className={`h-3 w-3 ${req.test ? "text-green-600" : "text-muted-foreground/50"}`} />
                  {req.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirmez votre mot de passe"
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              className="pl-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {formData.confirmPassword && (
            <p className={`text-xs ${doPasswordsMatch ? "text-green-600" : "text-destructive"}`}>
              {doPasswordsMatch ? "Les mots de passe correspondent" : "Les mots de passe ne correspondent pas"}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isLoading || !isPasswordValid || !doPasswordsMatch}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Inscription en cours...
            </>
          ) : (
            "Creer mon compte"
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Deja un compte? </span>
        <Link href="/login" className="text-primary font-medium hover:underline">
          Se connecter
        </Link>
      </div>
    </div>
  )
}
