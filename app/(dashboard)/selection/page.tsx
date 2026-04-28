"use client"

import { useState } from "react"
import {
  Shuffle,
  Users,
  RotateCcw,
  ChevronRight,
  CheckCircle,
  Clock,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { activities, activitySelectionCycles, members, users } from "@/lib/mock-data"

function CycleCard({ cycle }: { cycle: typeof activitySelectionCycles[0] }) {
  const activeMembers = members.filter((m) => m.status === "active")
  const selectedCount = cycle.selections.length
  const totalMembers = activeMembers.length
  const progress = (selectedCount / totalMembers) * 100

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{cycle.activity.name}</CardTitle>
            <CardDescription>
              Cycle démarré le {new Date(cycle.startedAt).toLocaleDateString("fr-FR")}
            </CardDescription>
          </div>
          <Badge variant={progress >= 100 ? "secondary" : "default"}>
            {progress >= 100 ? "Cycle complet" : "En cours"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progression du cycle</span>
            <span className="font-medium text-foreground">
              {selectedCount}/{totalMembers} membres
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {cycle.selections.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Dernières sélections</p>
            <div className="flex flex-wrap gap-2">
              {cycle.selections.slice(-3).map((selection) => (
                <div
                  key={selection.id}
                  className="flex items-center gap-2 rounded-lg border border-border px-2 py-1"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={selection.user.photoUrl} />
                    <AvatarFallback className="text-[10px]">
                      {selection.user.firstName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-foreground">{selection.user.firstName}</span>
                  <CheckCircle className="h-3 w-3 text-accent" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                Voir le cycle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Cycle de sélection - {cycle.activity.name}</DialogTitle>
                <DialogDescription>
                  Historique des sélections pour cette activité
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membre</TableHead>
                      <TableHead>Séance</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cycle.selections.map((selection) => (
                      <TableRow key={selection.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={selection.user.photoUrl} />
                              <AvatarFallback className="text-xs">
                                {selection.user.firstName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-foreground">
                              {selection.user.firstName} {selection.user.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            #{selection.sessionId}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(selection.selectedAt).toLocaleDateString("fr-FR")}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DialogFooter>
                <Button variant="outline">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Réinitialiser le cycle
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button size="sm" className="flex-1">
            <Shuffle className="mr-2 h-4 w-4" />
            Sélectionner
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function MemberSelectionTable() {
  const activeMembers = members.filter((m) => m.status === "active")
  const autoActivities = activities.filter(
    (a) => !a.isArchived && (a.selectionMode === "automatic" || a.selectionMode === "semi-automatic")
  )

  // Get selection count per member per activity
  const getSelectionCount = (userId: string, activityId: string) => {
    const cycle = activitySelectionCycles.find((c) => c.activityId === activityId)
    if (!cycle) return 0
    return cycle.selections.filter((s) => s.userId === userId).length
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tableau récapitulatif</CardTitle>
        <CardDescription>Sélections par membre et par activité</CardDescription>
      </CardHeader>
      <CardContent className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Membre</TableHead>
              {autoActivities.map((activity) => (
                <TableHead key={activity.id} className="text-center min-w-[100px]">
                  {activity.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={member.user.photoUrl} />
                      <AvatarFallback className="text-xs">
                        {member.user.firstName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">
                      {member.user.firstName}
                    </span>
                  </div>
                </TableCell>
                {autoActivities.map((activity) => {
                  const count = getSelectionCount(member.user.id, activity.id)
                  return (
                    <TableCell key={activity.id} className="text-center">
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
      </CardContent>
    </Card>
  )
}

export default function SelectionPage() {
  const autoActivities = activities.filter(
    (a) => !a.isArchived && (a.selectionMode === "automatic" || a.selectionMode === "semi-automatic")
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sélection équitable</h1>
        <p className="text-muted-foreground">
          Système de rotation garantissant une répartition équitable des responsabilités
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Shuffle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{autoActivities.length}</p>
              <p className="text-sm text-muted-foreground">Activités avec sélection</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-accent/10 p-2">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {members.filter((m) => m.status === "active").length}
              </p>
              <p className="text-sm text-muted-foreground">Membres éligibles</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-chart-3/10 p-2">
              <RotateCcw className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activitySelectionCycles.length}</p>
              <p className="text-sm text-muted-foreground">Cycles actifs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comment ça fonctionne ?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                1
              </div>
              <div>
                <p className="font-medium text-foreground">File de sélection</p>
                <p className="text-sm text-muted-foreground">
                  Tous les membres actifs sont dans une file par activité
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                2
              </div>
              <div>
                <p className="font-medium text-foreground">Sélection automatique</p>
                <p className="text-sm text-muted-foreground">
                  Le système sélectionne les membres n&apos;ayant pas encore participé
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                3
              </div>
              <div>
                <p className="font-medium text-foreground">Nouveau cycle</p>
                <p className="text-sm text-muted-foreground">
                  Quand tous ont participé, un nouveau cycle commence
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cycles */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Cycles de sélection</h2>
        {activitySelectionCycles.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {activitySelectionCycles.map((cycle) => (
              <CycleCard key={cycle.id} cycle={cycle} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shuffle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm font-medium text-foreground">Aucun cycle actif</p>
              <p className="text-xs text-muted-foreground">
                Les cycles seront créés lors de la première sélection
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary Table */}
      <MemberSelectionTable />
    </div>
  )
}
