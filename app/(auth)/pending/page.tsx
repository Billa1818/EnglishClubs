"use client"

import { useState } from "react"
import Link from "next/link"
import { Clock, CheckCircle, XCircle, Mail, ArrowLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { pendingRegistrations } from "@/lib/mock-data"

const statusConfig = {
  pending_email: {
    icon: Mail,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    badgeVariant: "outline" as const,
    title: "Verification de l&apos;email en attente",
    description: "Veuillez verifier votre adresse email en cliquant sur le lien que nous vous avons envoye.",
  },
  pending_admin: {
    icon: Clock,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    badgeVariant: "secondary" as const,
    title: "En attente d&apos;approbation",
    description: "Votre demande d&apos;adhesion est en cours d&apos;examen par un administrateur. Vous recevrez un email des que votre compte sera active.",
  },
  approved: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
    badgeVariant: "default" as const,
    title: "Demande approuvee",
    description: "Votre demande d&apos;adhesion a ete approuvee. Vous pouvez maintenant vous connecter.",
  },
  rejected: {
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    badgeVariant: "destructive" as const,
    title: "Demande refusee",
    description: "Votre demande d&apos;adhesion a ete refusee.",
  },
}

export default function PendingPage() {
  // Mock: Get the first pending registration
  const registration = pendingRegistrations[0]
  const status = registration?.status || "pending_admin"
  const config = statusConfig[status]
  const Icon = config.icon

  const [isResending, setIsResending] = useState(false)

  const handleResendEmail = async () => {
    setIsResending(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsResending(false)
  }

  const steps = [
    {
      label: "Inscription",
      completed: true,
      current: false,
    },
    {
      label: "Verification email",
      completed: status !== "pending_email",
      current: status === "pending_email",
    },
    {
      label: "Approbation admin",
      completed: status === "approved",
      current: status === "pending_admin",
    },
    {
      label: "Compte actif",
      completed: status === "approved",
      current: false,
    },
  ]

  return (
    <div className="space-y-8">
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour a la connexion
      </Link>

      <div className="space-y-6">
        <div className="flex justify-center">
          <div className={`flex h-20 w-20 items-center justify-center rounded-full ${config.bgColor}`}>
            <Icon className={`h-10 w-10 ${config.color}`} />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <Badge variant={config.badgeVariant} className="mb-2">
            {status === "pending_email" && "Email non verifie"}
            {status === "pending_admin" && "En attente"}
            {status === "approved" && "Approuve"}
            {status === "rejected" && "Refuse"}
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {status === "pending_email" && "Verifiez votre email"}
            {status === "pending_admin" && "Demande en cours de traitement"}
            {status === "approved" && "Bienvenue dans English Club !"}
            {status === "rejected" && "Demande refusee"}
          </h1>
          <p className="text-muted-foreground">
            {status === "pending_email" && "Veuillez verifier votre adresse email pour continuer."}
            {status === "pending_admin" && "Un administrateur examinera votre demande bientot."}
            {status === "approved" && "Votre compte est pret. Connectez-vous pour commencer."}
            {status === "rejected" && "Contactez un administrateur pour plus d&apos;informations."}
          </p>
        </div>

        {/* Progress steps */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                        step.completed
                          ? "border-green-500 bg-green-500 text-white"
                          : step.current
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-muted bg-muted text-muted-foreground"
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        step.completed || step.current ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 w-12 lg:w-20 ${
                        step.completed ? "bg-green-500" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Registration details */}
        {registration && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-foreground">Details de votre inscription</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Nom</p>
                  <p className="font-medium">{registration.firstName} {registration.lastName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pseudo</p>
                  <p className="font-medium">{registration.pseudo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{registration.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Niveau d&apos;anglais</p>
                  <p className="font-medium capitalize">{registration.englishLevel}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Date de demande</p>
                  <p className="font-medium">
                    {new Date(registration.requestedAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-4">
          {status === "pending_email" && (
            <Button
              onClick={handleResendEmail}
              className="w-full"
              size="lg"
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Renvoyer l&apos;email de verification
                </>
              )}
            </Button>
          )}

          {status === "approved" && (
            <Button asChild className="w-full" size="lg">
              <Link href="/login">Se connecter</Link>
            </Button>
          )}

          {status === "rejected" && (
            <Button asChild className="w-full" size="lg">
              <Link href="/register">Nouvelle inscription</Link>
            </Button>
          )}
        </div>

        {/* Help text */}
        <p className="text-center text-sm text-muted-foreground">
          Besoin d&apos;aide?{" "}
          <Link href="#" className="text-primary font-medium hover:underline">
            Contactez-nous
          </Link>
        </p>
      </div>
    </div>
  )
}
