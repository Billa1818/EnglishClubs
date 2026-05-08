import { z } from "zod"

const activityCategorySchema = z.enum([
  "ice_breaker",
  "vocabulary",
  "conversation",
  "comprehension",
  "writing",
])

const selectionModeSchema = z.enum(["automatic", "manual", "semi-automatic"])

const baseActivitySchema = z.object({
  name: z.string().trim().min(3).max(120),
  nameEn: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(1200),
  category: activityCategorySchema,
  defaultDuration: z.number().int().min(1).max(240),
  minDuration: z.number().int().min(1).max(240),
  maxDuration: z.number().int().min(1).max(240),
  membersRequired: z.number().int().min(1).max(30),
  selectionMode: selectionModeSchema,
  requiresTopic: z.boolean().default(false),
  topicsReusable: z.boolean().default(false),
  instructions: z.string().trim().min(10).max(8000),
  materials: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  icon: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/i)
    .optional(),
  isDefault: z.boolean().optional().default(false),
})

export const activityCreateSchema = baseActivitySchema.superRefine((data, ctx) => {
  if (data.minDuration > data.defaultDuration) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La duree par defaut doit etre >= a la duree minimale.",
      path: ["defaultDuration"],
    })
  }

  if (data.defaultDuration > data.maxDuration) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La duree par defaut doit etre <= a la duree maximale.",
      path: ["defaultDuration"],
    })
  }
})

export const activityUpdateSchema = baseActivitySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Aucune modification fournie.",
  })

export const activityListQuerySchema = z.object({
  category: activityCategorySchema.optional(),
  search: z.string().trim().max(120).optional(),
  includeArchived: z.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const activityArchiveSchema = z.object({
  isArchived: z.boolean().default(true),
})

export type ActivityCreateInput = z.infer<typeof activityCreateSchema>
export type ActivityUpdateInput = z.infer<typeof activityUpdateSchema>
export type ActivityListQueryInput = z.infer<typeof activityListQuerySchema>
