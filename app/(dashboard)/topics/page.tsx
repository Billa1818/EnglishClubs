"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  MessageSquare,
  Plus,
  Search,
  MoreHorizontal,
  BookOpen,
  Archive,
  Edit,
  RotateCcw,
  TrendingUp,
  Filter,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { EnglishLevel } from "@/lib/types"

type ApiTopicRow = {
  id: string
  activity_id: string | null
  title: string
  description: string
  level: EnglishLevel
  is_archived: boolean
  usage_count: number
  activity?: {
    id: string
    name: string
    name_en: string
    requires_topic: boolean
    is_archived: boolean
  } | null
}

type ApiTopicsListResponse = {
  success?: boolean
  error?: string
  data?: ApiTopicRow[]
}

type ApiTopicMutationResponse = {
  success?: boolean
  error?: string
  data?: ApiTopicRow
}

type ApiTopicArchiveResponse = {
  success?: boolean
  error?: string
  data?: {
    id: string
    is_archived: boolean
    updated_at: string
  }
}

type ApiActivityRow = {
  id: string
  name: string
  requires_topic: boolean
  is_archived: boolean
}

type ApiActivitiesListResponse = {
  success?: boolean
  error?: string
  data?: ApiActivityRow[]
}

type TopicView = {
  id: string
  activityId?: string
  title: string
  description: string
  level: EnglishLevel
  isArchived: boolean
  usageCount: number
  activity: { id: string; name: string } | null
}

type TopicFormValues = {
  title: string
  description: string
  level: EnglishLevel
  activityId: string
}

const DEFAULT_TOPIC_FORM: TopicFormValues = {
  title: "",
  description: "",
  level: "intermediate",
  activityId: "none",
}

const levelConfig: Record<EnglishLevel, { label: string; color: string }> = {
  beginner: { label: "Debutant", color: "bg-chart-2/20 text-chart-2" },
  intermediate: { label: "Intermediaire", color: "bg-chart-1/20 text-chart-1" },
  advanced: { label: "Avance", color: "bg-chart-3/20 text-chart-3" },
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T
}

function mapTopic(row: ApiTopicRow): TopicView {
  return {
    id: row.id,
    activityId: row.activity_id ?? undefined,
    title: row.title,
    description: row.description,
    level: row.level,
    isArchived: row.is_archived,
    usageCount: row.usage_count,
    activity: row.activity
      ? {
          id: row.activity.id,
          name: row.activity.name,
        }
      : null,
  }
}

function mapTopicToFormValues(topic: TopicView): TopicFormValues {
  return {
    title: topic.title,
    description: topic.description,
    level: topic.level,
    activityId: topic.activityId ?? "none",
  }
}

function TopicFormDialog({
  open,
  onOpenChange,
  mode,
  values,
  activities,
  onChange,
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  values: TopicFormValues
  activities: ApiActivityRow[]
  onChange: (patch: Partial<TopicFormValues>) => void
  onSubmit: () => Promise<void>
  isSubmitting: boolean
  errorMessage: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Creer un nouveau sujet" : "Modifier le sujet"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Ajoute un sujet a la bibliotheque pour vos activites."
              : "Mets a jour les informations de ce sujet."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="topic-title">Titre du sujet</Label>
            <Input
              id="topic-title"
              value={values.title}
              onChange={(event) => onChange({ title: event.target.value })}
              placeholder="Ex: Talk about your dream job"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic-description">Description / Contexte</Label>
            <Textarea
              id="topic-description"
              rows={4}
              value={values.description}
              onChange={(event) => onChange({ description: event.target.value })}
              placeholder="Decris le sujet et donne des pistes..."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="topic-activity">Activite associee</Label>
              <Select
                value={values.activityId}
                onValueChange={(value) => onChange({ activityId: value })}
              >
                <SelectTrigger id="topic-activity">
                  <SelectValue placeholder="Selectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {activities.map((activity) => (
                    <SelectItem key={activity.id} value={activity.id}>
                      {activity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic-level">Niveau</Label>
              <Select
                value={values.level}
                onValueChange={(value) => onChange({ level: value as EnglishLevel })}
              >
                <SelectTrigger id="topic-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Debutant</SelectItem>
                  <SelectItem value="intermediate">Intermediaire</SelectItem>
                  <SelectItem value="advanced">Avance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={() => void onSubmit()} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : mode === "create" ? (
              "Creer le sujet"
            ) : (
              "Enregistrer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TopicCard({
  topic,
  actionId,
  onToggleArchive,
  onEdit,
}: {
  topic: TopicView
  actionId: string | null
  onToggleArchive: (topic: TopicView, isArchived: boolean) => Promise<void>
  onEdit: (topic: TopicView) => void
}) {
  const isBusy = actionId === topic.id

  return (
    <Card className={topic.isArchived ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{topic.title}</CardTitle>
              {topic.isArchived ? (
                <Badge variant="secondary" className="text-xs">
                  Archive
                </Badge>
              ) : null}
            </div>
            <CardDescription>{topic.description}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isBusy}>
                {isBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={isBusy} onClick={() => onEdit(topic)}>
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              {topic.isArchived ? (
                <DropdownMenuItem
                  disabled={isBusy}
                  onClick={() => void onToggleArchive(topic, false)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restaurer
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  disabled={isBusy}
                  onClick={() => void onToggleArchive(topic, true)}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archiver
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${levelConfig[topic.level].color}`}
          >
            {levelConfig[topic.level].label}
          </span>
          {topic.activity ? (
            <Badge variant="outline" className="gap-1">
              <BookOpen className="h-3 w-3" />
              {topic.activity.name}
            </Badge>
          ) : null}
          <Badge variant="secondary" className="ml-auto gap-1">
            <TrendingUp className="h-3 w-3" />
            {topic.usageCount} utilisation(s)
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export default function TopicsPage() {
  const [search, setSearch] = useState("")
  const [levelFilter, setLevelFilter] = useState<string>("all")
  const [activityFilter, setActivityFilter] = useState<string>("all")
  const [topics, setTopics] = useState<TopicView[]>([])
  const [topicActivities, setTopicActivities] = useState<ApiActivityRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [apiError, setApiError] = useState("")
  const [apiSuccess, setApiSuccess] = useState("")
  const [actionId, setActionId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<TopicFormValues>(DEFAULT_TOPIC_FORM)
  const [formError, setFormError] = useState("")
  const [isSubmittingForm, setIsSubmittingForm] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setApiError("")

    try {
      const [topicsResponse, activitiesResponse] = await Promise.all([
        fetch("/api/topics?includeArchived=true&limit=100&page=1"),
        fetch("/api/activities?includeArchived=false&limit=100&page=1"),
      ])

      const topicsPayload = await readJson<ApiTopicsListResponse>(topicsResponse)
      const activitiesPayload = await readJson<ApiActivitiesListResponse>(activitiesResponse)

      if (!topicsResponse.ok || !topicsPayload.success) {
        setTopics([])
        setTopicActivities([])
        setApiError(topicsPayload.error || "Chargement des sujets impossible pour le moment.")
        setIsLoading(false)
        return
      }

      setTopics((topicsPayload.data ?? []).map(mapTopic))

      if (!activitiesResponse.ok || !activitiesPayload.success) {
        setTopicActivities([])
        setApiError(
          activitiesPayload.error ||
            "Sujets charges, mais la liste des activites n'a pas pu etre chargee."
        )
        setIsLoading(false)
        return
      }

      setTopicActivities(
        (activitiesPayload.data ?? []).filter(
          (activity) => !activity.is_archived && activity.requires_topic
        )
      )
      setIsLoading(false)
    } catch {
      setTopics([])
      setTopicActivities([])
      setApiError("Impossible de joindre le serveur pour charger les sujets.")
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const openCreateDialog = useCallback(() => {
    setFormMode("create")
    setEditingTopicId(null)
    setFormValues(DEFAULT_TOPIC_FORM)
    setFormError("")
    setFormOpen(true)
  }, [])

  const openEditDialog = useCallback((topic: TopicView) => {
    setFormMode("edit")
    setEditingTopicId(topic.id)
    setFormValues(mapTopicToFormValues(topic))
    setFormError("")
    setFormOpen(true)
  }, [])

  const handleSubmitForm = useCallback(async () => {
    setApiError("")
    setApiSuccess("")
    setFormError("")

    const title = formValues.title.trim()
    const description = formValues.description.trim()

    if (title.length < 3) {
      setFormError("Le titre doit contenir au moins 3 caracteres.")
      return
    }

    if (description.length < 10) {
      setFormError("La description doit contenir au moins 10 caracteres.")
      return
    }

    const isEdit = formMode === "edit" && !!editingTopicId
    const endpoint = isEdit ? `/api/topics/${editingTopicId}` : "/api/topics"
    const method = isEdit ? "PATCH" : "POST"

    setIsSubmittingForm(true)

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          level: formValues.level,
          activityId: formValues.activityId === "none" ? null : formValues.activityId,
        }),
      })

      const payload = await readJson<ApiTopicMutationResponse>(response)

      if (!response.ok || !payload.success || !payload.data) {
        setFormError(payload.error || "Enregistrement impossible.")
        setIsSubmittingForm(false)
        return
      }

      const mapped = mapTopic(payload.data)
      setTopics((previous) => {
        if (isEdit) {
          return previous.map((item) => (item.id === mapped.id ? mapped : item))
        }
        return [mapped, ...previous]
      })

      setApiSuccess(isEdit ? "Sujet modifie avec succes." : "Sujet cree avec succes.")
      setFormOpen(false)
      setIsSubmittingForm(false)
    } catch {
      setFormError("Impossible de joindre le serveur pour enregistrer le sujet.")
      setIsSubmittingForm(false)
    }
  }, [editingTopicId, formMode, formValues])

  const handleToggleArchive = useCallback(async (topic: TopicView, isArchived: boolean) => {
    setApiError("")
    setApiSuccess("")
    setActionId(topic.id)

    try {
      const response = await fetch(`/api/topics/${topic.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived }),
      })

      const payload = await readJson<ApiTopicArchiveResponse>(response)

      if (!response.ok || !payload.success || !payload.data) {
        setApiError(payload.error || "Mise a jour impossible pour ce sujet.")
        setActionId(null)
        return
      }

      setTopics((previous) =>
        previous.map((item) =>
          item.id === topic.id
            ? {
                ...item,
                isArchived: payload.data!.is_archived,
              }
            : item
        )
      )

      setApiSuccess(
        isArchived ? "Sujet archive avec succes." : "Sujet restaure avec succes."
      )
      setActionId(null)
    } catch {
      setApiError("Impossible de joindre le serveur pour mettre a jour le sujet.")
      setActionId(null)
    }
  }, [])

  const activeTopics = useMemo(() => topics.filter((t) => !t.isArchived), [topics])
  const archivedTopics = useMemo(() => topics.filter((t) => t.isArchived), [topics])

  const filterTopics = useCallback(
    (topicsList: TopicView[]) => {
      return topicsList.filter((topic) => {
        const matchesSearch =
          topic.title.toLowerCase().includes(search.toLowerCase()) ||
          topic.description.toLowerCase().includes(search.toLowerCase())

        const matchesLevel = levelFilter === "all" || topic.level === levelFilter
        const matchesActivity =
          activityFilter === "all" ||
          (activityFilter === "none" && !topic.activityId) ||
          topic.activityId === activityFilter

        return matchesSearch && matchesLevel && matchesActivity
      })
    },
    [activityFilter, levelFilter, search]
  )

  const filteredActive = filterTopics(activeTopics)
  const filteredArchived = filterTopics(archivedTopics)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sujets</h1>
          <p className="text-muted-foreground">
            Gere la bibliotheque de sujets pour vos activites
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau sujet
        </Button>
      </div>

      <TopicFormDialog
        open={formOpen}
        onOpenChange={(next) => {
          setFormOpen(next)
          if (!next) {
            setFormError("")
            setIsSubmittingForm(false)
          }
        }}
        mode={formMode}
        values={formValues}
        activities={topicActivities}
        onChange={(patch) => setFormValues((previous) => ({ ...previous, ...patch }))}
        onSubmit={handleSubmitForm}
        isSubmitting={isSubmittingForm}
        errorMessage={formError}
      />

      {apiError ? (
        <Card className="border-destructive/40">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{apiError}</p>
          </CardContent>
        </Card>
      ) : null}

      {apiSuccess ? (
        <Card className="border-green-500/40">
          <CardContent className="p-4">
            <p className="text-sm text-green-700">{apiSuccess}</p>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-10">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Chargement des sujets...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{activeTopics.length}</p>
                  <p className="text-sm text-muted-foreground">Sujets actifs</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-chart-2/10 p-2">
                  <TrendingUp className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {activeTopics.filter((topic) => topic.usageCount > 0).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Utilises</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-chart-1/10 p-2">
                  <Filter className="h-5 w-5 text-chart-1" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {activeTopics.filter((topic) => topic.usageCount === 0).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Disponibles</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-chart-3/10 p-2">
                  <Archive className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{archivedTopics.length}</p>
                  <p className="text-sm text-muted-foreground">Archives</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un sujet..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous niveaux</SelectItem>
                    <SelectItem value="beginner">Debutant</SelectItem>
                    <SelectItem value="intermediate">Intermediaire</SelectItem>
                    <SelectItem value="advanced">Avance</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={activityFilter} onValueChange={setActivityFilter}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="Activite" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes activites</SelectItem>
                    <SelectItem value="none">Sans activite</SelectItem>
                    {topicActivities.map((activity) => (
                      <SelectItem key={activity.id} value={activity.id}>
                        {activity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">Actifs ({filteredActive.length})</TabsTrigger>
              <TabsTrigger value="archived">Archives ({filteredArchived.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {filteredActive.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredActive.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      actionId={actionId}
                      onToggleArchive={handleToggleArchive}
                      onEdit={openEditDialog}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-foreground">Aucun sujet trouve</p>
                    <p className="text-xs text-muted-foreground">
                      Cree ton premier sujet pour commencer
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="archived" className="space-y-4">
              {filteredArchived.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredArchived.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      actionId={actionId}
                      onToggleArchive={handleToggleArchive}
                      onEdit={openEditDialog}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Archive className="mb-4 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-foreground">Aucun sujet archive</p>
                    <p className="text-xs text-muted-foreground">
                      Les sujets archives apparaitront ici
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
