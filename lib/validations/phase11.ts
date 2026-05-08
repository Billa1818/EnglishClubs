import { z } from "zod"

export const notificationTypeValues = [
  "session_reminder",
  "activity_assignment",
  "absence_request_result",
  "membership_request",
  "new_absence_request",
  "fcc_reminder",
  "new_session",
  // Legacy values kept for compatibility with existing rows.
  "absence_request",
  "absence_result",
  "activity_selection",
  "fcc_progress",
] as const

export const notificationTypeSchema = z.enum(notificationTypeValues)

export const notificationListQuerySchema = z.object({
  unreadOnly: z.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const notificationUpdateSchema = z.object({
  isRead: z.boolean().default(true),
})

export const notificationPreferenceSchema = z.object({
  notificationType: z.string().trim().min(2).max(120),
  inApp: z.boolean(),
  email: z.boolean(),
})

export const notificationPreferencesPatchSchema = z.object({
  preferences: z.array(notificationPreferenceSchema).min(1).max(100),
})

export type NotificationListQueryInput = z.infer<typeof notificationListQuerySchema>
export type NotificationUpdateInput = z.infer<typeof notificationUpdateSchema>
export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>
export type NotificationPreferencesPatchInput = z.infer<
  typeof notificationPreferencesPatchSchema
>
