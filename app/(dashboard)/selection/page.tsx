"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CheckCircle,
  Clock,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Shuffle,
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Level = "beginner" | "intermediate" | "advanced"
type SelectionMode = "automatic" | "manual" | "semi-automatic"

type ProfileLite = {
  id: string
  first_name: string
  last_name: string
  pseudo: string
  photo_url: string | null
  english_level: Level
}

type SummaryActivity = {
  activity: {
    id: string
    name: string
    category: "ice_breaker" | "vocabulary" | "conversation" | "comprehension" | "writing"
    selection_mode: SelectionMode
    members_required: number
    is_archived: boolean
  }
  activeCycle: {
    id: string
    started_at: string
    ended_at: string | null
    is_active: boolean
    countedSelectionCount: number
    progressPercent: number
  } | null
  cyclesCount: number
  recentSelections: Array<{
    id: string
    user_id: string
    session_id: string
    session_activity_id: string
    counts_in_cycle: boolean
    selection_mode: SelectionMode
    selected_at: string
    user: ProfileLite | null
  }>
  matrix: Array<{
    userId: string
    count: number
  }>
}

type SelectionSummaryResponse = {
  success?: boolean
  error?: string
  data?: {
    generatedAt: string
    stats: {
      activitiesWithSelection: number
      activeCycles: number
      eligibleMembers: number
      totalSelections: number
    }
    members: ProfileLite[]
    activities: SummaryActivity[]
  }
}

type ActivityCycleResponse = {
  success?: boolean
  error?: string
  data?: {
    activity: {
      id: string
      name: string
      selection_mode: SelectionMode
      is_archived: boolean
    }
    cycle: {
      id: string
      activity_id: string
      started_at: string
      ended_at: string | null
      is_active: boolean
      selections: Array<{
        id: string
        user_id: string
        session_id: string
        session_activity_id: string
        counts_in_cycle: boolean
        selection_mode: SelectionMode
        selected_at: string
        user: ProfileLite | null
      }>
      stats: {
        eligibleCount: number
        countedSelectionCount: number
        progressPercent: number
      }
    } | null
  }
}

type ActivityCycleData = NonNullable<ActivityCycleResponse["data"]>["cycle"]

function readName(profile: ProfileLite | null) {
  if (!profile) {
    return "Membre inconnu"
  }
  return `${profile.first_name} ${profile.last_name}`
}

function CycleDetailsDialog({
  activityId,
  activityName,
}: {
  activityId: string
  activityName: string
}) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [cycleData, setCycleData] = useState<ActivityCycleData | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    let isAlive = true
    const load = async () => {
      setIsLoading(true)
      setErrorMessage("")
      try {
        const response = await fetch(`/api/activities/${activityId}/cycle`)
        const payload = (await response.json().catch(() => ({}))) as ActivityCycleResponse

        if (!isAlive) {
          return
        }

        if (!response.ok || !payload.success || !payload.data) {
          setErrorMessage(payload.error || "Chargement du cycle impossible.")
          setCycleData(null)
          setIsLoading(false)
          return
        }

        setCycleData(payload.data.cycle)
        setIsLoading(false)
      } catch {
        if (!isAlive) {
          return
        }
        setErrorMessage("Impossible de joindre le serveur.")
        setCycleData(null)
        setIsLoading(false)
      }
    }

    void load()
    return () => {
      isAlive = false
    }
  }, [activityId, open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1">
          Voir le cycle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cycle de selection - {activityName}</DialogTitle>
          <DialogDescription>
            Historique des selections pour cette activite.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement du cycle...
          </div>
        ) : null}

        {!isLoading && errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : null}

        {!isLoading && !errorMessage ? (
          cycleData ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Debut du cycle</p>
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(cycleData.started_at).toLocaleDateString("fr-FR")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Membres comptes</p>
                    <p className="text-sm font-semibold text-foreground">
                      {cycleData.stats.countedSelectionCount}/{cycleData.stats.eligibleCount}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Progression</p>
                    <p className="text-sm font-semibold text-foreground">{cycleData.stats.progressPercent}%</p>
                  </CardContent>
                </Card>
              </div>

              <Progress value={cycleData.stats.progressPercent} className="h-2" />

              <div className="max-h-[360px] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membre</TableHead>
                      <TableHead>Seance</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cycleData.selections.length > 0 ? (
                      cycleData.selections.map((selection) => (
                        <TableRow key={selection.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={selection.user?.photo_url ?? undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {selection.user
                                    ? `${selection.user.first_name[0]}${selection.user.last_name[0]}`
                                    : "U"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-foreground">{readName(selection.user)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">#{selection.session_id}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {selection.selection_mode}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {new Date(selection.selected_at).toLocaleDateString("fr-FR")}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                          Aucune selection dans ce cycle.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun cycle actif pour cette activite.
            </p>
          )
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export default function SelectionPage() {
  const [summary, setSummary] = useState<SelectionSummaryResponse["data"] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [resettingActivityId, setResettingActivityId] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    setErrorMessage("")

    try {
      const response = await fetch("/api/selection/summary")
      const payload = (await response.json().catch(() => ({}))) as SelectionSummaryResponse

      if (!response.ok || !payload.success || !payload.data) {
        setSummary(null)
        setErrorMessage(payload.error || "Chargement de la section selection impossible.")
        setIsLoading(false)
        return
      }

      setSummary(payload.data)
      setIsLoading(false)
    } catch {
      setSummary(null)
      setErrorMessage("Impossible de joindre le serveur.")
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    setIsLoading(true)
    void fetchSummary()
  }, [fetchSummary])

  const handleResetCycle = useCallback(
    async (activityId: string) => {
      setResettingActivityId(activityId)
      setErrorMessage("")
      try {
        const response = await fetch(`/api/activities/${activityId}/cycle/reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "manual reset from dashboard" }),
        })

        const payload = (await response.json().catch(() => ({}))) as {
          success?: boolean
          error?: string
        }

        if (!response.ok || !payload.success) {
          setErrorMessage(payload.error || "Reinitialisation du cycle impossible.")
          setResettingActivityId(null)
          return
        }

        await fetchSummary()
        setResettingActivityId(null)
      } catch {
        setErrorMessage("Impossible de joindre le serveur pour reinitialiser ce cycle.")
        setResettingActivityId(null)
      }
    },
    [fetchSummary]
  )

  const matrixByActivityByUser = useMemo(() => {
    const matrix = new Map<string, Map<string, number>>()
    for (const item of summary?.activities ?? []) {
      const byUser = new Map<string, number>()
      for (const cell of item.matrix) {
        byUser.set(cell.userId, cell.count)
      }
      matrix.set(item.activity.id, byUser)
    }
    return matrix
  }, [summary])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement de la section selection...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Selection equitable</h1>
          <p className="text-muted-foreground">
            Rotation des membres pour equilibrer les prises de parole et responsabilites.
          </p>
        </div>
        <Button variant="outline" onClick={() => void fetchSummary()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {errorMessage ? (
        <Card className="border-destructive/40">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Shuffle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {summary?.stats.activitiesWithSelection ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Activites avec selection</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <CheckCircle className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{summary?.stats.activeCycles ?? 0}</p>
              <p className="text-sm text-muted-foreground">Cycles actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-cyan-500/10 p-2">
              <Users className="h-5 w-5 text-cyan-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{summary?.stats.eligibleMembers ?? 0}</p>
              <p className="text-sm text-muted-foreground">Membres eligibles</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Clock className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{summary?.stats.totalSelections ?? 0}</p>
              <p className="text-sm text-muted-foreground">Selections comptees</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Cycles par activite</h2>
          <span className="text-xs text-muted-foreground">
            Derniere mise a jour:{" "}
            {summary?.generatedAt
              ? new Date(summary.generatedAt).toLocaleString("fr-FR")
              : "-"}
          </span>
        </div>

        {(summary?.activities.length ?? 0) > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {(summary?.activities ?? []).map((item) => {
              const cycleProgress = item.activeCycle?.progressPercent ?? 0
              const isResetting = resettingActivityId === item.activity.id

              return (
                <Card key={item.activity.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{item.activity.name}</CardTitle>
                        <CardDescription>
                          Mode: {item.activity.selection_mode} - {item.cyclesCount} cycle(s)
                        </CardDescription>
                      </div>
                      <Badge variant={item.activeCycle ? "default" : "outline"}>
                        {item.activeCycle ? "Actif" : "Aucun cycle"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progression du cycle</span>
                        <span className="font-medium text-foreground">
                          {item.activeCycle?.countedSelectionCount ?? 0}/{summary?.stats.eligibleMembers ?? 0}
                        </span>
                      </div>
                      <Progress value={cycleProgress} className="h-2" />
                    </div>

                    {item.recentSelections.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">Dernieres selections</p>
                        <div className="flex flex-wrap gap-2">
                          {item.recentSelections.slice(0, 5).map((selection) => (
                            <div
                              key={selection.id}
                              className="flex items-center gap-2 rounded-lg border px-2 py-1"
                            >
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={selection.user?.photo_url ?? undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {selection.user
                                    ? `${selection.user.first_name[0]}${selection.user.last_name[0]}`
                                    : "U"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-foreground">
                                {selection.user?.first_name ?? "Inconnu"}
                              </span>
                              <CheckCircle className="h-3 w-3 text-emerald-700" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Aucune selection enregistree pour cette activite.
                      </p>
                    )}

                    <div className="flex gap-2">
                      <CycleDetailsDialog
                        activityId={item.activity.id}
                        activityName={item.activity.name}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => void handleResetCycle(item.activity.id)}
                        disabled={isResetting}
                      >
                        {isResetting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-2 h-4 w-4" />
                        )}
                        Reinitialiser
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Shuffle className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">Aucune activite eligible</p>
              <p className="text-xs text-muted-foreground">
                Active des activites en mode automatique ou semi-automatique pour demarrer.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tableau recapitulatif</CardTitle>
          <CardDescription>
            Nombre de selections comptees par membre et par activite.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto">
          {(summary?.members.length ?? 0) > 0 && (summary?.activities.length ?? 0) > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Membre</TableHead>
                  {(summary?.activities ?? []).map((item) => (
                    <TableHead key={item.activity.id} className="min-w-[120px] text-center">
                      {item.activity.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(summary?.members ?? []).map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={member.photo_url ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {member.first_name[0]}
                            {member.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground">
                          {member.first_name} {member.last_name}
                        </span>
                      </div>
                    </TableCell>
                    {(summary?.activities ?? []).map((item) => {
                      const count =
                        matrixByActivityByUser
                          .get(item.activity.id)
                          ?.get(member.id) ?? 0
                      return (
                        <TableCell key={`${item.activity.id}-${member.id}`} className="text-center">
                          {count > 0 ? (
                            <Badge variant="secondary">{count}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pas assez de donnees pour afficher le tableau.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
