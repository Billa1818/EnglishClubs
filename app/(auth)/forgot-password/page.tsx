"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Mail, AlertCircle, Loader2, ArrowLeft, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth"

export default function ForgotPasswordPage() {
  const [apiError, setApiError] = useState("")
  const [successEmail, setSuccessEmail] = useState("")

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  const email = watch("email")

  const onSubmit = async (data: ForgotPasswordInput) => {
    setApiError("")

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
    }

    if (!response.ok) {
      setApiError(payload.error || "Impossible d'envoyer le lien pour le moment.")
      return
    }

    setSuccessEmail(data.email)
  }

  if (successEmail) {
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
            Si un compte existe avec l'adresse <strong className="text-foreground">{successEmail}</strong>,
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
            Vous n'avez pas recu l'email?{" "}
            <button
              onClick={() => setSuccessEmail("")}
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {apiError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{apiError}</AlertDescription>
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
              className="pl-10"
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
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
