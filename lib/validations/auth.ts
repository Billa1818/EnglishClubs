import { z } from "zod"

const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caracteres.")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule.")
  .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule.")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre.")

const englishLevelSchema = z.enum(["beginner", "intermediate", "advanced"])

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "Le prenom doit contenir au moins 2 caracteres.")
      .max(80, "Le prenom est trop long."),
    lastName: z
      .string()
      .trim()
      .min(2, "Le nom doit contenir au moins 2 caracteres.")
      .max(80, "Le nom est trop long."),
    pseudo: z
      .string()
      .trim()
      .min(3, "Le pseudo doit contenir au moins 3 caracteres.")
      .max(40, "Le pseudo est trop long.")
      .regex(
        /^[a-zA-Z0-9._-]+$/,
        "Le pseudo ne peut contenir que des lettres, chiffres, ., _ ou -."
      ),
    email: z
      .string()
      .trim()
      .email("Veuillez entrer une adresse email valide."),
    password: passwordSchema,
    confirmPassword: z.string(),
    englishLevel: englishLevelSchema,
    invitationToken: z.string().trim().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  })

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Veuillez entrer une adresse email valide."),
  password: z.string().min(1, "Le mot de passe est requis."),
})

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Veuillez entrer une adresse email valide."),
})

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
    code: z.string().trim().optional(),
    tokenHash: z.string().trim().optional(),
    type: z.string().trim().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  })

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
