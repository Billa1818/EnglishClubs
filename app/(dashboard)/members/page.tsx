"use client"

import { useState } from "react"
import {
  Users,
  Search,
  Plus,
  MoreHorizontal,
  Mail,
  Link2,
  UserCheck,
  UserX,
  UserMinus,
  Clock,
  Shield,
  Copy,
  Check,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { members, invitations } from "@/lib/mock-data"
import type { MemberStatus } from "@/lib/types"

const statusConfig: Record<MemberStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Actif", variant: "default" },
  pending: { label: "En attente", variant: "secondary" },
  suspended: { label: "Suspendu", variant: "destructive" },
  removed: { label: "Retiré", variant: "outline" },
}

const levelConfig = {
  beginner: { label: "Débutant", color: "bg-chart-2/20 text-chart-2" },
  intermediate: { label: "Intermédiaire", color: "bg-chart-1/20 text-chart-1" },
  advanced: { label: "Avancé", color: "bg-chart-3/20 text-chart-3" },
}

function InviteDialog() {
  const [inviteType, setInviteType] = useState<"link" | "email">("link")
  const [copied, setCopied] = useState(false)
  const inviteLink = "https://englishclub.com/invite/abc123def456"

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Inviter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter un nouveau membre</DialogTitle>
          <DialogDescription>
            Choisissez comment inviter un nouveau membre à rejoindre la communauté.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={inviteType} onValueChange={(v) => setInviteType(v as "link" | "email")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">
              <Link2 className="mr-2 h-4 w-4" />
              Lien
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="mr-2 h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Label>Lien d&apos;invitation</Label>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ce lien expire dans 7 jours. Partagez-le avec la personne à inviter.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input id="email" type="email" placeholder="nouveau.membre@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message personnalisé (optionnel)</Label>
              <Input id="message" placeholder="Bienvenue dans notre communauté !" />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="submit" className="w-full">
            {inviteType === "link" ? "Générer un nouveau lien" : "Envoyer l'invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MemberRow({ member }: { member: typeof members[0] }) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={member.user.photoUrl} />
            <AvatarFallback>
              {member.user.firstName[0]}
              {member.user.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">
              {member.user.firstName} {member.user.lastName}
            </p>
            <p className="text-sm text-muted-foreground">@{member.user.pseudo}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <span className="text-sm text-muted-foreground">{member.user.email}</span>
      </TableCell>
      <TableCell>
        <Badge variant={statusConfig[member.status].variant}>
          {statusConfig[member.status].label}
        </Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${levelConfig[member.user.englishLevel].color}`}
        >
          {levelConfig[member.user.englishLevel].label}
        </span>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <UserCheck className="h-3.5 w-3.5 text-accent" />
            {member.presenceCount}
          </span>
          <span className="flex items-center gap-1">
            <UserX className="h-3.5 w-3.5 text-destructive" />
            {member.absenceCount}
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <span className="text-sm text-muted-foreground">
          {new Date(member.joinedAt).toLocaleDateString("fr-FR")}
        </span>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <UserCheck className="mr-2 h-4 w-4" />
              Voir le profil
            </DropdownMenuItem>
            {member.status === "pending" && (
              <>
                <DropdownMenuItem className="text-accent">
                  <UserCheck className="mr-2 h-4 w-4" />
                  Approuver
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <UserX className="mr-2 h-4 w-4" />
                  Refuser
                </DropdownMenuItem>
              </>
            )}
            {member.status === "active" && (
              <DropdownMenuItem className="text-destructive">
                <UserMinus className="mr-2 h-4 w-4" />
                Suspendre
              </DropdownMenuItem>
            )}
            {member.status === "suspended" && (
              <DropdownMenuItem className="text-accent">
                <UserCheck className="mr-2 h-4 w-4" />
                Réactiver
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {member.user.role !== "admin" && (
              <DropdownMenuItem>
                <Shield className="mr-2 h-4 w-4" />
                Promouvoir admin
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

function InvitationsTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Invitations</CardTitle>
        <CardDescription>Liens et invitations en cours</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Détails</TableHead>
              <TableHead>Expire le</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => {
              const isExpired = new Date(invitation.expiresAt) < new Date()
              const isUsed = !!invitation.usedAt

              return (
                <TableRow key={invitation.id}>
                  <TableCell>
                    {invitation.email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">Email</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">Lien</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground font-mono">
                      {invitation.email || invitation.token.slice(0, 12) + "..."}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(invitation.expiresAt).toLocaleDateString("fr-FR")}
                    </span>
                  </TableCell>
                  <TableCell>
                    {isUsed ? (
                      <Badge variant="secondary">Utilisé</Badge>
                    ) : isExpired ? (
                      <Badge variant="destructive">Expiré</Badge>
                    ) : (
                      <Badge variant="default">Actif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!isUsed && !isExpired && (
                          <>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              Copier le lien
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <UserX className="mr-2 h-4 w-4" />
                              Révoquer
                            </DropdownMenuItem>
                          </>
                        )}
                        {(isUsed || isExpired) && (
                          <DropdownMenuItem className="text-destructive">
                            <UserX className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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

export default function MembersPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.user.firstName.toLowerCase().includes(search.toLowerCase()) ||
      member.user.lastName.toLowerCase().includes(search.toLowerCase()) ||
      member.user.email.toLowerCase().includes(search.toLowerCase()) ||
      member.user.pseudo.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === "all" || member.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: members.length,
    active: members.filter((m) => m.status === "active").length,
    pending: members.filter((m) => m.status === "pending").length,
    suspended: members.filter((m) => m.status === "suspended").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Membres</h1>
          <p className="text-muted-foreground">Gérez les membres de votre communauté</p>
        </div>
        <InviteDialog />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-accent/10 p-2">
              <UserCheck className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-chart-4/10 p-2">
              <Clock className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-destructive/10 p-2">
              <UserMinus className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.suspended}</p>
              <p className="text-sm text-muted-foreground">Suspendus</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Membres</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un membre..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="active">Actifs</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="suspended">Suspendus</SelectItem>
                    <SelectItem value="removed">Retirés</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Members Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membre</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="hidden lg:table-cell">Niveau</TableHead>
                    <TableHead className="hidden lg:table-cell">Présences</TableHead>
                    <TableHead className="hidden md:table-cell">Inscrit le</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <MemberRow key={member.id} member={member} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <InvitationsTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
