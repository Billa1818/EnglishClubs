import { z } from "zod"

const memberStatusSchema = z.enum(["pending", "active", "suspended", "removed"])
const memberRoleSchema = z.enum(["admin", "member"])

export const invitationCreateSchema = z
  .object({
    type: z.enum(["link", "email"]).default("link"),
    email: z.string().trim().email("Adresse email invalide.").optional(),
    expiresInDays: z
      .number()
      .int("Le delai doit etre un entier.")
      .min(1, "Le delai minimum est de 1 jour.")
      .max(30, "Le delai maximum est de 30 jours.")
      .default(7),
  })
  .superRefine((data, ctx) => {
    if (data.type === "email" && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "L'email est obligatoire pour une invitation par email.",
        path: ["email"],
      })
    }
  })

export const memberUpdateSchema = z
  .object({
    status: memberStatusSchema.optional(),
    role: memberRoleSchema.optional(),
  })
  .refine((data) => !!data.status || !!data.role, {
    message: "Aucune modification fournie.",
  })

export const membersListQuerySchema = z.object({
  status: memberStatusSchema.optional(),
  role: memberRoleSchema.optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(2).max(80).optional(),
  lastName: z.string().trim().min(2).max(80).optional(),
  pseudo: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/)
    .optional(),
  englishLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
})

export type InvitationCreateInput = z.infer<typeof invitationCreateSchema>
export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>
export type MembersListQueryInput = z.infer<typeof membersListQuerySchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
