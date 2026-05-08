"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  MessageSquare,
  Filter,
  Eye,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import type { AbsenceRequestStatus } from "@/lib/types"

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
  user: {
    id: string
    first_name: string
    last_name: string
    pseudo: string
    photo_url: string | null
    english_level: "beginner" | "intermediate" | "advanced"
  } | null
  reviewer: {
    id: string
    first_name: string
    last_name: string
    pseudo: string
    photo_url: string | null
    english_level: "beginner" | "intermediate" | "advanced"
  } | null
  session: {
    id: string
    date: string
    start_time: string
    end_time: string
    status: "upcoming" | "ongoing" | "completed" | "cancelled"
  } | null
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

const statusConfig: Record<
  AbsenceRequestStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }
> = {
  pending: { label: "En attente", variant: "secondary", icon: Clock },
  approved: { label: "Approuvee", variant: "default", icon: CheckCircle },
  rejected: { label: "Refusee", variant: "destructive", icon: XCircle },
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T
}

function formatSessionLabel(session: ApiAbsenceRow["session"]) {
  if (!session) {
    return "Seance indisponible"
  }

  return `Seance du ${new Date(session.date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })}`
}

function AbsenceRequestCard({
  request,
  onReview,
  isUpdating,
}: {
  request: ApiAbsenceRow
  onReview: (id: string, status: "approved" | "rejected", adminComment: string) => Promise<void>
  isUpdating: boolean
}) {
  const [adminComment, setAdminComment] = useState(request.admin_comment || "")
  const config = statusConfig[request.status]
  const StatusIcon = config.icon

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={request.user?.photo_url ?? undefined} />
              <AvatarFallback>
                {(request.user?.first_name?.[0] ?? "U").toUpperCase()}
                {(request.user?.last_name?.[0] ?? "N").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">
                {request.user
                  ? `${request.user.first_name} ${request.user.last_name}`
                  : request.user_id}
              </CardTitle>
              <CardDescription>@{request.user?.pseudo ?? request.user_id}</CardDescription>
            </div>
          </div>
          <Badge variant={config.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{formatSessionLabel(request.session)}</span>
          </div>
          {request.session ? (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {request.session.start_time.slice(0, 5)} - {request.session.end_time.slice(0, 5)}
              </span>
            </div>
          ) : null}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Demande le {new Date(request.requested_at).toLocaleDateString("fr-FR")}
            </span>
          </div>
        </div>

        {request.reason ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Raison</p>
            <p className="text-sm text-muted-foreground">{request.reason}</p>
          </div>
        ) : null}

        {request.admin_comment ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Commentaire admin</p>
            <p className="text-sm text-muted-foreground">{request.admin_comment}</p>
          </div>
        ) : null}

        {request.status === "pending" ? (
          <div className="space-y-3 border-t border-border pt-2">
            <div className="space-y-2">
              <Label htmlFor={`comment-${request.id}`} className="text-sm">
                Commentaire (optionnel)
              </Label>
              <Textarea
                id={`comment-${request.id}`}
                placeholder="Ajouter un commentaire..."
                value={adminComment}
                onChange={(event) => setAdminComment(event.target.value)}
                rows={2}
                disabled={isUpdating}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-accent hover:bg-accent/90"
                disabled={isUpdating}
                onClick={() => onReview(request.id, "approved", adminComment)}
              >
                {isUpdating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Approuver
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={isUpdating}
                onClick={() => onReview(request.id, "rejected", adminComment)}
              >
                {isUpdating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Refuser
              </Button>
            </div>
          </div>
        ) : null}

        {request.reviewed_at ? (
          <p className="text-xs text-muted-foreground">
            Traite le {new Date(request.reviewed_at).toLocaleDateString("fr-FR")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function AbsenceRequestsTable({ requests }: { requests: ApiAbsenceRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Historique complet</CardTitle>
        <CardDescription>Toutes les demandes d&apos;absence</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membre</TableHead>
              <TableHead>Seance</TableHead>
              <TableHead>Raison</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Demande le</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Aucune demande pour ce filtre.
                </TableCell>
              </TableRow>
            ) : requests.map((request) => {
              const config = statusConfig[request.status]
              const StatusIcon = config.icon

              return (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={request.user?.photo_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {(request.user?.first_name?.[0] ?? "U").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">
                        {request.user
                          ? `${request.user.first_name} ${request.user.last_name}`
                          : request.user_id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {request.session
                        ? new Date(request.session.date).toLocaleDateString("fr-FR")
                        : "Seance indisponible"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="block max-w-[200px] truncate text-sm text-muted-foreground">
                      {request.reason || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.variant} className="gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(request.requested_at).toLocaleDateString("fr-FR")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Details de la demande</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={request.user?.photo_url ?? undefined} />
                              <AvatarFallback>
                                {(request.user?.first_name?.[0] ?? "U").toUpperCase()}
                                {(request.user?.last_name?.[0] ?? "N").toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">
                                {request.user
                                  ? `${request.user.first_name} ${request.user.last_name}`
                                  : request.user_id}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                @{request.user?.pseudo ?? request.user_id}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm">
                              <strong>Seance :</strong>{" "}
                              {request.session
                                ? new Date(request.session.date).toLocaleDateString("fr-FR", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                  })
                                : "Indisponible"}
                            </p>
                            <p className="text-sm">
                              <strong>Raison :</strong> {request.reason || "Non specifiee"}
                            </p>
                            <p className="text-sm">
                              <strong>Statut :</strong> <Badge variant={config.variant}>{config.label}</Badge>
                            </p>
                            {request.admin_comment ? (
                              <p className="text-sm">
                                <strong>Commentaire admin :</strong> {request.admin_comment}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default function AbsencesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [requests, setRequests] = useState<ApiAbsenceRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [updatingId, setUpdatingId] = useState<string>("")
  const [absenceMinDelayHours, setAbsenceMinDelayHours] = useState(24)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage("")

    try {
      const [absencesResponse, settingsResponse] = await Promise.all([
        fetch("/api/absences?limit=100&page=1", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
      ])

      const absencesPayload = await readJson<ApiListResponse<ApiAbsenceRow>>(absencesResponse)
      const settingsPayload = await readJson<ApiSettingsResponse>(settingsResponse)

      if (!absencesResponse.ok || !absencesPayload.success || !absencesPayload.data) {
        setRequests([])
        setErrorMessage(absencesPayload.error || "Impossible de charger les absences.")
        return
      }

      setRequests(absencesPayload.data)

      if (settingsResponse.ok && settingsPayload.success && settingsPayload.data) {
        setAbsenceMinDelayHours(settingsPayload.data.absenceMinDelayHours)
      }
    } catch {
      setRequests([])
      setErrorMessage("Impossible de contacter le serveur.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleReview = useCallback(
    async (id: string, status: "approved" | "rejected", adminComment: string) => {
      setUpdatingId(id)
      setErrorMessage("")

      try {
        const response = await fetch(`/api/absences/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, adminComment: adminComment.trim() || null }),
        })

        const payload = await readJson<ApiSingleResponse<ApiAbsenceRow>>(response)

        if (!response.ok || !payload.success || !payload.data) {
          setErrorMessage(payload.error || "Mise a jour impossible.")
          return
        }

        setRequests((prev) => prev.map((item) => (item.id === id ? payload.data! : item)))
      } catch {
        setErrorMessage("Impossible de contacter le serveur.")
      } finally {
        setUpdatingId("")
      }
    },
    []
  )

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests]
  )
  const approvedRequests = useMemo(
    () => requests.filter((request) => request.status === "approved"),
    [requests]
  )
  const rejectedRequests = useMemo(
    () => requests.filter((request) => request.status === "rejected"),
    [requests]
  )

  const filteredRequests = useMemo(
    () =>
      statusFilter === "all"
        ? requests
        : requests.filter((request) => request.status === statusFilter),
    [requests, statusFilter]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Demandes d&apos;absence</h1>
        <p className="text-muted-foreground">Gerez les demandes d&apos;absence des membres</p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{requests.length}</p>
              <p className="text-sm text-muted-foreground">Total demandes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-chart-4/10 p-2">
              <Clock className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingRequests.length}</p>
              <p className="text-sm text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-accent/10 p-2">
              <CheckCircle className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{approvedRequests.length}</p>
              <p className="text-sm text-muted-foreground">Approuvees</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-destructive/10 p-2">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{rejectedRequests.length}</p>
              <p className="text-sm text-muted-foreground">Refusees</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
          <div>
            <p className="font-medium text-foreground">Delai minimum configure</p>
            <p className="text-sm text-muted-foreground">
              Les membres doivent soumettre leur demande au moins{" "}
              <strong>{absenceMinDelayHours} heures</strong> avant la seance.
            </p>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des demandes...
          </CardContent>
        </Card>
      ) : (
        <>
          {pendingRequests.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Demandes en attente ({pendingRequests.length})
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingRequests.map((request) => (
                  <AbsenceRequestCard
                    key={request.id}
                    request={request}
                    onReview={handleReview}
                    isUpdating={updatingId === request.id}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="approved">Approuvees</SelectItem>
                    <SelectItem value="rejected">Refusees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <AbsenceRequestsTable requests={filteredRequests} />
        </>
      )}
    </div>
  )
}
