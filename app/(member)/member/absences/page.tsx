"use client"

import { useState } from "react"
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  MessageSquare,
  Hourglass,
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
import { useAuth } from "@/lib/auth-context"
import { sessions, absenceRequests, appConfig } from "@/lib/mock-data"

export default function MemberAbsencesPage() {
  const { user } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState("")
  const [reason, setReason] = useState("")

  if (!user) return null

  // Get user absence requests
  const userAbsenceRequests = absenceRequests.filter((ar) => ar.user.id === user.id)
  const pendingCount = userAbsenceRequests.filter(ar => ar.status === "pending").length
  const approvedCount = userAbsenceRequests.filter(ar => ar.status === "approved").length
  const rejectedCount = userAbsenceRequests.filter(ar => ar.status === "rejected").length

  // Get sessions where user can request absence
  const upcomingSessions = sessions.filter(s => {
    if (s.status !== "upcoming") return false
    // Check if already has a request
    const hasRequest = userAbsenceRequests.some(ar => ar.sessionId === s.id)
    if (hasRequest) return false
    // Check minimum delay
    const sessionDate = new Date(s.date)
    const now = new Date()
    const hoursUntilSession = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntilSession >= appConfig.absenceMinDelayHours
  })

  const handleSubmitRequest = () => {
    // In real app, this would call an API
    console.log("Submitting absence request:", { sessionId: selectedSession, reason })
    setIsDialogOpen(false)
    setSelectedSession("")
    setReason("")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
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
          <p className="text-muted-foreground">
            Gerez vos demandes d&apos;absence aux seances
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={upcomingSessions.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle demande
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Demande d&apos;absence</DialogTitle>
              <DialogDescription>
                Soumettez une demande d&apos;absence pour une seance a venir.
                La demande doit etre faite au moins {appConfig.absenceMinDelayHours}h avant la seance.
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
                    {upcomingSessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {new Date(session.date).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })} - {session.startTime}
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
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmitRequest} disabled={!selectedSession}>
                Soumettre la demande
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Alert */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="flex items-start gap-4 pt-6">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Delai minimum requis
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Les demandes d&apos;absence doivent etre soumises au moins{" "}
              <strong>{appConfig.absenceMinDelayHours} heures</strong> avant le debut de la seance.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
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

      {/* Absence Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des demandes</CardTitle>
          <CardDescription>
            Toutes vos demandes d&apos;absence
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userAbsenceRequests.length === 0 ? (
            <div className="text-center py-12">
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
                {userAbsenceRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {new Date(request.session.date).toLocaleDateString("fr-FR", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.session.startTime} - {request.session.endTime}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(request.requestedAt).toLocaleDateString("fr-FR", {
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
                              <span className="text-sm truncate max-w-[150px] block cursor-help">
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
                        <span className="text-muted-foreground text-sm">Non specifiee</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell>
                      {request.adminComment ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 cursor-help">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Voir</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[300px]">
                              <p>{request.adminComment}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
