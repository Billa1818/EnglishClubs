import { z } from "zod"

const sessionStatusSchema = z.enum([
  "upcoming",
  "ongoing",
  "completed",
  "cancelled",
])

const assignmentTimingSchema = z.enum(["before_event", "during_event"])

const sessionActivityStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "skipped",
])

function parseTimeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map((part) => Number.parseInt(part, 10))
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return Number.NaN
  }
  return hour * 60 + minute
}

const dateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/)
const timeSchema = z.string().trim().regex(/^\d{2}:\d{2}$/)

export const sessionCreateSchema = z
  .object({
    date: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    notes: z.string().trim().max(2000).optional(),
    topicId: z.string().trim().min(1).max(120).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const startMinutes = parseTimeToMinutes(data.startTime)
    const endMinutes = parseTimeToMinutes(data.endTime)

    if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Heures invalides.",
        path: ["startTime"],
      })
      return
    }

    if (endMinutes <= startMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "L'heure de fin doit etre apres l'heure de debut.",
        path: ["endTime"],
      })
    }
  })

export const sessionUpdateSchema = z
  .object({
    date: dateSchema.optional(),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    status: sessionStatusSchema.optional(),
    notes: z.string().trim().max(2000).optional(),
    topicId: z.string().trim().min(1).max(120).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Aucune modification fournie.",
  })

export const sessionsListQuerySchema = z.object({
  status: sessionStatusSchema.optional(),
  search: z.string().trim().max(120).optional(),
  fromDate: dateSchema.optional(),
  toDate: dateSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const sessionActivityCreateSchema = z.object({
  activityId: z.string().trim().min(1).max(120),
  orderIndex: z.number().int().min(1).optional(),
  duration: z.number().int().min(1).max(300).optional(),
  assignmentTiming: assignmentTimingSchema.default("during_event"),
})

export const sessionActivityUpdateSchema = z
  .object({
    orderIndex: z.number().int().min(1).optional(),
    duration: z.number().int().min(1).max(300).optional(),
    assignmentTiming: assignmentTimingSchema.optional(),
    status: sessionActivityStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Aucune modification fournie.",
  })

export const sessionActivityAssignSchema = z.object({
  assignments: z
    .array(
      z.object({
        userId: z.string().trim().uuid("Identifiant membre invalide."),
        assignmentType: z.string().trim().min(1).max(80),
        reason: z.string().trim().max(500).optional(),
      })
    )
    .min(1, "Au moins une affectation est requise.")
    .max(50, "Trop d'affectations en une seule requete."),
})

export type SessionCreateInput = z.infer<typeof sessionCreateSchema>
export type SessionUpdateInput = z.infer<typeof sessionUpdateSchema>
export type SessionsListQueryInput = z.infer<typeof sessionsListQuerySchema>
export type SessionActivityCreateInput = z.infer<typeof sessionActivityCreateSchema>
export type SessionActivityUpdateInput = z.infer<typeof sessionActivityUpdateSchema>
export type SessionActivityAssignInput = z.infer<typeof sessionActivityAssignSchema>
