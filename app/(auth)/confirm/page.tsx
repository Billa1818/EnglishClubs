"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle, AlertCircle, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

function ConfirmEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "success" | "error" | "expired">("loading")

  useEffect(() => {
    const verifyEmail = async () => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      if (!token) {
        setStatus("error")
        return
      }

      if (token === "expired") {
        setStatus("expired")
        return
      }

      // Mock successful verification
      setStatus("success")
    }

    verifyEmail()
  }, [token])

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
            Votre adresse email a ete verifiee avec succes. Votre demande d&apos;adhesion est maintenant en attente d&apos;approbation par un administrateur.
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

  if (status === "expired") {
    return (
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <Mail className="h-10 w-10 text-amber-600" />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Lien expire
          </h1>
          <p className="text-muted-foreground">
            Ce lien de verification a expire. Les liens de verification sont valides pendant 24 heures.
          </p>
        </div>

        <div className="space-y-4">
          <Button className="w-full" size="lg">
            Renvoyer l&apos;email de verification
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Retour a la connexion</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Error state
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
        <p className="text-muted-foreground">
          Le lien de verification est invalide ou a deja ete utilise.
        </p>
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
    <Suspense fallback={
      <div className="flex justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <ConfirmEmailContent />
    </Suspense>
  )
}
