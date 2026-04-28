"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail, AlertCircle, Loader2, ArrowLeft, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authUsers } from "@/lib/mock-data"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Check if email exists (mock validation)
    const userExists = authUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())

    // We always show success message for security (don't reveal if email exists)
    setIsSuccess(true)
    setIsLoading(false)
  }

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
            Verifiez votre email
          </h1>
          <p className="text-muted-foreground">
            Si un compte existe avec l&apos;adresse <strong className="text-foreground">{email}</strong>,
            vous recevrez un lien pour reinitialiser votre mot de passe.
          </p>
        </div>

        <div className="space-y-4">
          <Button asChild className="w-full" variant="outline">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour a la connexion
            </Link>
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Vous n&apos;avez pas recu l&apos;email?{" "}
            <button
              onClick={() => setIsSuccess(false)}
              className="text-primary font-medium hover:underline"
            >
              Renvoyer
            </button>
          </p>
        </div>
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
          Mot de passe oublie?
        </h1>
        <p className="text-muted-foreground">
          Entrez votre adresse email et nous vous enverrons un lien pour reinitialiser votre mot de passe.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Adresse email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            "Envoyer le lien de reinitialisation"
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Vous vous souvenez de votre mot de passe? </span>
        <Link href="/login" className="text-primary font-medium hover:underline">
          Se connecter
        </Link>
      </div>
    </div>
  )
}
