"use client"

import Link from "next/link"
import { Clock, CheckCircle, XCircle, Mail, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"

type PendingStatus = "pending_email" | "pending_admin" | "approved" | "rejected"

const statusConfig = {
  pending_email: {
    icon: Mail,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    badgeVariant: "outline" as const,
    title: "Verification email en attente",
    description:
      "Veuillez verifier votre adresse email en cliquant sur le lien que nous vous avons envoye.",
  },
  pending_admin: {
    icon: Clock,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    badgeVariant: "secondary" as const,
    title: "En attente d'approbation",
    description:
      "Votre demande d'adhesion est en cours d'examen par un administrateur.",
  },
  approved: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
    badgeVariant: "default" as const,
    title: "Demande approuvee",
    description:
      "Votre demande d'adhesion a ete approuvee. Vous pouvez maintenant acceder a votre espace.",
  },
  rejected: {
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    badgeVariant: "destructive" as const,
    title: "Demande refusee",
    description: "Votre demande d'adhesion a ete refusee ou votre compte est suspendu.",
  },
}

function getStatusLabel(status: PendingStatus) {
  if (status === "pending_email") return "Email non verifie"
  if (status === "pending_admin") return "En attente"
  if (status === "approved") return "Approuve"
  return "Refuse"
}

export default function PendingPage() {
  const { authUser, profile, member, authError, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground text-center">
          Verification de votre statut...
        </h1>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Connectez-vous pour voir votre statut
          </h1>
          <p className="text-muted-foreground">
            Vous devez etre connecte pour suivre l'etat de votre inscription.
          </p>
        </div>

        <div className="space-y-4">
          <Button asChild className="w-full" size="lg">
            <Link href="/login">Se connecter</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/register">Creer un compte</Link>
          </Button>
        </div>
      </div>
    )
  }

  let status: PendingStatus = "pending_admin"

  if (!authUser?.email_confirmed_at) {
    status = "pending_email"
  } else if (member?.status === "active") {
    status = "approved"
  } else if (member?.status === "suspended" || member?.status === "removed") {
    status = "rejected"
  }

  const config = statusConfig[status]
  const Icon = config.icon

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
      label: "Validation admin",
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
        {authError && (
          <Alert variant="destructive">
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-center">
          <div className={`flex h-20 w-20 items-center justify-center rounded-full ${config.bgColor}`}>
            <Icon className={`h-10 w-10 ${config.color}`} />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <Badge variant={config.badgeVariant} className="mb-2">
            {getStatusLabel(status)}
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{config.title}</h1>
          <p className="text-muted-foreground">{config.description}</p>
        </div>

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

        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Details de votre inscription</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nom</p>
                <p className="font-medium">
                  {profile?.first_name || "-"} {profile?.last_name || ""}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Pseudo</p>
                <p className="font-medium">{profile?.pseudo || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{authUser?.email || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Niveau d'anglais</p>
                <p className="font-medium capitalize">{profile?.english_level || "-"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Date de demande</p>
                <p className="font-medium">
                  {member?.created_at
                    ? new Date(member.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {status === "approved" && (
            <Button asChild className="w-full" size="lg">
              <Link href={member?.role === "admin" ? "/dashboard" : "/member"}>
                Acceder a mon espace
              </Link>
            </Button>
          )}

          {status !== "approved" && (
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href="/login">Retour a la connexion</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
