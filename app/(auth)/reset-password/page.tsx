"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Lock, AlertCircle, Loader2, CheckCircle, CheckCircle2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const passwordRequirements = [
    { test: password.length >= 8, label: "Au moins 8 caracteres" },
    { test: /[A-Z]/.test(password), label: "Une majuscule" },
    { test: /[a-z]/.test(password), label: "Une minuscule" },
    { test: /[0-9]/.test(password), label: "Un chiffre" },
  ]

  const isPasswordValid = passwordRequirements.every((req) => req.test)
  const doPasswordsMatch = password === confirmPassword && confirmPassword !== ""

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

    // Mock token validation
    if (!token || token === "invalid") {
      setError("Le lien de reinitialisation est invalide ou a expire.")
      setIsLoading(false)
      return
    }

    setIsSuccess(true)
    setIsLoading(false)
  }

  // Invalid or missing token
  if (!token) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Lien invalide
          </h1>
          <p className="text-muted-foreground">
            Ce lien de reinitialisation est invalide ou a expire. Veuillez demander un nouveau lien.
          </p>
        </div>

        <Button asChild className="w-full">
          <Link href="/forgot-password">Demander un nouveau lien</Link>
        </Button>
      </div>
    )
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Mot de passe reinitialise
          </h1>
          <p className="text-muted-foreground">
            Votre mot de passe a ete reinitialise avec succes. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
        </div>

        <Button asChild className="w-full" size="lg">
          <Link href="/login">Se connecter</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour a la connexion
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Nouveau mot de passe
        </h1>
        <p className="text-muted-foreground">
          Creez un nouveau mot de passe pour votre compte.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Votre nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          {password && (
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
          {confirmPassword && (
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
              Reinitialisation en cours...
            </>
          ) : (
            "Reinitialiser le mot de passe"
          )}
        </Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
