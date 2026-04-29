"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  AtSign,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react"
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
import {
  registerSchema,
  type RegisterInput,
} from "@/lib/validations/auth"

const englishLevels = [
  { value: "beginner", label: "Debutant", description: "Je debute en anglais" },
  {
    value: "intermediate",
    label: "Intermediaire",
    description: "Je peux tenir une conversation simple",
  },
  { value: "advanced", label: "Avance", description: "Je suis a l'aise en anglais" },
] as const

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationToken = searchParams.get("token")

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [apiError, setApiError] = useState("")

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      pseudo: "",
      email: "",
      password: "",
      confirmPassword: "",
      englishLevel: "beginner",
      invitationToken: invitationToken || undefined,
    },
  })

  const password = watch("password")
  const confirmPassword = watch("confirmPassword")

  const passwordRequirements = useMemo(
    () => [
      { test: password.length >= 8, label: "Au moins 8 caracteres" },
      { test: /[A-Z]/.test(password), label: "Une majuscule" },
      { test: /[a-z]/.test(password), label: "Une minuscule" },
      { test: /[0-9]/.test(password), label: "Un chiffre" },
    ],
    [password]
  )

  const isPasswordValid = passwordRequirements.every((req) => req.test)
  const doPasswordsMatch = password === confirmPassword && confirmPassword !== ""

  const onSubmit = async (data: RegisterInput) => {
    setApiError("")

    const payload = {
      ...data,
      invitationToken: invitationToken || data.invitationToken,
    }

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const json = (await response.json().catch(() => ({}))) as {
      error?: string
      requiresEmailConfirmation?: boolean
      memberStatus?: "pending" | "active" | "suspended" | "removed" | null
      role?: "admin" | "member" | null
    }

    if (!response.ok) {
      setApiError(json.error || "Inscription impossible pour le moment.")
      return
    }

    if (json.requiresEmailConfirmation) {
      router.push(`/confirm?status=pending&email=${encodeURIComponent(data.email)}`)
      return
    }

    if (json.memberStatus === "active") {
      router.push(json.role === "admin" ? "/dashboard" : "/member")
      return
    }

    router.push("/pending")
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Creer un compte</h1>
        <p className="text-muted-foreground">
          {invitationToken
            ? "Vous avez ete invite a rejoindre English Club"
            : "Rejoignez notre communaute d'apprentissage"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {apiError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{apiError}</AlertDescription>
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
                className="pl-10"
                {...register("firstName")}
              />
            </div>
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Nom</Label>
            <Input id="lastName" placeholder="Dupont" {...register("lastName")} />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pseudo">Pseudo</Label>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="pseudo"
              placeholder="JeanD"
              className="pl-10"
              {...register("pseudo")}
            />
          </div>
          {errors.pseudo && (
            <p className="text-sm text-destructive">{errors.pseudo.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
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

        <div className="space-y-2">
          <Label htmlFor="englishLevel">Niveau d'anglais</Label>
          <input type="hidden" {...register("englishLevel")} />
          <Select
            defaultValue="beginner"
            onValueChange={(value) =>
              setValue("englishLevel", value as RegisterInput["englishLevel"], {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="englishLevel">
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
          {errors.englishLevel && (
            <p className="text-sm text-destructive">{errors.englishLevel.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Creez un mot de passe"
              className="pl-10 pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
          {password && (
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
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirmez votre mot de passe"
              className="pl-10 pr-10"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
          {confirmPassword && !errors.confirmPassword && (
            <p className={`text-xs ${doPasswordsMatch ? "text-green-600" : "text-destructive"}`}>
              {doPasswordsMatch
                ? "Les mots de passe correspondent"
                : "Les mots de passe ne correspondent pas"}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting || !isPasswordValid || !doPasswordsMatch}
        >
          {isSubmitting ? (
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
