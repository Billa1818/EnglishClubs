import { z } from "zod"

export const ATTENDANCE_STATUS_VALUES = [
  "declared",
  "confirmed",
  "absent",
  "excused",
] as const

export const attendanceStatusSchema = z.enum(ATTENDANCE_STATUS_VALUES)

export const attendanceListQuerySchema = z.object({
  status: attendanceStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
})

export const attendanceDeclareSchema = z.object({
  status: z.literal("declared").default("declared"),
})

export const attendanceUpdateSchema = z.object({
  status: attendanceStatusSchema,
})

export const memberAttendanceHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  status: attendanceStatusSchema.optional(),
})
