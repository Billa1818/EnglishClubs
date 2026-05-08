"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
  Loader2,
  Trash2,
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

type MemberStatus = "pending" | "active" | "suspended" | "removed"
type MemberRole = "admin" | "member"
type EnglishLevel = "beginner" | "intermediate" | "advanced"

type ApiProfile = {
  id: string
  first_name: string
  last_name: string
  pseudo: string
  photo_url: string | null
  english_level: EnglishLevel
}

type ApiMemberRow = {
  id: string
  user_id: string
  status: MemberStatus
  role: MemberRole
  joined_at: string
  created_at: string
  updated_at: string
  profile: ApiProfile | ApiProfile[] | null
}

type MemberView = Omit<ApiMemberRow, "profile"> & {
  profile: ApiProfile | null
}

type ApiInvitation = {
  id: string
  token: string
  type: "link" | "email"
  email: string | null
  expires_at: string
  used_at: string | null
  created_by: string
  used_by: string | null
  created_at: string
  updated_at: string
  used_profile?:
    | {
        id: string
        first_name: string
        last_name: string
        pseudo: string
      }
    | {
        id: string
        first_name: string
        last_name: string
        pseudo: string
      }[]
    | null
  invite_url?: string
}

type MembersPagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

const statusConfig: Record<
  MemberStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  active: { label: "Actif", variant: "default" },
  pending: { label: "En attente", variant: "secondary" },
  suspended: { label: "Suspendu", variant: "destructive" },
  removed: { label: "Retire", variant: "outline" },
}

const levelConfig: Record<EnglishLevel, { label: string; color: string }> = {
  beginner: { label: "Debutant", color: "bg-chart-2/20 text-chart-2" },
  intermediate: { label: "Intermediaire", color: "bg-chart-1/20 text-chart-1" },
  advanced: { label: "Avance", color: "bg-chart-3/20 text-chart-3" },
}

type InviteDialogProps = {
  onCreateInvitation: (payload: {
    type: "link" | "email"
    email?: string
    expiresInDays: number
  }) => Promise<{
    ok: boolean
    error?: string
    invitation?: ApiInvitation
  }>
}

function normalizeMember(row: ApiMemberRow): MemberView {
  const profile = Array.isArray(row.profile) ? (row.profile[0] ?? null) : row.profile
  return {
    ...row,
    profile: profile ?? null,
  }
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T
}

function logTechnicalError(scope: string, technicalMessage?: string) {
  if (!technicalMessage) {
    return
  }
  console.debug(`[${scope}]`, technicalMessage)
}

function InviteDialog({ onCreateInvitation }: InviteDialogProps) {
  const [open, setOpen] = useState(false)
  const [inviteType, setInviteType] = useState<"link" | "email">("link")
  const [email, setEmail] = useState("")
  const [expiresInDays, setExpiresInDays] = useState("7")
  const [createdLink, setCreatedLink] = useState("")
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const handleCopy = async () => {
    if (!createdLink) {
      return
    }
    await navigator.clipboard.writeText(createdLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreate = async () => {
    setErrorMessage("")
    setSuccessMessage("")
    setCreatedLink("")

    const parsedDays = Number.parseInt(expiresInDays, 10)
    if (!Number.isFinite(parsedDays) || parsedDays < 1 || parsedDays > 30) {
      setErrorMessage("Le delai doit etre compris entre 1 et 30 jours.")
      return
    }

    if (inviteType === "email" && !email.trim()) {
      setErrorMessage("L'email est obligatoire pour une invitation email.")
      return
    }

    setIsSubmitting(true)

    const result = await onCreateInvitation({
      type: inviteType,
      email: inviteType === "email" ? email.trim() : undefined,
      expiresInDays: parsedDays,
    })

    setIsSubmitting(false)

    if (!result.ok) {
      setErrorMessage(result.error || "Creation impossible.")
      return
    }

    if (inviteType === "link") {
      const generatedLink = result.invitation?.invite_url || ""
      setCreatedLink(generatedLink)
      setSuccessMessage(
        generatedLink
          ? "Lien d'invitation genere avec succes."
          : "Invitation creee avec succes."
      )
    } else {
      setSuccessMessage("Invitation email envoyee avec succes.")
    }
    setEmail("")
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setErrorMessage("")
          setSuccessMessage("")
          setCreatedLink("")
          setCopied(false)
        }
      }}
    >
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
            Cree une invitation par lien public ou reservee a un email.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={inviteType}
          onValueChange={(v) => {
            const nextType = v as "link" | "email"
            setInviteType(nextType)
            setErrorMessage("")
            setSuccessMessage("")
            if (nextType === "email") {
              setCreatedLink("")
              setCopied(false)
            }
          }}
        >
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
            <p className="text-sm text-muted-foreground">
              Le lien peut etre partage directement.
            </p>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Adresse email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="membre@email.com"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label htmlFor="expires-days">Expiration (jours)</Label>
          <Input
            id="expires-days"
            type="number"
            min={1}
            max={30}
            value={expiresInDays}
            onChange={(event) => setExpiresInDays(event.target.value)}
          />
        </div>

        {inviteType === "link" && createdLink && (
          <div className="space-y-2">
            <Label>Lien genere</Label>
            <div className="flex gap-2">
              <Input value={createdLink} readOnly className="font-mono text-sm" />
              <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
        {successMessage && (
          <p className="text-sm text-accent">{successMessage}</p>
        )}

        <DialogFooter>
          <Button type="button" className="w-full" onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creation...
              </>
            ) : inviteType === "link" ? (
              "Generer un lien"
            ) : (
              "Creer l'invitation email"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type MemberRowProps = {
  member: MemberView
  isPending: boolean
  onUpdateStatus: (memberId: string, status: MemberStatus) => Promise<void>
  onUpdateRole: (memberId: string, role: MemberRole) => Promise<void>
  onRemove: (memberId: string) => Promise<void>
}

function MemberRow({
  member,
  isPending,
  onUpdateStatus,
  onUpdateRole,
  onRemove,
}: MemberRowProps) {
  const profile = member.profile
  const firstName = profile?.first_name || "Membre"
  const lastName = profile?.last_name || ""
  const pseudo = profile?.pseudo || `member-${member.user_id.slice(0, 8)}`
  const englishLevel = profile?.english_level || "beginner"

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.photo_url ?? undefined} />
            <AvatarFallback>
              {firstName[0] || "M"}
              {lastName[0] || ""}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">
              {firstName} {lastName}
            </p>
            <p className="text-sm text-muted-foreground">@{pseudo}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <span className="text-xs text-muted-foreground font-mono">
          {member.user_id.slice(0, 8)}...
        </span>
      </TableCell>
      <TableCell>
        <Badge variant={statusConfig[member.status].variant}>
          {statusConfig[member.status].label}
        </Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${levelConfig[englishLevel].color}`}
        >
          {levelConfig[englishLevel].label}
        </span>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <Badge variant={member.role === "admin" ? "default" : "secondary"}>
          {member.role === "admin" ? "Admin" : "Membre"}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <span className="text-sm text-muted-foreground">
          {new Date(member.joined_at).toLocaleDateString("fr-FR")}
        </span>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={isPending}>
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {member.status === "pending" && (
              <>
                <DropdownMenuItem
                  className="text-accent"
                  onClick={() => void onUpdateStatus(member.id, "active")}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Approuver
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => void onUpdateStatus(member.id, "removed")}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Refuser
                </DropdownMenuItem>
              </>
            )}

            {member.status === "active" && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => void onUpdateStatus(member.id, "suspended")}
              >
                <UserMinus className="mr-2 h-4 w-4" />
                Suspendre
              </DropdownMenuItem>
            )}

            {(member.status === "suspended" || member.status === "removed") && (
              <DropdownMenuItem
                className="text-accent"
                onClick={() => void onUpdateStatus(member.id, "active")}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Reactiver
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {member.role === "member" ? (
              <DropdownMenuItem onClick={() => void onUpdateRole(member.id, "admin")}>
                <Shield className="mr-2 h-4 w-4" />
                Promouvoir admin
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => void onUpdateRole(member.id, "member")}
              >
                <Shield className="mr-2 h-4 w-4" />
                Retirer role admin
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="text-destructive"
              onClick={() => void onRemove(member.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Retirer du groupe
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

type InvitationsTableProps = {
  invitations: ApiInvitation[]
  isLoading: boolean
  actionId: string | null
  onRevoke: (invitationId: string) => Promise<void>
}

function InvitationsTable({
  invitations,
  isLoading,
  actionId,
  onRevoke,
}: InvitationsTableProps) {
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
              <TableHead>Details</TableHead>
              <TableHead>Expire le</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement des invitations...
                  </div>
                </TableCell>
              </TableRow>
            ) : invitations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Aucune invitation pour le moment.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              invitations.map((invitation) => {
                const isExpired = new Date(invitation.expires_at) < new Date()
                const isUsed = !!invitation.used_at
                const usedProfile = Array.isArray(invitation.used_profile)
                  ? invitation.used_profile[0] ?? null
                  : invitation.used_profile ?? null
                const detailsValue =
                  invitation.type === "email"
                    ? invitation.email || "-"
                    : invitation.invite_url || invitation.token
                const usedByDisplay =
                  usedProfile?.pseudo ||
                  [usedProfile?.first_name, usedProfile?.last_name]
                    .filter(Boolean)
                    .join(" ")
                return (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      {invitation.type === "email" ? (
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
                      <div className="space-y-1">
                        <span
                          className={`text-sm text-muted-foreground ${
                            invitation.type === "email" ? "" : "font-mono"
                          }`}
                        >
                          {detailsValue.length > 36
                            ? `${detailsValue.slice(0, 36)}...`
                            : detailsValue}
                        </span>
                        {isUsed && usedByDisplay && (
                          <p className="text-xs text-muted-foreground">
                            Utilise par {usedByDisplay}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(invitation.expires_at).toLocaleDateString("fr-FR")}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isUsed ? (
                        <Badge variant="secondary">Utilise</Badge>
                      ) : isExpired ? (
                        <Badge variant="destructive">Expire</Badge>
                      ) : (
                        <Badge variant="default">Actif</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actionId === invitation.id}
                          >
                            {actionId === invitation.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              void navigator.clipboard.writeText(
                                invitation.invite_url || invitation.token
                              )
                            }
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copier le lien
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => void onRevoke(invitation.id)}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Revoquer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default function MembersPage() {
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | MemberStatus>("all")
  const [pageSize, setPageSize] = useState<20 | 50 | 100>(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState("members")

  const [members, setMembers] = useState<MemberView[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [memberActionId, setMemberActionId] = useState<string | null>(null)
  const [membersPagination, setMembersPagination] = useState<MembersPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  })

  const [invitations, setInvitations] = useState<ApiInvitation[]>([])
  const [invitationsLoading, setInvitationsLoading] = useState(true)
  const [invitationActionId, setInvitationActionId] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true)
    try {
      const queryParams = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
      })

      if (statusFilter !== "all") {
        queryParams.set("status", statusFilter)
      }

      if (searchQuery) {
        queryParams.set("search", searchQuery)
      }

      const response = await fetch(`/api/members?${queryParams.toString()}`)
      const payload = await readJson<{
        success?: boolean
        error?: string
        data?: ApiMemberRow[]
        pagination?: MembersPagination
      }>(response)

      if (!response.ok || !payload.success) {
        logTechnicalError("members:load", payload.error)
        setMembers([])
        setMembersPagination((previous) => ({
          ...previous,
          total: 0,
          totalPages: 1,
        }))
        setMembersLoading(false)
        return
      }

      setMembers((payload.data ?? []).map(normalizeMember))

      if (payload.pagination) {
        setMembersPagination(payload.pagination)
        if (payload.pagination.totalPages > 0 && currentPage > payload.pagination.totalPages) {
          setCurrentPage(payload.pagination.totalPages)
          return
        }
      }

      setMembersLoading(false)
    } catch {
      setMembers([])
      setMembersPagination((previous) => ({
        ...previous,
        total: 0,
        totalPages: 1,
      }))
      setMembersLoading(false)
    }
  }, [currentPage, pageSize, searchQuery, statusFilter])

  const fetchInvitations = useCallback(async () => {
    setInvitationsLoading(true)
    try {
      const response = await fetch("/api/invitations")
      const payload = await readJson<{
        success?: boolean
        error?: string
        data?: ApiInvitation[]
      }>(response)

      if (!response.ok || !payload.success) {
        logTechnicalError("invitations:load", payload.error)
        setInvitations([])
        setInvitationsLoading(false)
        return
      }

      setInvitations(payload.data ?? [])
      setInvitationsLoading(false)
    } catch {
      setInvitations([])
      setInvitationsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim())
    }, 350)

    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, pageSize, searchQuery])

  useEffect(() => {
    void fetchMembers()
  }, [fetchMembers])

  useEffect(() => {
    void fetchInvitations()
  }, [fetchInvitations])

  const stats = useMemo(
    () => ({
      total: membersPagination.total,
      active: members.filter((m) => m.status === "active").length,
      pending: members.filter((m) => m.status === "pending").length,
      suspended: members.filter((m) => m.status === "suspended").length,
    }),
    [members, membersPagination.total]
  )

  const updateMember = useCallback(
    async (memberId: string, patch: { status?: MemberStatus; role?: MemberRole }) => {
      setMemberActionId(memberId)
      try {
        const response = await fetch(`/api/members/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })

        const payload = await readJson<{ success?: boolean; error?: string }>(response)

        if (!response.ok || !payload.success) {
          logTechnicalError("members:update", payload.error)
          setMemberActionId(null)
          return
        }

        await fetchMembers()
        setMemberActionId(null)
      } catch {
        setMemberActionId(null)
      }
    },
    [fetchMembers]
  )

  const removeMember = useCallback(
    async (memberId: string) => {
      setMemberActionId(memberId)
      try {
        const response = await fetch(`/api/members/${memberId}`, {
          method: "DELETE",
        })

        const payload = await readJson<{ success?: boolean; error?: string }>(response)

        if (!response.ok || !payload.success) {
          logTechnicalError("members:remove", payload.error)
          setMemberActionId(null)
          return
        }

        await fetchMembers()
        setMemberActionId(null)
      } catch {
        setMemberActionId(null)
      }
    },
    [fetchMembers]
  )

  const createInvitation = useCallback(
    async (payload: { type: "link" | "email"; email?: string; expiresInDays: number }) => {
      try {
        const response = await fetch("/api/invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const json = await readJson<{
          success?: boolean
          error?: string
          data?: ApiInvitation
        }>(response)

        if (!response.ok || !json.success || !json.data) {
          logTechnicalError("invitations:create", json.error)
          return {
            ok: false as const,
            error: json.error || "Creation d'invitation impossible pour le moment.",
          }
        }

        setInvitations((previous) => [json.data!, ...previous])
        return { ok: true as const, invitation: json.data }
      } catch {
        return {
          ok: false as const,
          error: "Impossible de joindre le serveur pour creer l'invitation.",
        }
      }
    },
    []
  )

  const revokeInvitation = useCallback(async (invitationId: string) => {
    setInvitationActionId(invitationId)
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "DELETE",
      })

      const payload = await readJson<{ success?: boolean; error?: string }>(response)

      if (!response.ok || !payload.success) {
        logTechnicalError("invitations:revoke", payload.error)
        setInvitationActionId(null)
        return
      }

      setInvitations((previous) => previous.filter((item) => item.id !== invitationId))
      setInvitationActionId(null)
    } catch {
      setInvitationActionId(null)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Membres</h1>
          <p className="text-muted-foreground">Gerez les membres de votre communaute</p>
        </div>
        <InviteDialog onCreateInvitation={createInvitation} />
      </div>

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
              <p className="text-sm text-muted-foreground">Actifs (page)</p>
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
              <p className="text-sm text-muted-foreground">En attente (page)</p>
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
              <p className="text-sm text-muted-foreground">Suspendus (page)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="members">Membres</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un membre..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as "all" | MemberStatus)}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="active">Actifs</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="suspended">Suspendus</SelectItem>
                    <SelectItem value="removed">Retires</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => setPageSize(Number(value) as 20 | 50 | 100)}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Par page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membre</TableHead>
                    <TableHead className="hidden md:table-cell">ID</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="hidden lg:table-cell">Niveau</TableHead>
                    <TableHead className="hidden lg:table-cell">Role</TableHead>
                    <TableHead className="hidden md:table-cell">Inscrit le</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membersLoading ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Chargement des membres...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <p className="py-6 text-center text-sm text-muted-foreground">
                          Aucun membre ne correspond aux filtres.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        isPending={memberActionId === member.id}
                        onUpdateStatus={async (memberId, status) => {
                          await updateMember(memberId, { status })
                        }}
                        onUpdateRole={async (memberId, role) => {
                          await updateMember(memberId, { role })
                        }}
                        onRemove={removeMember}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {membersPagination.page} / {membersPagination.totalPages} -{" "}
                  {membersPagination.total} membre{membersPagination.total > 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={membersLoading || membersPagination.page <= 1}
                    onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
                  >
                    Precedent
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      membersLoading ||
                      membersPagination.page >= membersPagination.totalPages
                    }
                    onClick={() =>
                      setCurrentPage((previous) =>
                        Math.min(membersPagination.totalPages, previous + 1)
                      )
                    }
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <InvitationsTable
            invitations={invitations}
            isLoading={invitationsLoading}
            actionId={invitationActionId}
            onRevoke={revokeInvitation}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
