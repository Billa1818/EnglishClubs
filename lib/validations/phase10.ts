import { z } from "zod"

export const fccLevelSchema = z.enum([
  "Starting",
  "In Progress",
  "Almost Done",
  "Completed",
])

export const fccListQuerySchema = z.object({
  status: z.enum(["all", "pending", "validated"]).default("all"),
  userId: z.string().trim().min(1).max(120).optional(),
  search: z.string().trim().max(180).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const fccUpsertSchema = z
  .object({
    id: z.string().trim().min(1).max(120).optional(),
    track: z.string().trim().min(3).max(180),
    level: fccLevelSchema,
    modulesCompleted: z.coerce.number().int().min(0).max(5),
    certificateName: z.string().trim().max(240).optional().nullable(),
  })
  .refine(
    (data) =>
      data.level !== "Completed" ||
      (typeof data.certificateName === "string" && data.certificateName.trim().length > 0),
    {
      message: "Le nom du certificat est requis pour le niveau Completed.",
      path: ["certificateName"],
    }
  )

export const fccValidateSchema = z.object({
  validated: z.boolean().default(true),
})

export type FccListQueryInput = z.infer<typeof fccListQuerySchema>
export type FccUpsertInput = z.infer<typeof fccUpsertSchema>
export type FccValidateInput = z.infer<typeof fccValidateSchema>
