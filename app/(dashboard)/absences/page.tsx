"use client"

import { useState } from "react"
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  MessageSquare,
  Filter,
  Eye,
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
  DialogDescription,
  DialogFooter,
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
import { absenceRequests, sessions, appConfig } from "@/lib/mock-data"
import type { AbsenceRequestStatus } from "@/lib/types"

const statusConfig: Record<
  AbsenceRequestStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }
> = {
  pending: { label: "En attente", variant: "secondary", icon: Clock },
  approved: { label: "Approuvée", variant: "default", icon: CheckCircle },
  rejected: { label: "Refusée", variant: "destructive", icon: XCircle },
}

function AbsenceRequestCard({ request }: { request: typeof absenceRequests[0] }) {
  const [adminComment, setAdminComment] = useState(request.adminComment || "")
  const config = statusConfig[request.status]
  const StatusIcon = config.icon
  const sessionDate = new Date(request.session.date)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={request.user.photoUrl} />
              <AvatarFallback>
                {request.user.firstName[0]}
                {request.user.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">
                {request.user.firstName} {request.user.lastName}
              </CardTitle>
              <CardDescription>@{request.user.pseudo}</CardDescription>
            </div>
          </div>
          <Badge variant={config.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">
              Séance du {sessionDate.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Demandé le {new Date(request.requestedAt).toLocaleDateString("fr-FR")}
            </span>
          </div>
        </div>

        {request.reason && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Raison</p>
            <p className="text-sm text-muted-foreground">{request.reason}</p>
          </div>
        )}

        {request.adminComment && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Commentaire admin</p>
            <p className="text-sm text-muted-foreground">{request.adminComment}</p>
          </div>
        )}

        {request.status === "pending" && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="space-y-2">
              <Label htmlFor={`comment-${request.id}`} className="text-sm">
                Commentaire (optionnel)
              </Label>
              <Textarea
                id={`comment-${request.id}`}
                placeholder="Ajouter un commentaire..."
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-accent hover:bg-accent/90">
                <CheckCircle className="mr-2 h-4 w-4" />
                Approuver
              </Button>
              <Button variant="destructive" className="flex-1">
                <XCircle className="mr-2 h-4 w-4" />
                Refuser
              </Button>
            </div>
          </div>
        )}

        {request.reviewedAt && (
          <p className="text-xs text-muted-foreground">
            Traité le {new Date(request.reviewedAt).toLocaleDateString("fr-FR")}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function AbsenceRequestsTable() {
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
              <TableHead>Séance</TableHead>
              <TableHead>Raison</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Demandé le</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {absenceRequests.map((request) => {
              const config = statusConfig[request.status]
              const StatusIcon = config.icon

              return (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={request.user.photoUrl} />
                        <AvatarFallback className="text-xs">
                          {request.user.firstName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">
                        {request.user.firstName} {request.user.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(request.session.date).toLocaleDateString("fr-FR")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
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
                      {new Date(request.requestedAt).toLocaleDateString("fr-FR")}
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
                          <DialogTitle>Détails de la demande</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={request.user.photoUrl} />
                              <AvatarFallback>
                                {request.user.firstName[0]}
                                {request.user.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">
                                {request.user.firstName} {request.user.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                @{request.user.pseudo}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm">
                              <strong>Séance :</strong>{" "}
                              {new Date(request.session.date).toLocaleDateString("fr-FR", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                              })}
                            </p>
                            <p className="text-sm">
                              <strong>Raison :</strong> {request.reason || "Non spécifiée"}
                            </p>
                            <p className="text-sm">
                              <strong>Statut :</strong>{" "}
                              <Badge variant={config.variant}>{config.label}</Badge>
                            </p>
                            {request.adminComment && (
                              <p className="text-sm">
                                <strong>Commentaire admin :</strong> {request.adminComment}
                              </p>
                            )}
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

  const pendingRequests = absenceRequests.filter((r) => r.status === "pending")
  const approvedRequests = absenceRequests.filter((r) => r.status === "approved")
  const rejectedRequests = absenceRequests.filter((r) => r.status === "rejected")

  const filteredRequests =
    statusFilter === "all"
      ? absenceRequests
      : absenceRequests.filter((r) => r.status === statusFilter)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Demandes d&apos;absence</h1>
        <p className="text-muted-foreground">
          Gérez les demandes d&apos;absence des membres
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{absenceRequests.length}</p>
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
              <p className="text-sm text-muted-foreground">Approuvées</p>
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
              <p className="text-sm text-muted-foreground">Refusées</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Délai minimum configuré</p>
            <p className="text-sm text-muted-foreground">
              Les membres doivent soumettre leur demande au moins{" "}
              <strong>{appConfig.absenceMinDelayHours} heures</strong> avant la séance.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Demandes en attente ({pendingRequests.length})
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingRequests.map((request) => (
              <AbsenceRequestCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
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
                <SelectItem value="approved">Approuvées</SelectItem>
                <SelectItem value="rejected">Refusées</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* All Requests Table */}
      <AbsenceRequestsTable />
    </div>
  )
}
