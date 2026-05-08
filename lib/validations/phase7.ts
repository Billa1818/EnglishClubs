import { z } from "zod"

export const absenceRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
])

export const absenceListQuerySchema = z.object({
  status: absenceRequestStatusSchema.optional(),
  userId: z.string().trim().min(1).max(120).optional(),
  sessionId: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const absenceCreateSchema = z.object({
  sessionId: z.string().trim().min(1).max(120),
  reason: z.string().trim().max(2000).optional(),
})

export const absenceReviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  adminComment: z.string().trim().max(2000).optional().nullable(),
})

export type AbsenceListQueryInput = z.infer<typeof absenceListQuerySchema>
export type AbsenceCreateInput = z.infer<typeof absenceCreateSchema>
export type AbsenceReviewInput = z.infer<typeof absenceReviewSchema>
