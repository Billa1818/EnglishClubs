import { z } from "zod"

const selectionModeSchema = z.enum(["automatic", "manual", "semi-automatic"])

export const sessionActivitySelectSchema = z
  .object({
    mode: selectionModeSchema.optional(),
    count: z.number().int().min(1).max(50).optional(),
    userIds: z
      .array(z.string().trim().uuid("Identifiant membre invalide."))
      .max(50, "Trop de membres selectionnes.")
      .optional(),
    countInCycle: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    if ((data.mode === "manual" || data.mode === "semi-automatic") && (!data.userIds || data.userIds.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["userIds"],
        message: "Choisis au moins un membre pour ce mode de selection.",
      })
    }
  })

export const selectionCycleResetSchema = z.object({
  reason: z.string().trim().max(250).optional(),
})

export type SessionActivitySelectInput = z.infer<typeof sessionActivitySelectSchema>
export type SelectionCycleResetInput = z.infer<typeof selectionCycleResetSchema>

