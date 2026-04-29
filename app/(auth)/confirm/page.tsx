"use client"

import { useEffect, useMemo, useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle, AlertCircle, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

type ConfirmStatus =
  | "loading"
  | "check_email"
  | "success"
  | "error"

function getErrorMessage(errorCode: string | null) {
  if (!errorCode) {
    return "Le lien de verification est invalide ou a deja ete utilise."
  }

  if (errorCode === "missing_token") {
    return "Le lien de verification est incomplet."
  }

  if (errorCode === "invalid_or_expired") {
    return "Le lien de verification est invalide ou a expire."
  }

  if (errorCode === "profile_sync_failed") {
    return "Le compte a ete confirme, mais le profil n'a pas pu etre initialise automatiquement."
  }

  if (errorCode === "supabase_not_configured") {
    return "Supabase n'est pas configure. Completez votre fichier .env puis relancez le serveur."
  }

  return "La verification n'a pas pu aboutir."
}

function ConfirmEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const error = searchParams.get("error")
  const statusParam = searchParams.get("status")
  const email = searchParams.get("email")

  const [status, setStatus] = useState<ConfirmStatus>("loading")
  const [errorMessage, setErrorMessage] = useState("")

  const hasVerificationToken = !!code || !!tokenHash

  const pendingMessage = useMemo(() => {
    if (!email) {
      return "Nous avons envoye un email de confirmation. Verifiez votre boite de reception pour activer votre compte."
    }

    return `Nous avons envoye un email de confirmation a ${email}. Verifiez votre boite de reception pour activer votre compte.`
  }, [email])

  useEffect(() => {
    if (error) {
      setStatus("error")
      setErrorMessage(getErrorMessage(error))
      return
    }

    if (!hasVerificationToken) {
      if (statusParam === "pending") {
        setStatus("check_email")
      } else {
        setStatus("error")
        setErrorMessage("Lien de verification manquant.")
      }
      return
    }

    let cancelled = false

    const verifyEmail = async () => {
      const response = await fetch("/api/auth/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code ?? undefined,
          tokenHash: tokenHash ?? undefined,
          type: type ?? undefined,
          next: "/pending",
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean
        redirectTo?: string
        error?: string
      }

      if (cancelled) {
        return
      }

      if (!response.ok || !payload.success) {
        setStatus("error")
        setErrorMessage(getErrorMessage(payload.error ?? null))
        return
      }

      if (payload.redirectTo === "/reset-password") {
        router.replace("/reset-password")
        return
      }

      setStatus("success")
    }

    void verifyEmail()

    return () => {
      cancelled = true
    }
  }, [code, error, hasVerificationToken, router, statusParam, tokenHash, type])

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Verification en cours...
          </h1>
          <p className="text-muted-foreground">
            Veuillez patienter pendant que nous verifions votre adresse email.
          </p>
        </div>
      </div>
    )
  }

  if (status === "check_email") {
    return (
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <Mail className="h-10 w-10 text-amber-600" />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Verifiez votre email
          </h1>
          <p className="text-muted-foreground">{pendingMessage}</p>
        </div>

        <div className="space-y-4">
          <Button asChild className="w-full" size="lg">
            <Link href="/login">Se connecter</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/register">Retour a l'inscription</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Email verifie !
          </h1>
          <p className="text-muted-foreground">
            Votre adresse email a ete verifiee avec succes. Votre inscription est maintenant en attente de validation.
          </p>
        </div>

        <div className="space-y-4">
          <Button asChild className="w-full" size="lg">
            <Link href="/pending">Voir le statut de ma demande</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Se connecter</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
      </div>

      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Erreur de verification
        </h1>
        <p className="text-muted-foreground">{errorMessage}</p>
      </div>

      <div className="space-y-4">
        <Button asChild className="w-full" size="lg">
          <Link href="/register">Creer un nouveau compte</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Retour a la connexion</Link>
        </Button>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <ConfirmEmailContent />
    </Suspense>
  )
}
