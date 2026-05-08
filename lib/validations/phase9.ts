import { z } from "zod"

const englishLevelSchema = z.enum(["beginner", "intermediate", "advanced"])

const topicBaseSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10).max(2000),
  level: englishLevelSchema.default("intermediate"),
  activityId: z.string().trim().min(1).max(120).optional().nullable(),
})

export const topicCreateSchema = topicBaseSchema

export const topicUpdateSchema = topicBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Aucune modification fournie.",
  })

export const topicListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  level: englishLevelSchema.optional(),
  activityId: z.union([z.string().trim().min(1).max(120), z.literal("none")]).optional(),
  includeArchived: z.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const topicArchiveSchema = z.object({
  isArchived: z.boolean().default(true),
})

export const topicUseSchema = z.object({
  sessionId: z.string().trim().min(1).max(120),
})

export const topicHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type TopicCreateInput = z.infer<typeof topicCreateSchema>
export type TopicUpdateInput = z.infer<typeof topicUpdateSchema>
export type TopicListQueryInput = z.infer<typeof topicListQuerySchema>
export type TopicUseInput = z.infer<typeof topicUseSchema>
