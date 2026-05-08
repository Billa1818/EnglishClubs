"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  MessageSquare,
  Hourglass,
  Loader2,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { AbsenceRequestStatus } from "@/lib/types"

type ApiSessionRow = {
  id: string
  date: string
  start_time: string
  end_time: string
  status: "upcoming" | "ongoing" | "completed" | "cancelled"
}

type ApiAbsenceRow = {
  id: string
  session_id: string
  user_id: string
  reason: string | null
  status: AbsenceRequestStatus
  admin_comment: string | null
  requested_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  session: ApiSessionRow | null
}

type ApiListResponse<T> = {
  success?: boolean
  error?: string
  data?: T[]
}

type ApiSingleResponse<T> = {
  success?: boolean
  error?: string
  data?: T
}

type ApiSettingsResponse = {
  success?: boolean
  error?: string
  data?: {
    absenceMinDelayHours: number
  }
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T
}

function getSessionStartDate(session: ApiSessionRow) {
  const time = session.start_time.length >= 8 ? session.start_time.slice(0, 8) : `${session.start_time}:00`
  const parsed = new Date(`${session.date}T${time}`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

export default function MemberAbsencesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState("")
  const [reason, setReason] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [absenceMinDelayHours, setAbsenceMinDelayHours] = useState(24)
  const [requests, setRequests] = useState<ApiAbsenceRow[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<ApiSessionRow[]>([])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage("")

    try {
      const [requestsResponse, sessionsResponse, settingsResponse] = await Promise.all([
        fetch("/api/absences?limit=100&page=1", { cache: "no-store" }),
        fetch("/api/sessions?status=upcoming&limit=100&page=1", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
      ])

      const requestsPayload = await readJson<ApiListResponse<ApiAbsenceRow>>(requestsResponse)
      const sessionsPayload = await readJson<ApiListResponse<ApiSessionRow>>(sessionsResponse)
      const settingsPayload = await readJson<ApiSettingsResponse>(settingsResponse)

      if (!requestsResponse.ok || !requestsPayload.success || !requestsPayload.data) {
        setRequests([])
        setUpcomingSessions([])
        setErrorMessage(requestsPayload.error || "Impossible de charger les absences.")
        return
      }

      if (!sessionsResponse.ok || !sessionsPayload.success || !sessionsPayload.data) {
        setRequests(requestsPayload.data)
        setUpcomingSessions([])
        setErrorMessage(sessionsPayload.error || "Impossible de charger les seances.")
        return
      }

      setRequests(requestsPayload.data)
      setUpcomingSessions(sessionsPayload.data)

      if (settingsResponse.ok && settingsPayload.success && settingsPayload.data) {
        setAbsenceMinDelayHours(settingsPayload.data.absenceMinDelayHours)
      }
    } catch {
      setRequests([])
      setUpcomingSessions([])
      setErrorMessage("Impossible de contacter le serveur.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const availableSessions = useMemo(() => {
    const requestedSessionIds = new Set(requests.map((request) => request.session_id))
    const minDelayMs = absenceMinDelayHours * 60 * 60 * 1000
    const now = Date.now()

    return upcomingSessions.filter((session) => {
      if (requestedSessionIds.has(session.id)) {
        return false
      }

      const startAt = getSessionStartDate(session)
      if (!startAt) {
        return false
      }

      return startAt.getTime() - now >= minDelayMs
    })
  }, [requests, upcomingSessions, absenceMinDelayHours])

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === "pending").length,
    [requests]
  )
  const approvedCount = useMemo(
    () => requests.filter((request) => request.status === "approved").length,
    [requests]
  )
  const rejectedCount = useMemo(
    () => requests.filter((request) => request.status === "rejected").length,
    [requests]
  )

  const handleSubmitRequest = useCallback(async () => {
    if (!selectedSession) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage("")

    try {
      const response = await fetch("/api/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSession,
          reason: reason.trim() || undefined,
        }),
      })

      const payload = await readJson<ApiSingleResponse<ApiAbsenceRow>>(response)

      if (!response.ok || !payload.success || !payload.data) {
        setErrorMessage(payload.error || "Soumission impossible.")
        return
      }

      setIsDialogOpen(false)
      setSelectedSession("")
      setReason("")
      await loadData()
    } catch {
      setErrorMessage("Impossible de contacter le serveur.")
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedSession, reason, loadData])

  const getStatusBadge = (status: AbsenceRequestStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-600">
            <Hourglass className="mr-1 h-3 w-3" />
            En attente
          </Badge>
        )
      case "approved":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Approuvee
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Refusee
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mes Absences</h1>
          <p className="text-muted-foreground">Gerez vos demandes d&apos;absence aux seances</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={availableSessions.length === 0 || isLoading}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle demande
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Demande d&apos;absence</DialogTitle>
              <DialogDescription>
                Soumettez une demande d&apos;absence pour une seance a venir. La demande doit etre faite au
                moins {absenceMinDelayHours}h avant la seance.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="session">Seance concernee</Label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionnez une seance" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {new Date(session.date).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}{" "}
                        - {session.start_time.slice(0, 5)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Raison (optionnel)</Label>
                <Textarea
                  id="reason"
                  placeholder="Expliquez la raison de votre absence..."
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmitRequest} disabled={!selectedSession || isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Soumettre la demande
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="flex items-start gap-4 pt-6">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Delai minimum requis</p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Les demandes d&apos;absence doivent etre soumises au moins <strong>{absenceMinDelayHours} heures</strong>{" "}
              avant le debut de la seance.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Hourglass className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              demande{pendingCount !== 1 ? "s" : ""} en cours d&apos;examen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approuvees</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">
              demande{approvedCount !== 1 ? "s" : ""} acceptee{approvedCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Refusees</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground">
              demande{rejectedCount !== 1 ? "s" : ""} refusee{rejectedCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des demandes</CardTitle>
          <CardDescription>Toutes vos demandes d&apos;absence</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des demandes...
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">
                Vous n&apos;avez pas encore fait de demande d&apos;absence.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seance</TableHead>
                  <TableHead>Date de demande</TableHead>
                  <TableHead>Raison</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Commentaire admin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {request.session
                              ? new Date(request.session.date).toLocaleDateString("fr-FR", {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                })
                              : "Seance indisponible"}
                          </p>
                          {request.session ? (
                            <p className="text-xs text-muted-foreground">
                              {request.session.start_time.slice(0, 5)} - {request.session.end_time.slice(0, 5)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(request.requested_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      {request.reason ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block max-w-[150px] cursor-help truncate text-sm">
                                {request.reason.substring(0, 30)}
                                {request.reason.length > 30 ? "..." : ""}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[300px]">
                              <p>{request.reason}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-sm text-muted-foreground">Non specifiee</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {request.admin_comment ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex cursor-help items-center gap-1">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Voir</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[300px]">
                              <p>{request.admin_comment}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!isLoading && availableSessions.length === 0 && upcomingSessions.length > 0 ? (
        <Card>
          <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
            <Clock className="mt-0.5 h-4 w-4" />
            Toutes les seances a venir sont deja demandees ou trop proches du debut selon le delai minimum.
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
