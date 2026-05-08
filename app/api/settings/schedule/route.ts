import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { reprogramUpcomingSessions } from "@/lib/sessions/schedule"

const APP_CONFIG_SINGLETON_ID = "00000000-0000-0000-0000-000000000001"
const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

const daySchema = z.enum(DAYS)
const scheduleSchema = z
  .object({
    scheduleDays: z.array(daySchema).min(1).max(7),
    startTime: z.string().trim().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().trim().regex(/^\d{2}:\d{2}$/),
    frequency: z.enum(["weekly", "biweekly", "monthly"]),
  })
  .superRefine((data, ctx) => {
    const [startHour, startMinute] = data.startTime
      .split(":")
      .map((value) => Number.parseInt(value, 10))
    const [endHour, endMinute] = data.endTime
      .split(":")
      .map((value) => Number.parseInt(value, 10))

    const start = startHour * 60 + startMinute
    const end = endHour * 60 + endMinute

    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "L'heure de fin doit etre apres l'heure de debut.",
        path: ["endTime"],
      })
    }
  })

function isActiveAdmin(
  member: { status: string; role: string } | null | undefined
) {
  return member?.status === "active" && member.role === "admin"
}

function normalizeTime(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback
  }
  return value.slice(0, 5)
}

function normalizeDays(value: string[] | null | undefined) {
  const input = value ?? []
  const daySet = new Set(
    input.filter((day): day is (typeof DAYS)[number] =>
      (DAYS as readonly string[]).includes(day)
    )
  )

  const ordered = DAYS.filter((day) => daySet.has(day))
  return ordered.length > 0 ? ordered : ["saturday"]
}

function mapScheduleError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes("relation") && lower.includes("app_config")) {
    return "La table `app_config` est absente. Execute les scripts SQL de la phase 1."
  }

  if (lower.includes("column") && lower.includes("schedule")) {
    return "Le schema `app_config` est incomplet. Reexecute les scripts SQL de la phase 1."
  }

  return message
}

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifie." }, { status: 401 })
    }

    const memberResult = await getCurrentMember(supabase, user.id)
    if (!memberResult.ok) {
      return NextResponse.json(
        { error: mapScheduleError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("app_config")
      .select("schedule_days, start_time, end_time, frequency")
      .eq("id", APP_CONFIG_SINGLETON_ID)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: mapScheduleError(error.message) },
        { status: 500 }
      )
    }

    const scheduleDays = normalizeDays(data?.schedule_days)
    const startTime = normalizeTime(data?.start_time, "18:00")
    const endTime = normalizeTime(data?.end_time, "20:00")
    const frequency =
      data?.frequency === "biweekly" || data?.frequency === "monthly"
        ? data.frequency
        : "weekly"

    return NextResponse.json({
      success: true,
      data: {
        scheduleDays,
        startTime,
        endTime,
        frequency,
      },
    })
  } catch (error) {
    console.error("Erreur settings/schedule GET:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const validation = scheduleSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Donnees invalides",
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifie." }, { status: 401 })
    }

    const memberResult = await getCurrentMember(supabase, user.id)
    if (!memberResult.ok) {
      return NextResponse.json(
        { error: mapScheduleError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const payload = validation.data
    const scheduleDays = normalizeDays(payload.scheduleDays)

    const { data, error } = await supabase
      .from("app_config")
      .update({
        schedule_days: scheduleDays,
        start_time: payload.startTime,
        end_time: payload.endTime,
        frequency: payload.frequency,
      })
      .eq("id", APP_CONFIG_SINGLETON_ID)
      .select("schedule_days, start_time, end_time, frequency")
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: mapScheduleError(error.message) },
        { status: 500 }
      )
    }

    const effectiveScheduleDays = normalizeDays(data?.schedule_days ?? scheduleDays)
    const effectiveStartTime = normalizeTime(data?.start_time, payload.startTime)
    const effectiveEndTime = normalizeTime(data?.end_time, payload.endTime)
    const effectiveFrequency =
      data?.frequency === "biweekly" || data?.frequency === "monthly"
        ? data.frequency
        : payload.frequency

    const planningResult = await reprogramUpcomingSessions({
      supabase,
      createdBy: user.id,
      schedule: {
        scheduleDays: effectiveScheduleDays,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        frequency: effectiveFrequency,
      },
    })

    if (!planningResult.ok) {
      console.error("Erreur auto-planification des seances:", planningResult.error)
    }

    return NextResponse.json({
      success: true,
      data: {
        scheduleDays: effectiveScheduleDays,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        frequency: effectiveFrequency,
        plannedSessionsCreated: planningResult.ok ? planningResult.created : 0,
        reprogrammedSessionsUpdated: planningResult.ok ? planningResult.updated : 0,
      },
    })
  } catch (error) {
    console.error("Erreur settings/schedule PATCH:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
