"use client"

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  BookOpen,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  Eye,
  FastForward,
  FileText,
  GripVertical,
  Loader2,
  MessageSquare,
  Minus,
  MoreHorizontal,
  Play,
  PlayCircle,
  Plus,
  Shuffle,
  SkipForward,
  Smile,
  Sparkles,
  StopCircle,
  Trash2,
  User,
  Users,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"

type SessionStatus = "upcoming" | "ongoing" | "completed" | "cancelled"
type SessionActivityStatus = "pending" | "in_progress" | "completed" | "skipped"
type AssignmentTiming = "before_event" | "during_event"
type ActivityCategory = "ice_breaker" | "vocabulary" | "conversation" | "comprehension" | "writing"
type EnglishLevel = "beginner" | "intermediate" | "advanced"

type ApiSession = {
  id: string
  date: string
  start_time: string
  end_time: string
  status: SessionStatus
  notes: string | null
  topic_id: string | null
  topic: {
    id: string
    title: string
    description: string
    level: EnglishLevel
  } | null
  started_at: string | null
  completed_at: string | null
  current_activity_index: number | null
  created_at: string
  updated_at: string
  session_activities:
    | Array<{
        id: string
        session_id: string
        activity_id: string
        order_index: number
        duration: number
        assignment_timing: AssignmentTiming
        status: SessionActivityStatus
        started_at: string | null
        completed_at: string | null
        created_at: string
        updated_at: string
        activity: {
          id: string
          name: string
          name_en: string
          description: string
          instructions: string
          materials: string[]
          category: ActivityCategory
          icon: string | null
          default_duration: number
          min_duration: number
          max_duration: number
          members_required: number
          selection_mode: "automatic" | "manual" | "semi-automatic"
          requires_topic: boolean
          topics_reusable: boolean
          is_default: boolean
          is_archived: boolean
        } | null
        assignments:
          | Array<{
              id: string
              user_id: string
              assignment_type: string
              reason: string | null
              assigned_at: string
              user: {
                id: string
                first_name: string
                last_name: string
                pseudo: string
                photo_url: string | null
                english_level: EnglishLevel
              } | null
            }>
          | null
      }>
    | null
}

type ApiSessionActivity = NonNullable<ApiSession["session_activities"]>[number]
type ApiSessionActivityAssignment = NonNullable<ApiSessionActivity["assignments"]>[number]

type ApiActivityOption = {
  id: string
  name: string
  name_en: string
  description: string
  category: ActivityCategory
  default_duration: number
  min_duration: number
  max_duration: number
  members_required: number
  selection_mode: "automatic" | "manual" | "semi-automatic"
  requires_topic: boolean
  topics_reusable: boolean
  instructions: string
  materials: string[]
  icon: string | null
  is_default: boolean
  is_archived: boolean
}

type ApiSessionResponse = {
  success?: boolean
  error?: string
  data?: ApiSession
}

type ApiActivitiesResponse = {
  success?: boolean
  error?: string
  data?: ApiActivityOption[]
}

type ApiTopicOption = {
  id: string
  title: string
  description: string
  level: EnglishLevel
  is_archived: boolean
  activity_id: string | null
  activity?: {
    id: string
    name: string
    requires_topic: boolean
    is_archived: boolean
  } | null
}

type ApiTopicsResponse = {
  success?: boolean
  error?: string
  data?: ApiTopicOption[]
}

type ApiMemberOption = {
  id: string
  user_id: string
  status: "pending" | "active" | "suspended" | "removed"
  role: "admin" | "member"
  profile: {
    id: string
    first_name: string
    last_name: string
    pseudo: string
    photo_url: string | null
    english_level: EnglishLevel
  } | null
}

type ApiMembersResponse = {
  success?: boolean
  error?: string
  data?: ApiMemberOption[]
}

type SessionStatusMeta = {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
  icon: React.ElementType
}

type SessionActivityStatusMeta = {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
  icon: React.ElementType
  colorClass: string
}

const SESSION_STATUS_CONFIG: Record<SessionStatus, SessionStatusMeta> = {
  upcoming: { label: "A venir", variant: "default", icon: Clock },
  ongoing: { label: "En cours", variant: "secondary", icon: PlayCircle },
  completed: { label: "Terminee", variant: "outline", icon: CheckCircle2 },
  cancelled: { label: "Annulee", variant: "destructive", icon: Ban },
}

const ACTIVITY_STATUS_CONFIG: Record<SessionActivityStatus, SessionActivityStatusMeta> = {
  pending: {
    label: "A venir",
    variant: "outline",
    icon: Clock,
    colorClass: "text-muted-foreground",
  },
  in_progress: {
    label: "En cours",
    variant: "default",
    icon: PlayCircle,
    colorClass: "text-primary",
  },
  completed: {
    label: "Terminee",
    variant: "secondary",
    icon: CheckCircle2,
    colorClass: "text-emerald-700",
  },
  skipped: {
    label: "Passee",
    variant: "destructive",
    icon: FastForward,
    colorClass: "text-amber-700",
  },
}

const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  ice_breaker: "bg-blue-500/10 text-blue-700 border-blue-200",
  vocabulary: "bg-amber-500/10 text-amber-700 border-amber-200",
  conversation: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  comprehension: "bg-purple-500/10 text-purple-700 border-purple-200",
  writing: "bg-rose-500/10 text-rose-700 border-rose-200",
}

const LEVEL_COLORS: Record<EnglishLevel, string> = {
  beginner: "bg-green-500/10 text-green-700 border-green-200",
  intermediate: "bg-amber-500/10 text-amber-700 border-amber-200",
  advanced: "bg-rose-500/10 text-rose-700 border-rose-200",
}

const LEVEL_LABELS: Record<EnglishLevel, string> = {
  beginner: "Debutant",
  intermediate: "Intermediaire",
  advanced: "Avance",
}

const ACTIVITY_ICON_MAP: Record<string, React.ElementType> = {
  smile: Smile,
  "message-square": MessageSquare,
  "file-text": FileText,
  sparkles: Sparkles,
}

function normalizeTime(value: string) {
  return value.slice(0, 5)
}

function formatDateFr(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

function getCategoryLabel(value: ActivityCategory) {
  if (value === "ice_breaker") return "Ice-breaker"
  if (value === "vocabulary") return "Vocabulaire"
  if (value === "conversation") return "Conversation"
  if (value === "comprehension") return "Comprehension"
  return "Ecriture"
}

function getAssignmentTimingLabel(value: AssignmentTiming) {
  return value === "before_event" ? "Avant l'evenement" : "Pendant l'evenement"
}

function getActivityIcon(activity: {
  icon?: string | null
  category?: ActivityCategory | null
}) {
  if (activity.icon && ACTIVITY_ICON_MAP[activity.icon]) {
    return ACTIVITY_ICON_MAP[activity.icon]
  }

  if (activity.category === "ice_breaker") return Smile
  if (activity.category === "vocabulary") return BookOpen
  if (activity.category === "conversation") return MessageSquare
  if (activity.category === "comprehension") return Sparkles
  return FileText
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T
}

type AddActivityDialogProps = {
  activities: ApiActivityOption[]
  onAdd: (payload: {
    activityId: string
    duration?: number
    orderIndex?: number
    assignmentTiming: AssignmentTiming
  }) => Promise<{ ok: boolean; error?: string }>
  isSubmitting: boolean
}

function AddActivityDialog({ activities, onAdd, isSubmitting }: AddActivityDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedActivityId, setSelectedActivityId] = useState("")
  const [duration, setDuration] = useState<number>(0)
  const [assignmentTiming, setAssignmentTiming] = useState<AssignmentTiming>("during_event")
  const [errorMessage, setErrorMessage] = useState("")

  const categories: ActivityCategory[] = [
    "ice_breaker",
    "vocabulary",
    "conversation",
    "comprehension",
    "writing",
  ]

  const selectedActivity = useMemo(
    () => activities.find((item) => item.id === selectedActivityId) ?? null,
    [activities, selectedActivityId]
  )

  const reset = () => {
    setSelectedActivityId("")
    setDuration(0)
    setAssignmentTiming("during_event")
    setErrorMessage("")
  }

  const handleSelectActivity = (activity: ApiActivityOption) => {
    setSelectedActivityId(activity.id)
    setDuration(activity.default_duration)
    setErrorMessage("")
  }

  const handleAdd = async () => {
    setErrorMessage("")

    if (!selectedActivity) {
      setErrorMessage("Choisis une activite.")
      return
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      setErrorMessage("Duree invalide.")
      return
    }

    const result = await onAdd({
      activityId: selectedActivity.id,
      duration,
      assignmentTiming,
    })

    if (!result.ok) {
      setErrorMessage(result.error || "Ajout impossible.")
      return
    }

    setOpen(false)
    reset()
  }

  const groupedActivities = useMemo(() => {
    return categories.map((category) => ({
      category,
      label: getCategoryLabel(category),
      items: activities.filter((item) => item.category === category && !item.is_archived),
    }))
  }, [activities])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          reset()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une activite
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-1.5rem)] flex-col overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="px-6 pb-2 pt-6">
          <DialogTitle>Ajouter une activite a la seance</DialogTitle>
          <DialogDescription>
            Choisis une activite, ajuste sa duree, puis ajoute-la au programme.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="grid grid-cols-1 gap-6 py-2 md:grid-cols-2">
            <div className="space-y-4">
            <Label>Choisir une activite</Label>
              <ScrollArea className="h-[45vh] min-h-[260px] max-h-[420px] pr-3">
              <div className="space-y-4">
                {groupedActivities.map((group) => {
                  if (group.items.length === 0) {
                    return null
                  }

                  return (
                    <section key={group.category} className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">{group.label}</p>
                      <div className="space-y-2">
                        {group.items.map((activity) => {
                          const Icon = getActivityIcon(activity)
                          const selected = selectedActivity?.id === activity.id

                          return (
                            <button
                              key={activity.id}
                              type="button"
                              onClick={() => handleSelectActivity(activity)}
                              className={`w-full rounded-lg border p-3 text-left transition-all ${
                                selected
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50 hover:bg-muted/40"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`rounded-lg border p-1.5 ${CATEGORY_COLORS[activity.category]}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-foreground">{activity.name}</p>
                                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                    {activity.description}
                                  </p>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="text-[11px]">
                                      {activity.default_duration} min
                                    </Badge>
                                    <Badge variant="outline" className="text-[11px]">
                                      {activity.members_required} membre(s)
                                    </Badge>
                                  </div>
                                </div>
                                {selected ? <CheckCircle className="h-4 w-4 text-primary" /> : null}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </section>
                  )
                })}
              </div>
              </ScrollArea>
            </div>

            <div className="space-y-4">
              <Label>Configuration</Label>
              {selectedActivity ? (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg border p-2 ${CATEGORY_COLORS[selectedActivity.category]}`}>
                          {(() => {
                            const Icon = getActivityIcon(selectedActivity)
                            return <Icon className="h-5 w-5" />
                          })()}
                        </div>
                        <div>
                          <CardTitle className="text-base">{selectedActivity.name}</CardTitle>
                          <CardDescription>{getCategoryLabel(selectedActivity.category)}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{selectedActivity.description}</p>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Duree</Label>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                setDuration((current) => Math.max(selectedActivity.min_duration, current - 5))
                              }
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-16 text-center text-lg font-bold">{duration} min</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                setDuration((current) => Math.min(selectedActivity.max_duration, current + 5))
                              }
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <Slider
                          value={[duration]}
                          onValueChange={(value) => setDuration(value[0])}
                          min={selectedActivity.min_duration}
                          max={selectedActivity.max_duration}
                          step={5}
                        />

                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Min: {selectedActivity.min_duration} min</span>
                          <span>Max: {selectedActivity.max_duration} min</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Moment d'affectation</Label>
                        <Select
                          value={assignmentTiming}
                          onValueChange={(value) => setAssignmentTiming(value as AssignmentTiming)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="during_event">Pendant l'evenement</SelectItem>
                            <SelectItem value="before_event">Avant l'evenement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">Mode: {selectedActivity.selection_mode}</Badge>
                        <Badge variant="outline">
                          Sujets requis: {selectedActivity.requires_topic ? "oui" : "non"}
                        </Badge>
                        <Badge variant="outline">
                          Sujets reutilisables: {selectedActivity.topics_reusable ? "oui" : "non"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Instructions
                    </Label>
                    <ScrollArea className="h-[140px] rounded-lg border p-3">
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {(selectedActivity.instructions || "").split("\n").map((line, index) => (
                          <p key={`${selectedActivity.id}-instruction-${index}`}>{line}</p>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              ) : (
                <div className="flex h-[45vh] min-h-[260px] max-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed text-center">
                  <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-semibold">Selectionne une activite</p>
                  <p className="text-xs text-muted-foreground">
                    Clique sur une activite a gauche pour la configurer.
                  </p>
                </div>
              )}
            </div>
          </div>

          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        </div>

        <DialogFooter className="border-t px-6 pb-6 pt-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={() => void handleAdd()} disabled={!selectedActivity || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ajout...
              </>
            ) : (
              "Ajouter a la seance"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type AssignMembersDialogProps = {
  activityId: string
  activityName: string
  memberOptions: ApiMemberOption[]
  currentAssignments: ApiSessionActivityAssignment[]
  onAssign: (payload: {
    activityId: string
    assignments: Array<{ userId: string; assignmentType: string; reason?: string }>
  }) => Promise<{ ok: boolean; error?: string }>
  isSubmitting: boolean
  disabled: boolean
}

function AssignMembersDialog({
  activityId,
  activityName,
  memberOptions,
  currentAssignments,
  onAssign,
  isSubmitting,
  disabled,
}: AssignMembersDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState("")
  const [isSpinningRoulette, setIsSpinningRoulette] = useState(false)
  const [rouletteCountInput, setRouletteCountInput] = useState("1")
  const [rouletteRotationDeg, setRouletteRotationDeg] = useState(0)
  const [rouletteTurnInfo, setRouletteTurnInfo] = useState<{
    current: number
    total: number
  } | null>(null)
  const [rouletteCurrentUserId, setRouletteCurrentUserId] = useState<string | null>(null)
  const [roulettePickedUserIds, setRoulettePickedUserIds] = useState<string[]>([])
  const rouletteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeMemberOptions = memberOptions.filter(
    (item) => item.profile && item.status === "active"
  )

  const rouletteWheelMembers = useMemo(() => {
    if (activeMemberOptions.length <= 16) {
      return activeMemberOptions
    }
    return activeMemberOptions.slice(0, 16)
  }, [activeMemberOptions])

  const clearRouletteTimers = useCallback(() => {
    if (rouletteTimeoutRef.current) {
      clearTimeout(rouletteTimeoutRef.current)
      rouletteTimeoutRef.current = null
    }
  }, [])

  const resetFromCurrentAssignments = useCallback(() => {
    const existingUserIds = currentAssignments.map((item) => item.user_id)
    setSelectedUserIds(existingUserIds)
    setRouletteCountInput(existingUserIds.length > 0 ? String(existingUserIds.length) : "1")
    setRouletteTurnInfo(null)
    setRouletteCurrentUserId(null)
    setRoulettePickedUserIds([])
    setRouletteRotationDeg(0)
    setIsSpinningRoulette(false)
    setErrorMessage("")
  }, [currentAssignments])

  useEffect(() => {
    return () => {
      clearRouletteTimers()
    }
  }, [clearRouletteTimers])

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId)
      }
      return [...prev, userId]
    })
  }

  const handleSubmit = async () => {
    setErrorMessage("")

    if (selectedUserIds.length === 0) {
      setErrorMessage("Choisis au moins un membre a affecter.")
      return
    }

    const result = await onAssign({
      activityId,
      assignments: selectedUserIds.map((userId) => ({
        userId,
        assignmentType: "participant",
      })),
    })

    if (!result.ok) {
      setErrorMessage(result.error || "Affectation impossible.")
      return
    }

    setOpen(false)
    setErrorMessage("")
  }

  const handleRouletteSpin = () => {
    if (activeMemberOptions.length === 0 || isSpinningRoulette) {
      return
    }

    const requestedCount = Number.parseInt(rouletteCountInput, 10)
    if (!Number.isFinite(requestedCount) || requestedCount <= 0) {
      setErrorMessage("Entre un nombre valide de membres a tirer.")
      return
    }

    const clampedCount = Math.min(requestedCount, activeMemberOptions.length)
    if (clampedCount !== requestedCount) {
      setRouletteCountInput(String(clampedCount))
    }

    clearRouletteTimers()
    setErrorMessage("")
    setIsSpinningRoulette(true)
    setSelectedUserIds([])
    setRoulettePickedUserIds([])
    setRouletteTurnInfo({ current: 1, total: clampedCount })
    setRouletteCurrentUserId(null)

    const runTurn = (
      turnNumber: number,
      pool: ApiMemberOption[],
      pickedUserIds: string[]
    ) => {
      if (pool.length === 0 || turnNumber > clampedCount) {
        setRouletteTurnInfo(null)
        setIsSpinningRoulette(false)
        return
      }

      setRouletteTurnInfo({ current: turnNumber, total: clampedCount })
      setRouletteRotationDeg((previous) => {
        const extraTurns = 3 + Math.floor(Math.random() * 3)
        const randomStopAngle = Math.floor(Math.random() * 360)
        return previous + extraTurns * 360 + randomStopAngle
      })

      rouletteTimeoutRef.current = setTimeout(() => {
        const pickedIndex = Math.floor(Math.random() * pool.length)
        const pickedMember = pool[pickedIndex]

        if (!pickedMember) {
          setRouletteTurnInfo(null)
          setIsSpinningRoulette(false)
          return
        }

        const nextPicked = [...pickedUserIds, pickedMember.user_id]
        const nextPool = pool.filter((_, index) => index !== pickedIndex)

        setRouletteCurrentUserId(pickedMember.user_id)
        setRoulettePickedUserIds(nextPicked)
        setSelectedUserIds(nextPicked)

        if (turnNumber < clampedCount && nextPool.length > 0) {
          rouletteTimeoutRef.current = setTimeout(() => {
            runTurn(turnNumber + 1, nextPool, nextPicked)
          }, 260)
          return
        }

        setRouletteTurnInfo(null)
        setIsSpinningRoulette(false)
      }, 1700)
    }

    runTurn(1, [...activeMemberOptions], [])
  }

  const selectedMembers = selectedUserIds
    .map((userId) => activeMemberOptions.find((item) => item.user_id === userId))
    .filter((item): item is ApiMemberOption => Boolean(item && item.profile))

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          resetFromCurrentAssignments()
          return
        }
        clearRouletteTimers()
        setIsSpinningRoulette(false)
        setErrorMessage("")
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || memberOptions.length === 0}>
          <User className="mr-2 h-4 w-4" />
          Assigner
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-4xl max-h-[92vh]">
        <DialogHeader>
          <DialogTitle>Affecter des membres</DialogTitle>
          <DialogDescription>
            Configure les responsables pour "{activityName}".
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-5 py-2 lg:grid-cols-2">
          <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Roulette aleatoire</p>
              <p className="text-xs text-muted-foreground">
                Choisis un nombre de membres puis lance le tirage.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor={`roulette-count-${activityId}`}>Nombre a tirer</Label>
                <Input
                  id={`roulette-count-${activityId}`}
                  type="number"
                  min={1}
                  max={Math.max(1, activeMemberOptions.length)}
                  value={rouletteCountInput}
                  onChange={(event) => setRouletteCountInput(event.target.value)}
                  className="w-28"
                  disabled={isSpinningRoulette}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {activeMemberOptions.length} membre(s) actif(s)
              </p>
            </div>

            <div className="relative mx-auto w-fit pt-3">
              <div className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-l-[10px] border-r-[10px] border-b-[16px] border-l-transparent border-r-transparent border-b-emerald-700" />
              <div className="relative h-64 w-64 overflow-hidden rounded-full border-4 border-emerald-500 bg-background shadow-inner">
                <div
                  className="absolute inset-0 transition-transform duration-[2600ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                  style={{ transform: `rotate(${rouletteRotationDeg}deg)` }}
                >
                  {rouletteWheelMembers.map((member, index) => {
                    const profile = member.profile
                    if (!profile) {
                      return null
                    }

                    const angle = (360 / Math.max(rouletteWheelMembers.length, 1)) * index
                    const label = `${profile.first_name} ${profile.last_name}`

                    return (
                      <div
                        key={`wheel-${member.user_id}`}
                        className="absolute left-1/2 top-1/2 w-24 -translate-x-1/2 -translate-y-1/2 text-center"
                        style={{
                          transform: `rotate(${angle}deg) translateY(-108px) rotate(-${angle}deg)`,
                        }}
                      >
                        <span className="block truncate rounded bg-emerald-100/90 px-1 py-0.5 text-[10px] font-medium text-emerald-900">
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="absolute inset-[37%] flex items-center justify-center rounded-full border border-emerald-300 bg-emerald-100/90">
                  <span className="text-xs font-semibold text-emerald-800">
                    {isSpinningRoulette ? "Rotation..." : "Roulette"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleRouletteSpin}
                disabled={isSpinningRoulette || activeMemberOptions.length === 0}
                className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
              >
                {isSpinningRoulette ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Roulette...
                  </>
                ) : (
                  <>
                    <Shuffle className="mr-2 h-4 w-4" />
                    Lancer roulette
                  </>
                )}
              </Button>
            </div>

            {rouletteTurnInfo ? (
              <p className="text-center text-sm font-medium text-emerald-800">
                Tour {rouletteTurnInfo.current} / {rouletteTurnInfo.total}
              </p>
            ) : null}

            {rouletteCurrentUserId ? (
              <p className="text-center text-sm text-emerald-900">
                Selection actuelle: {(() => {
                  const current = activeMemberOptions.find((item) => item.user_id === rouletteCurrentUserId)
                  const profile = current?.profile
                  if (!profile) {
                    return "Membre tire"
                  }
                  return `${profile.first_name} ${profile.last_name}`
                })()}
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Membres selectionnes ({selectedMembers.length})</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUserIds([])}
                disabled={selectedMembers.length === 0}
              >
                Vider
              </Button>
            </div>

            <ScrollArea className="h-[168px] rounded-lg border p-3">
              {selectedMembers.length > 0 ? (
                <div className="space-y-2">
                  {selectedMembers.map((member, index) => {
                    const profile = member.profile
                    if (!profile) {
                      return null
                    }

                    return (
                      <div
                        key={`selected-${member.user_id}`}
                        className="flex items-center justify-between rounded-lg border p-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {index + 1}
                          </div>
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={profile.photo_url ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {profile.first_name[0]}
                              {profile.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {profile.first_name} {profile.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">@{profile.pseudo}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={LEVEL_COLORS[profile.english_level]}>
                          {LEVEL_LABELS[profile.english_level]}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Users className="mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Lance la roulette ou choisis manuellement.
                  </p>
                </div>
              )}
            </ScrollArea>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Selection manuelle</p>
              <ScrollArea className="h-[180px] rounded-lg border p-2">
                <div className="flex flex-wrap gap-2">
                  {activeMemberOptions.map((member) => {
                    const profile = member.profile
                    if (!profile) {
                      return null
                    }

                    const selected = selectedUserIds.includes(member.user_id)

                    return (
                      <Button
                        key={`manual-${member.user_id}`}
                        type="button"
                        variant={selected ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleUser(member.user_id)}
                        className="h-8"
                      >
                        <Avatar className="mr-1.5 h-5 w-5">
                          <AvatarImage src={profile.photo_url ?? undefined} />
                          <AvatarFallback className="text-[10px]">{profile.first_name[0]}</AvatarFallback>
                        </Avatar>
                        {profile.first_name}
                      </Button>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>

            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer les affectations"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type AssignedMembersPreviewProps = {
  assignments: ApiSessionActivityAssignment[]
}

function AssignedMembersPreview({ assignments }: AssignedMembersPreviewProps) {
  const visibleAssignments = assignments.slice(0, 6)
  const extraMembersCount = Math.max(assignments.length - visibleAssignments.length, 0)

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Membres assignes</p>
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-3 rounded-lg border bg-muted/30 px-2.5 py-2 transition-colors hover:bg-muted"
          >
            <div className="flex -space-x-2">
              {visibleAssignments.map((assignment) => {
                const profile = assignment.user
                const initials = profile ? `${profile.first_name[0]}${profile.last_name[0]}` : "U"

                return (
                  <Avatar key={`preview-${assignment.id}`} className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={profile?.photo_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                  </Avatar>
                )
              })}

              {extraMembersCount > 0 ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-[11px] font-semibold text-muted-foreground">
                  +{extraMembersCount}
                </div>
              ) : null}
            </div>

            <span className="text-xs text-muted-foreground">Clique pour voir tous les membres</span>
          </button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Membres selectionnes ({assignments.length})</DialogTitle>
            <DialogDescription>Liste complete des membres affectes a cette activite.</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-2">
              {assignments.map((assignment, index) => {
                const profile = assignment.user
                const fullName = profile
                  ? `${profile.first_name} ${profile.last_name}`
                  : `Utilisateur ${assignment.user_id}`

                return (
                  <div
                    key={`member-line-${assignment.id}`}
                    className="flex items-center justify-between rounded-lg border bg-background px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.photo_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {profile ? `${profile.first_name[0]}${profile.last_name[0]}` : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{fullName}</p>
                        {profile ? (
                          <p className="text-xs text-muted-foreground">@{profile.pseudo}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">{assignment.user_id}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[11px]">
                      {assignment.assignment_type}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getAssignmentRoleLabel(value: string) {
  if (value === "presenter") return "Presentateur"
  if (value === "host") return "Animateur"
  if (value === "team_a") return "Equipe A"
  if (value === "team_b") return "Equipe B"
  return "Participant"
}

type LiveActivityStageProps = {
  item: ApiSessionActivity
  topic: ApiSession["topic"]
  sessionStatus: SessionStatus
  canManage: boolean
  canAssign: boolean
  memberOptions: ApiMemberOption[]
  onAssign: (payload: {
    activityId: string
    assignments: Array<{ userId: string; assignmentType: string; reason?: string }>
  }) => Promise<{ ok: boolean; error?: string }>
  onNextActivity: () => Promise<void>
  isAssigning: boolean
  isAdvancing: boolean
  isActionDisabled: boolean
}

function LiveActivityStage({
  item,
  topic,
  sessionStatus,
  canManage,
  canAssign,
  memberOptions,
  onAssign,
  onNextActivity,
  isAssigning,
  isAdvancing,
  isActionDisabled,
}: LiveActivityStageProps) {
  const activity = item.activity
  const assignments = item.assignments ?? []
  const [activeView, setActiveView] = useState<"activity" | "topic">("activity")

  if (!activity) {
    return null
  }

  const Icon = getActivityIcon(activity)
  const instructionLines = activity.instructions
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  return (
    <section className="relative overflow-hidden rounded-[1.5rem] border border-green-500/30 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_28%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(240,253,244,0.95))] shadow-sm md:rounded-[2rem]">
      <div className="absolute right-8 top-8 hidden h-32 w-32 rounded-full bg-green-500/10 blur-3xl lg:block" />
      <div className="absolute bottom-10 left-10 hidden h-28 w-28 rounded-full bg-blue-500/10 blur-3xl lg:block" />

      <div className="relative flex min-h-[70dvh] flex-col gap-6 p-4 sm:p-6 md:min-h-[calc(100vh-8rem)] md:gap-8 md:p-10 xl:p-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <Badge className="w-fit gap-2 bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-600">
              <PlayCircle className="h-4 w-4" />
              Activite en cours
            </Badge>

            <div className="flex items-start gap-3 sm:gap-4">
              <div className={`rounded-2xl border p-3 shadow-sm sm:p-4 ${CATEGORY_COLORS[activity.category]}`}>
                <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground sm:text-sm">
                  {getCategoryLabel(activity.category)}
                </p>
                <h2 className="max-w-4xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-5xl">
                  {activity.name}
                </h2>
                <p className="max-w-3xl text-sm text-muted-foreground sm:text-base md:text-lg">
                  {activity.description || "Aucune description disponible pour cette activite."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 lg:w-auto">
            <Card className="border-white/60 bg-white/80 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Duree</p>
                <p className="mt-2 text-xl font-bold text-foreground sm:text-2xl">{item.duration} min</p>
              </CardContent>
            </Card>
            <Card className="border-white/60 bg-white/80 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Intervenants</p>
                <p className="mt-2 text-xl font-bold text-foreground sm:text-2xl">{assignments.length}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="inline-flex w-full rounded-full border border-border/60 bg-white/80 p-1 shadow-sm sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveView("activity")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
                activeView === "activity"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Activite en cours
            </button>
            <button
              type="button"
              onClick={() => setActiveView("topic")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
                activeView === "topic"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sujet
            </button>
          </div>

          {sessionStatus === "ongoing" ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-emerald-600 bg-white/90 text-emerald-700 hover:bg-emerald-50 sm:w-auto"
              onClick={() => void onNextActivity()}
              disabled={isAdvancing}
            >
              {isAdvancing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <SkipForward className="mr-2 h-4 w-4" />
              )}
              Activite suivante
            </Button>
          ) : null}

          <ActivityInstructionsDialog activity={activity} />

          {canAssign ? (
            <AssignMembersDialog
              activityId={item.id}
              activityName={activity.name}
              memberOptions={memberOptions}
              currentAssignments={assignments}
              onAssign={onAssign}
              isSubmitting={isAssigning}
              disabled={isActionDisabled}
            />
          ) : null}

          {canManage ? (
            <Badge variant="outline" className="w-fit bg-white/70">
              {getAssignmentTimingLabel(item.assignment_timing)}
            </Badge>
          ) : null}
        </div>

        <div className="grid flex-1 gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          {activeView === "activity" ? (
            <>
              <Card className="border-white/60 bg-white/82 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Instructions</CardTitle>
                  <CardDescription>Consignes a suivre pendant toute l&apos;activite.</CardDescription>
                </CardHeader>
                <CardContent>
                  {instructionLines.length > 0 ? (
                    <div className="space-y-4">
                      {instructionLines.map((line, index) => (
                        <div
                          key={`${item.id}-live-instruction-${index}`}
                          className="flex items-start gap-4 rounded-2xl border bg-background/70 p-4"
                        >
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {index + 1}
                          </div>
                          <p className="min-w-0 pt-1 text-sm leading-6 text-foreground sm:text-base md:text-lg md:leading-7">{line}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed p-6 text-muted-foreground">
                      Aucune instruction enregistree pour cette activite.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-white/60 bg-white/82 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Membres qui presentent</CardTitle>
                  <CardDescription>Participants assignes a cette activite en direct.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assignments.length > 0 ? (
                    assignments.map((assignment) => {
                      const profile = assignment.user
                      const fullName = profile
                        ? `${profile.first_name} ${profile.last_name}`
                        : assignment.user_id

                      return (
                        <div
                          key={`live-assignment-${assignment.id}`}
                          className="flex flex-col items-start gap-3 rounded-2xl border bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar className="h-12 w-12 border border-border">
                              <AvatarImage src={profile?.photo_url ?? undefined} />
                              <AvatarFallback>
                                {profile ? `${profile.first_name[0]}${profile.last_name[0]}` : "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-foreground">{fullName}</p>
                              <p className="truncate text-sm text-muted-foreground">
                                {profile ? `@${profile.pseudo}` : assignment.user_id}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {getAssignmentRoleLabel(assignment.assignment_type)}
                          </Badge>
                        </div>
                      )
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed p-6 text-muted-foreground">
                      Aucun membre assigne pour le moment.
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="border-white/60 bg-white/82 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Sujet de seance</CardTitle>
                  <CardDescription>Theme central a suivre pendant l&apos;animation.</CardDescription>
                </CardHeader>
                <CardContent>
                  {topic ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={LEVEL_COLORS[topic.level]}>
                          {LEVEL_LABELS[topic.level]}
                        </Badge>
                      </div>
                      <h3 className="text-2xl font-bold text-foreground">{topic.title}</h3>
                      <p className="text-base leading-7 text-muted-foreground md:text-lg">
                        {topic.description}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed p-6 text-muted-foreground">
                      Aucun sujet associe a cette seance.
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

type ActivityInstructionsDialogProps = {
  activity: NonNullable<NonNullable<ApiSession["session_activities"]>[number]["activity"]>
}

function ActivityInstructionsDialog({ activity }: ActivityInstructionsDialogProps) {
  const Icon = getActivityIcon(activity)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Eye className="h-4 w-4" />
          Instructions
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`rounded-lg border p-2 ${CATEGORY_COLORS[activity.category]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{activity.name}</DialogTitle>
              <DialogDescription>
                {getCategoryLabel(activity.category)} - {activity.default_duration} min
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[56vh] pr-4">
          <div className="space-y-4 py-2">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Description</h4>
              <p className="text-sm text-muted-foreground">{activity.description}</p>
            </div>

            <Separator />

            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Instructions</h4>
              <div className="rounded-lg bg-muted/50 p-3">
                <ol className="space-y-1 text-sm text-muted-foreground">
                  {activity.instructions.split("\n").map((line, index) => (
                    <li key={`${activity.id}-step-${index}`}>{line}</li>
                  ))}
                </ol>
              </div>
            </div>

            {activity.materials.length > 0 ? (
              <>
                <Separator />
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-foreground">Materiel</h4>
                  <ul className="space-y-1">
                    {activity.materials.map((material, index) => (
                      <li
                        key={`${activity.id}-material-${index}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {material}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

type SessionTopicDialogProps = {
  topics: ApiTopicOption[]
  currentTopicId: string | null
  onSave: (topicId: string | null) => Promise<{ ok: boolean; error?: string }>
  isSubmitting: boolean
  disabled: boolean
}

function SessionTopicDialog({
  topics,
  currentTopicId,
  onSave,
  isSubmitting,
  disabled,
}: SessionTopicDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedTopicId, setSelectedTopicId] = useState(currentTopicId ?? "none")
  const [errorMessage, setErrorMessage] = useState("")

  const selectedTopic = useMemo(
    () => topics.find((item) => item.id === selectedTopicId) ?? null,
    [topics, selectedTopicId]
  )

  const handleSubmit = async () => {
    setErrorMessage("")
    const result = await onSave(selectedTopicId === "none" ? null : selectedTopicId)

    if (!result.ok) {
      setErrorMessage(result.error || "Mise a jour impossible.")
      return
    }

    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          setSelectedTopicId(currentTopicId ?? "none")
          setErrorMessage("")
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <MessageSquare className="mr-2 h-4 w-4" />
          {currentTopicId ? "Modifier le sujet" : "Ajouter un sujet"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sujet de la seance</DialogTitle>
          <DialogDescription>
            Associe un sujet principal a cette seance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="session-topic-select">Sujet</Label>
            <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
              <SelectTrigger id="session-topic-select">
                <SelectValue placeholder="Selectionner un sujet..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun sujet</SelectItem>
                {topics.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTopic ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="space-y-2 p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={LEVEL_COLORS[selectedTopic.level]}>
                    {LEVEL_LABELS[selectedTopic.level]}
                  </Badge>
                  {selectedTopic.activity ? (
                    <Badge variant="outline">{selectedTopic.activity.name}</Badge>
                  ) : null}
                </div>
                <p className="text-sm font-medium text-foreground">{selectedTopic.title}</p>
                <p className="text-xs text-muted-foreground">{selectedTopic.description}</p>
              </CardContent>
            </Card>
          ) : null}

          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [session, setSession] = useState<ApiSession | null>(null)
  const [availableActivities, setAvailableActivities] = useState<ApiActivityOption[]>([])
  const [availableTopics, setAvailableTopics] = useState<ApiTopicOption[]>([])
  const [activeMembers, setActiveMembers] = useState<ApiMemberOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isMutating, setIsMutating] = useState(false)
  const [isAddingActivity, setIsAddingActivity] = useState(false)
  const [assigningActivityId, setAssigningActivityId] = useState<string | null>(null)
  const [selectingActivityId, setSelectingActivityId] = useState<string | null>(null)
  const [removingActivityId, setRemovingActivityId] = useState<string | null>(null)
  const [isAdvancingActivity, setIsAdvancingActivity] = useState(false)
  const [isUpdatingTopic, setIsUpdatingTopic] = useState(false)

  const fetchSession = useCallback(async () => {
    try {
      const [sessionResponse, activitiesResponse, membersResponse, topicsResponse] = await Promise.all([
        fetch(`/api/sessions/${id}`),
        fetch("/api/activities?includeArchived=false&limit=100&page=1"),
        fetch("/api/members?status=active&limit=100&page=1"),
        fetch("/api/topics?includeArchived=false&limit=100&page=1"),
      ])

      const sessionPayload = await readJson<ApiSessionResponse>(sessionResponse)
      const activitiesPayload = await readJson<ApiActivitiesResponse>(activitiesResponse)
      const membersPayload = await readJson<ApiMembersResponse>(membersResponse)
      const topicsPayload = await readJson<ApiTopicsResponse>(topicsResponse)

      if (!sessionResponse.ok || !sessionPayload.success || !sessionPayload.data) {
        setErrorMessage(sessionPayload.error || "Chargement de la seance impossible.")
        setSession(null)
      } else {
        setSession(sessionPayload.data)
      }

      if (activitiesResponse.ok && activitiesPayload.success) {
        setAvailableActivities((activitiesPayload.data ?? []).filter((item) => !item.is_archived))
      } else {
        setAvailableActivities([])
      }

      if (membersResponse.ok && membersPayload.success) {
        setActiveMembers(membersPayload.data ?? [])
      } else {
        setActiveMembers([])
      }

      if (topicsResponse.ok && topicsPayload.success) {
        setAvailableTopics((topicsPayload.data ?? []).filter((item) => !item.is_archived))
      } else {
        setAvailableTopics([])
      }
    } catch {
      setErrorMessage("Impossible de joindre le serveur pour charger la seance.")
      setSession(null)
      setAvailableTopics([])
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    setIsLoading(true)
    setErrorMessage("")
    void fetchSession()
  }, [fetchSession])

  const refresh = useCallback(async () => {
    setErrorMessage("")
    await fetchSession()
  }, [fetchSession])

  const runSessionAction = useCallback(
    async (
      endpoint: string,
      successText: string,
      method: "POST" | "DELETE" = "POST"
    ) => {
      setIsMutating(true)
      setErrorMessage("")
      setSuccessMessage("")

      try {
        const response = await fetch(endpoint, { method })
        const payload = await readJson<{ success?: boolean; error?: string }>(response)

        if (!response.ok || !payload.success) {
          setErrorMessage(payload.error || "Operation impossible.")
          setIsMutating(false)
          return
        }

        await refresh()
        setSuccessMessage(successText)
        setIsMutating(false)
      } catch {
        setErrorMessage("Impossible de joindre le serveur pour cette operation.")
        setIsMutating(false)
      }
    },
    [refresh]
  )

  const handleAddActivity = useCallback(
    async (payload: {
      activityId: string
      duration?: number
      orderIndex?: number
      assignmentTiming: AssignmentTiming
    }) => {
      setIsAddingActivity(true)
      setErrorMessage("")
      setSuccessMessage("")

      try {
        const response = await fetch(`/api/sessions/${id}/activities`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        const data = await readJson<{ success?: boolean; error?: string }>(response)

        if (!response.ok || !data.success) {
          setIsAddingActivity(false)
          return { ok: false as const, error: data.error || "Ajout impossible." }
        }

        await refresh()
        setSuccessMessage("Activite ajoutee a la seance.")
        setIsAddingActivity(false)
        return { ok: true as const }
      } catch {
        setIsAddingActivity(false)
        return {
          ok: false as const,
          error: "Impossible de joindre le serveur pour ajouter l'activite.",
        }
      }
    },
    [id, refresh]
  )

  const handleRemoveActivity = useCallback(
    async (activityId: string) => {
      setRemovingActivityId(activityId)
      setErrorMessage("")
      setSuccessMessage("")

      try {
        const response = await fetch(`/api/sessions/${id}/activities/${activityId}`, {
          method: "DELETE",
        })

        const payload = await readJson<{ success?: boolean; error?: string }>(response)

        if (!response.ok || !payload.success) {
          setErrorMessage(payload.error || "Suppression impossible.")
          setRemovingActivityId(null)
          return
        }

        await refresh()
        setSuccessMessage("Activite retiree de la seance.")
        setRemovingActivityId(null)
      } catch {
        setErrorMessage("Impossible de joindre le serveur pour supprimer l'activite.")
        setRemovingActivityId(null)
      }
    },
    [id, refresh]
  )

  const handleAssignActivity = useCallback(
    async (payload: {
      activityId: string
      assignments: Array<{ userId: string; assignmentType: string; reason?: string }>
    }) => {
      setAssigningActivityId(payload.activityId)
      setErrorMessage("")
      setSuccessMessage("")

      try {
        const response = await fetch(`/api/sessions/${id}/activities/${payload.activityId}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignments: payload.assignments }),
        })

        const data = await readJson<{ success?: boolean; error?: string }>(response)

        if (!response.ok || !data.success) {
          setAssigningActivityId(null)
          return { ok: false as const, error: data.error || "Affectation impossible." }
        }

        await refresh()
        setSuccessMessage("Affectation mise a jour.")
        setAssigningActivityId(null)
        return { ok: true as const }
      } catch {
        setAssigningActivityId(null)
        return {
          ok: false as const,
          error: "Impossible de joindre le serveur pour cette affectation.",
        }
      }
    },
    [id, refresh]
  )

  const handleAutoSelectActivity = useCallback(
    async (activityId: string) => {
      setSelectingActivityId(activityId)
      setErrorMessage("")
      setSuccessMessage("")

      try {
        const response = await fetch(`/api/sessions/${id}/activities/${activityId}/select`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "automatic" }),
        })

        const payload = await readJson<{ success?: boolean; error?: string }>(response)
        if (!response.ok || !payload.success) {
          setErrorMessage(payload.error || "Selection automatique impossible.")
          setSelectingActivityId(null)
          return
        }

        await refresh()
        setSuccessMessage("Selection automatique enregistree.")
        setSelectingActivityId(null)
      } catch {
        setErrorMessage("Impossible de joindre le serveur pour la selection automatique.")
        setSelectingActivityId(null)
      }
    },
    [id, refresh]
  )

  const handleNextActivity = useCallback(async () => {
    setIsAdvancingActivity(true)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const response = await fetch(`/api/sessions/${id}/next-activity`, {
        method: "POST",
      })
      const payload = await readJson<{
        success?: boolean
        error?: string
        data?: {
          hasNext?: boolean
        }
      }>(response)

      if (!response.ok || !payload.success) {
        setErrorMessage(payload.error || "Passage a l'activite suivante impossible.")
        setIsAdvancingActivity(false)
        return
      }

      await refresh()
      setSuccessMessage(
        payload.data?.hasNext
          ? "Passage a l'activite suivante effectue."
          : "Derniere activite terminee. Aucune activite suivante."
      )
      setIsAdvancingActivity(false)
    } catch {
      setErrorMessage("Impossible de joindre le serveur pour passer a l'activite suivante.")
      setIsAdvancingActivity(false)
    }
  }, [id, refresh])

  const handleUpdateSessionTopic = useCallback(
    async (topicId: string | null) => {
      setIsUpdatingTopic(true)
      setErrorMessage("")
      setSuccessMessage("")

      try {
        const response = await fetch(`/api/sessions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicId }),
        })
        const payload = await readJson<{ success?: boolean; error?: string }>(response)

        if (!response.ok || !payload.success) {
          setIsUpdatingTopic(false)
          return {
            ok: false as const,
            error: payload.error || "Mise a jour du sujet impossible.",
          }
        }

        await refresh()
        setSuccessMessage(topicId ? "Sujet de la seance enregistre." : "Sujet de la seance retire.")
        setIsUpdatingTopic(false)
        return { ok: true as const }
      } catch {
        setIsUpdatingTopic(false)
        return {
          ok: false as const,
          error: "Impossible de joindre le serveur pour enregistrer le sujet.",
        }
      }
    },
    [id, refresh]
  )

  const sortedActivities = useMemo(
    () => [...(session?.session_activities ?? [])].sort((left, right) => left.order_index - right.order_index),
    [session]
  )

  const completedActivities = useMemo(
    () => sortedActivities.filter((item) => item.status === "completed" || item.status === "skipped").length,
    [sortedActivities]
  )

  const inProgressActivities = useMemo(
    () => sortedActivities.filter((item) => item.status === "in_progress").length,
    [sortedActivities]
  )

  const sessionProgress = useMemo(() => {
    if (sortedActivities.length === 0) {
      return 0
    }
    const weightedDone = completedActivities + (inProgressActivities > 0 ? 0.5 : 0)
    return Math.min(100, Math.round((weightedDone / sortedActivities.length) * 100))
  }, [completedActivities, inProgressActivities, sortedActivities.length])

  const liveUnassignedActivities = useMemo(
    () =>
      sortedActivities.filter(
        (item) =>
          (item.status === "pending" || item.status === "in_progress") &&
          (item.assignments ?? []).length === 0
      ),
    [sortedActivities]
  )

  const totalDuration = useMemo(
    () => sortedActivities.reduce((sum, item) => sum + (item.duration ?? item.activity?.default_duration ?? 0), 0),
    [sortedActivities]
  )

  const currentActivity = useMemo(
    () => sortedActivities.find((item) => item.status === "in_progress") ?? null,
    [sortedActivities]
  )

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Chargement de la seance...</p>
        </CardContent>
      </Card>
    )
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <Button variant="outline" asChild>
          <Link href="/sessions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux seances
          </Link>
        </Button>
        <Card className="border-destructive/40">
          <CardContent className="p-6">
            <p className="text-sm text-destructive">{errorMessage || "Seance introuvable."}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const canManage = session.status === "upcoming"
  const sessionStatusMeta = SESSION_STATUS_CONFIG[session.status]
  const SessionStatusIcon = sessionStatusMeta.icon

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/sessions">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        <div className="flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold text-foreground sm:text-2xl">Seance du {formatDateFr(session.date)}</h1>
                <Badge variant={sessionStatusMeta.variant} className="gap-1">
                  <SessionStatusIcon className="h-3.5 w-3.5" />
                  {sessionStatusMeta.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {normalizeTime(session.start_time)} - {normalizeTime(session.end_time)}
              </p>
              {session.topic ? (
                <p className="text-xs text-muted-foreground">
                  Sujet: <span className="font-medium text-foreground">{session.topic.title}</span>
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {session.status === "upcoming" ? (
                <>
                  <Button
                    onClick={() =>
                      void runSessionAction(
                        `/api/sessions/${id}/start`,
                        "Seance demarree avec succes.",
                        "POST"
                      )
                    }
                    disabled={isMutating}
                    className="w-full gap-2 bg-green-600 hover:bg-green-700 sm:w-auto"
                    >
                      {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                    Demarrer la seance
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void runSessionAction(
                        `/api/sessions/${id}/complete`,
                        "Seance terminee avec succes.",
                        "POST"
                      )
                    }
                    disabled={isMutating}
                    className="w-full gap-2 sm:w-auto"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Terminer
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      void runSessionAction(`/api/sessions/${id}`, "Seance annulee avec succes.", "DELETE")
                    }
                    disabled={isMutating}
                    className="w-full gap-2 sm:w-auto"
                  >
                    <Ban className="h-4 w-4" />
                    Annuler
                  </Button>
                </>
              ) : null}

              {session.status === "ongoing" ? (
                <Button
                  variant="destructive"
                  onClick={() =>
                    void runSessionAction(
                      `/api/sessions/${id}/complete`,
                      "Seance terminee avec succes.",
                      "POST"
                    )
                  }
                  disabled={isMutating}
                  className="w-full gap-2 sm:w-auto"
                >
                  <StopCircle className="h-4 w-4" />
                  Terminer la seance
                </Button>
              ) : null}

              {session.status === "completed" ? (
                <Badge variant="secondary" className="h-9 px-4 text-sm">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Seance terminee
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <Card className="border-destructive/40">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      {successMessage ? (
        <Card className="border-emerald-500/40">
          <CardContent className="p-4">
            <p className="text-sm text-emerald-700">{successMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      {session.status === "ongoing" && currentActivity ? (
        <LiveActivityStage
          item={currentActivity}
          topic={session.topic}
          sessionStatus={session.status}
          canManage={canManage}
          canAssign={canManage || (session.status === "ongoing" && (currentActivity.assignments ?? []).length === 0)}
          memberOptions={activeMembers}
          onAssign={handleAssignActivity}
          onNextActivity={handleNextActivity}
          isAssigning={assigningActivityId === currentActivity.id}
          isAdvancing={isAdvancingActivity}
          isActionDisabled={assigningActivityId !== null && assigningActivityId !== currentActivity.id}
        />
      ) : null}

      {session.status === "ongoing" ? (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500 animate-ping" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Seance en cours</p>
                <p className="text-sm text-muted-foreground">
                  Progression: {sessionProgress}%
                  {currentActivity ? ` - Activite ${currentActivity.order_index}: ${currentActivity.activity?.name ?? "Activite"}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {completedActivities}/{sortedActivities.length} activites
              </Badge>
              <Progress value={sessionProgress} className="w-28" />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-semibold text-foreground">{formatDateFr(session.date)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-cyan-500/10 p-2">
              <Clock className="h-5 w-5 text-cyan-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horaire</p>
              <p className="font-semibold text-foreground">
                {normalizeTime(session.start_time)} - {normalizeTime(session.end_time)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <BookOpen className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Activites</p>
              <p className="font-semibold text-foreground">{sortedActivities.length} prevues</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Sparkles className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duree totale</p>
              <p className="font-semibold text-foreground">{totalDuration} min</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-rose-500/10 p-2">
              <Users className="h-5 w-5 text-rose-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sans affectation</p>
              <p className="font-semibold text-foreground">{liveUnassignedActivities.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Sujet de seance
            </CardTitle>
            {canManage ? (
              <SessionTopicDialog
                topics={availableTopics}
                currentTopicId={session.topic_id}
                onSave={handleUpdateSessionTopic}
                isSubmitting={isUpdatingTopic}
                disabled={isUpdatingTopic}
              />
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {session.topic ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={LEVEL_COLORS[session.topic.level]}>
                  {LEVEL_LABELS[session.topic.level]}
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground">{session.topic.title}</p>
              <p className="text-sm text-muted-foreground">{session.topic.description}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun sujet associe a cette seance.</p>
          )}
        </CardContent>
      </Card>

      {session.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes de seance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{session.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      {session.status === "ongoing" && liveUnassignedActivities.length > 0 ? (
        <Card className="border-amber-500/40 bg-amber-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Affectations a faire en direct</CardTitle>
            <CardDescription>
              {liveUnassignedActivities.length} activite(s) sans membre assigne.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {liveUnassignedActivities.map((item) => (
                <Badge key={`missing-${item.id}`} variant="outline">
                  #{item.order_index} {item.activity?.name ?? "Activite"}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground">Programme de la seance</h2>
          {canManage ? (
            <AddActivityDialog
              activities={availableActivities}
              onAdd={handleAddActivity}
              isSubmitting={isAddingActivity}
            />
          ) : null}
        </div>

        {sortedActivities.length > 0 ? (
          <div className="space-y-4">
            {sortedActivities.map((item, index) => {
              const activity = item.activity
              const Icon = activity ? getActivityIcon(activity) : BookOpen
              const statusMeta = ACTIVITY_STATUS_CONFIG[item.status]
              const ActivityStatusIcon = statusMeta.icon
              const assignments = item.assignments ?? []

              const isInProgress = item.status === "in_progress"
              const isCompleted = item.status === "completed"
              const isSkipped = item.status === "skipped"
              const canAssign = canManage || (session.status === "ongoing" && assignments.length === 0)

              return (
                <Card
                  key={item.id}
                  className={`transition-all ${
                    isInProgress
                      ? "border-primary/50 bg-primary/5 ring-2 ring-primary/20"
                      : isCompleted
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : isSkipped
                          ? "opacity-75"
                          : ""
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        {canManage ? <GripVertical className="h-5 w-5 shrink-0 text-muted-foreground" /> : null}

                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            isInProgress
                              ? "bg-primary text-primary-foreground"
                              : isCompleted
                                ? "bg-emerald-600 text-white"
                                : "bg-primary/10 text-primary"
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                        </div>

                        <div className={`rounded-lg border p-2 ${activity ? CATEGORY_COLORS[activity.category] : ""}`}>
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-base">{activity?.name ?? "Activite"}</CardTitle>
                            <Badge variant={statusMeta.variant} className={isInProgress ? "animate-pulse" : ""}>
                              <ActivityStatusIcon className="mr-1 h-3 w-3" />
                              {statusMeta.label}
                            </Badge>
                            {activity ? (
                              <Badge variant="outline" className={CATEGORY_COLORS[activity.category]}>
                                {getCategoryLabel(activity.category)}
                              </Badge>
                            ) : null}
                          </div>
                          <CardDescription className="mt-1">
                            Duree: {item.duration} min - Assignes: {assignments.length} -{" "}
                            {getAssignmentTimingLabel(item.assignment_timing)}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
                        {session.status === "ongoing" && isInProgress ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50 sm:w-auto"
                            onClick={() => void handleNextActivity()}
                            disabled={isAdvancingActivity}
                          >
                            {isAdvancingActivity ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <SkipForward className="mr-2 h-4 w-4" />
                            )}
                            Activite suivante
                          </Button>
                        ) : null}

                        {activity ? <ActivityInstructionsDialog activity={activity} /> : null}

                        {canAssign ? (
                          <AssignMembersDialog
                            activityId={item.id}
                            activityName={activity?.name ?? "Activite"}
                            memberOptions={activeMembers}
                            currentAssignments={assignments}
                            onAssign={handleAssignActivity}
                            isSubmitting={assigningActivityId === item.id}
                            disabled={assigningActivityId !== null && assigningActivityId !== item.id}
                          />
                        ) : null}

                        {canManage ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="self-start sm:self-auto">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem disabled>
                                <Clock className="mr-2 h-4 w-4" />
                                Modifier la duree (bientot)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => void handleAutoSelectActivity(item.id)}
                                disabled={selectingActivityId === item.id}
                              >
                                {selectingActivityId === item.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Shuffle className="mr-2 h-4 w-4" />
                                )}
                                Selection auto equitable
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => void handleRemoveActivity(item.id)}
                                disabled={removingActivityId === item.id}
                              >
                                {removingActivityId === item.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Retirer de la seance
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {activity?.description || "Aucune description disponible."}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        <Users className="mr-1 h-3 w-3" />
                        {activity?.members_required ?? 0} membre(s) requis
                      </Badge>
                      {activity?.requires_topic ? <Badge variant="secondary">Sujet requis</Badge> : null}
                      {activity ? (
                        <Badge variant="outline">Mode: {activity.selection_mode}</Badge>
                      ) : null}
                    </div>

                    {assignments.length > 0 ? (
                      <AssignedMembersPreview assignments={assignments} />
                    ) : (
                      activity && activity.members_required > 0 ? (
                        <div className="rounded-lg border border-dashed p-4 text-center">
                          <Users className="mx-auto mb-2 h-7 w-7 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground">Aucun membre assigne.</p>
                          {session.status === "ongoing" ? (
                            <p className="mt-1 text-xs font-medium text-amber-700">
                              Cette activite peut etre assignee en direct.
                            </p>
                          ) : null}
                        </div>
                      ) : null
                    )}
                  </CardContent>
                </Card>
              )
            })}

            <Card className="bg-muted/40">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">Duree totale du programme</span>
                </div>
                <Badge variant="outline" className="text-lg font-bold">
                  {totalDuration} min
                </Badge>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">Aucune activite planifiee</p>
              <p className="text-xs text-muted-foreground">
                Ajoute des activites pour construire le programme.
              </p>
              {canManage ? (
                <div className="mt-4">
                  <AddActivityDialog
                    activities={availableActivities}
                    onAdd={handleAddActivity}
                    isSubmitting={isAddingActivity}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
