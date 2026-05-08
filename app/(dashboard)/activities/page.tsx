"use client"

import { useCallback, useEffect, useState } from "react"
import {
  BookOpen,
  Search,
  MoreHorizontal,
  Plus,
  Users,
  Clock,
  Archive,
  Edit,
  RotateCcw,
  Eye,
  Smile,
  HelpCircle,
  Link,
  Flame,
  MessageCircleOff,
  Pencil,
  Grid3X3,
  Gavel,
  Theater,
  Timer,
  Circle,
  Briefcase,
  Headphones,
  Video,
  Newspaper,
  Music,
  FileText,
  Sparkles,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Play,
  Palmtree,
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { Activity, ActivityCategory } from "@/lib/types"
import { activityCategoryLabels } from "@/lib/types"

type ApiActivityRow = {
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

type ApiActivitiesListResponse = {
  success?: boolean
  error?: string
  data?: ApiActivityRow[]
}

type ApiArchiveResponse = {
  success?: boolean
  error?: string
  data?: {
    id: string
    is_archived: boolean
    updated_at: string
  }
}

type ApiActivityMutationResponse = {
  success?: boolean
  error?: string
  data?: ApiActivityRow
}

type ActivityFormValues = {
  name: string
  nameEn: string
  description: string
  category: ActivityCategory
  defaultDuration: string
  minDuration: string
  maxDuration: string
  membersRequired: string
  selectionMode: "automatic" | "manual" | "semi-automatic"
  requiresTopic: boolean
  topicsReusable: boolean
  instructions: string
  materialsText: string
  icon: string
  isDefault: boolean
}

type ActivityMutationPayload = {
  name: string
  nameEn: string
  description: string
  category: ActivityCategory
  defaultDuration: number
  minDuration: number
  maxDuration: number
  membersRequired: number
  selectionMode: "automatic" | "manual" | "semi-automatic"
  requiresTopic: boolean
  topicsReusable: boolean
  instructions: string
  materials: string[]
  icon?: string
  isDefault: boolean
}

const DEFAULT_ACTIVITY_FORM: ActivityFormValues = {
  name: "",
  nameEn: "",
  description: "",
  category: "ice_breaker",
  defaultDuration: "10",
  minDuration: "10",
  maxDuration: "15",
  membersRequired: "1",
  selectionMode: "manual",
  requiresTopic: false,
  topicsReusable: false,
  instructions: "",
  materialsText: "",
  icon: "",
  isDefault: false,
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T
}

function mapApiActivity(row: ApiActivityRow): Activity {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en,
    description: row.description,
    category: row.category,
    defaultDuration: row.default_duration,
    minDuration: row.min_duration,
    maxDuration: row.max_duration,
    membersRequired: row.members_required,
    selectionMode: row.selection_mode,
    requiresTopic: row.requires_topic,
    topicsReusable: row.topics_reusable,
    isArchived: row.is_archived,
    isDefault: row.is_default,
    instructions: row.instructions,
    materials: row.materials ?? [],
    icon: row.icon ?? undefined,
  }
}

function mapActivityToFormValues(activity: Activity): ActivityFormValues {
  return {
    name: activity.name,
    nameEn: activity.nameEn,
    description: activity.description,
    category: activity.category,
    defaultDuration: String(activity.defaultDuration),
    minDuration: String(activity.minDuration),
    maxDuration: String(activity.maxDuration),
    membersRequired: String(activity.membersRequired),
    selectionMode: activity.selectionMode,
    requiresTopic: activity.requiresTopic,
    topicsReusable: activity.topicsReusable,
    instructions: activity.instructions,
    materialsText: (activity.materials ?? []).join("\n"),
    icon: activity.icon ?? "",
    isDefault: activity.isDefault,
  }
}

function parseMaterials(materialsText: string) {
  return materialsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function validateActivityForm(
  values: ActivityFormValues
): { ok: true; payload: ActivityMutationPayload } | { ok: false; error: string } {
  const name = values.name.trim()
  const nameEn = values.nameEn.trim()
  const description = values.description.trim()
  const instructions = values.instructions.trim()
  const icon = values.icon.trim()
  const defaultDuration = Number.parseInt(values.defaultDuration, 10)
  const minDuration = Number.parseInt(values.minDuration, 10)
  const maxDuration = Number.parseInt(values.maxDuration, 10)
  const membersRequired = Number.parseInt(values.membersRequired, 10)

  if (!name || !nameEn) {
    return { ok: false, error: "Le nom FR et le nom EN sont obligatoires." }
  }

  if (!description) {
    return { ok: false, error: "La description est obligatoire." }
  }

  if (!instructions) {
    return { ok: false, error: "Les instructions sont obligatoires." }
  }

  if (
    !Number.isFinite(defaultDuration) ||
    !Number.isFinite(minDuration) ||
    !Number.isFinite(maxDuration) ||
    !Number.isFinite(membersRequired)
  ) {
    return { ok: false, error: "Les champs numeriques sont invalides." }
  }

  if (
    defaultDuration < 1 ||
    minDuration < 1 ||
    maxDuration < 1 ||
    membersRequired < 1
  ) {
    return { ok: false, error: "Les valeurs numeriques doivent etre >= 1." }
  }

  if (!(minDuration <= defaultDuration && defaultDuration <= maxDuration)) {
    return {
      ok: false,
      error: "La regle des durees est: min <= duree par defaut <= max.",
    }
  }

  return {
    ok: true,
    payload: {
      name,
      nameEn,
      description,
      category: values.category,
      defaultDuration,
      minDuration,
      maxDuration,
      membersRequired,
      selectionMode: values.selectionMode,
      requiresTopic: values.requiresTopic,
      topicsReusable: values.topicsReusable,
      instructions,
      materials: parseMaterials(values.materialsText),
      ...(icon ? { icon } : {}),
      isDefault: values.isDefault,
    },
  }
}

// Icon mapping for activities
const iconMap: Record<string, React.ElementType> = {
  smile: Smile,
  "help-circle": HelpCircle,
  link: Link,
  flame: Flame,
  users: Users,
  "message-circle-off": MessageCircleOff,
  pencil: Pencil,
  grid: Grid3X3,
  gavel: Gavel,
  theater: Theater,
  timer: Timer,
  circle: Circle,
  palmtree: Palmtree,
  briefcase: Briefcase,
  headphones: Headphones,
  video: Video,
  newspaper: Newspaper,
  music: Music,
  edit: Edit,
  "file-text": FileText,
  sparkles: Sparkles,
  "message-square": MessageSquare,
}

const categoryColors: Record<ActivityCategory, string> = {
  ice_breaker: "bg-blue-500/10 text-blue-600 border-blue-200",
  vocabulary: "bg-amber-500/10 text-amber-600 border-amber-200",
  conversation: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  comprehension: "bg-purple-500/10 text-purple-600 border-purple-200",
  writing: "bg-rose-500/10 text-rose-600 border-rose-200",
}

const categoryIcons: Record<ActivityCategory, React.ElementType> = {
  ice_breaker: Smile,
  vocabulary: BookOpen,
  conversation: MessageSquare,
  comprehension: Headphones,
  writing: FileText,
}

function ActivityFormDialog({
  open,
  onOpenChange,
  mode,
  values,
  onChange,
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  values: ActivityFormValues
  onChange: (patch: Partial<ActivityFormValues>) => void
  onSubmit: () => Promise<void>
  isSubmitting: boolean
  errorMessage: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nouvelle activite" : "Modifier l'activite"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Cree une activite utilisable dans les seances."
              : "Mets a jour cette activite."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="activity-name">Nom (FR)</Label>
                <Input
                  id="activity-name"
                  value={values.name}
                  onChange={(event) => onChange({ name: event.target.value })}
                  placeholder="Nom de l'activite"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-name-en">Nom (EN)</Label>
                <Input
                  id="activity-name-en"
                  value={values.nameEn}
                  onChange={(event) => onChange({ nameEn: event.target.value })}
                  placeholder="Activity name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-description">Description</Label>
              <Textarea
                id="activity-description"
                rows={3}
                value={values.description}
                onChange={(event) => onChange({ description: event.target.value })}
                placeholder="Description de l'activite"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="activity-category">Categorie</Label>
                <Select
                  value={values.category}
                  onValueChange={(value) =>
                    onChange({ category: value as ActivityCategory })
                  }
                >
                  <SelectTrigger id="activity-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ice_breaker">Ice Breaker</SelectItem>
                    <SelectItem value="vocabulary">Vocabulaire</SelectItem>
                    <SelectItem value="conversation">Conversation</SelectItem>
                    <SelectItem value="comprehension">Comprehension</SelectItem>
                    <SelectItem value="writing">Ecriture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-selection">Selection</Label>
                <Select
                  value={values.selectionMode}
                  onValueChange={(value) =>
                    onChange({
                      selectionMode: value as ActivityFormValues["selectionMode"],
                    })
                  }
                >
                  <SelectTrigger id="activity-selection">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatic">Automatique</SelectItem>
                    <SelectItem value="manual">Manuel</SelectItem>
                    <SelectItem value="semi-automatic">Semi-automatique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="activity-duration-default">Duree defaut</Label>
                <Input
                  id="activity-duration-default"
                  type="number"
                  min={1}
                  value={values.defaultDuration}
                  onChange={(event) =>
                    onChange({ defaultDuration: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-duration-min">Duree min</Label>
                <Input
                  id="activity-duration-min"
                  type="number"
                  min={1}
                  value={values.minDuration}
                  onChange={(event) => onChange({ minDuration: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-duration-max">Duree max</Label>
                <Input
                  id="activity-duration-max"
                  type="number"
                  min={1}
                  value={values.maxDuration}
                  onChange={(event) => onChange({ maxDuration: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-members-required">Membres requis</Label>
                <Input
                  id="activity-members-required"
                  type="number"
                  min={1}
                  value={values.membersRequired}
                  onChange={(event) =>
                    onChange({ membersRequired: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-icon">Icone (optionnel)</Label>
              <Input
                id="activity-icon"
                value={values.icon}
                onChange={(event) => onChange({ icon: event.target.value })}
                placeholder="ex: smile, timer, file-text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-instructions">Instructions</Label>
              <Textarea
                id="activity-instructions"
                rows={6}
                value={values.instructions}
                onChange={(event) => onChange({ instructions: event.target.value })}
                placeholder="Etapes de l'activite..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-materials">Materiel (1 ligne = 1 element)</Label>
              <Textarea
                id="activity-materials"
                rows={4}
                value={values.materialsText}
                onChange={(event) => onChange({ materialsText: event.target.value })}
                placeholder={"Projecteur\nChronometre\nCartes"}
              />
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="activity-requires-topic">Sujet requis</Label>
                <Switch
                  id="activity-requires-topic"
                  checked={values.requiresTopic}
                  onCheckedChange={(checked) => onChange({ requiresTopic: checked })}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="activity-topics-reusable">Sujets reutilisables</Label>
                <Switch
                  id="activity-topics-reusable"
                  checked={values.topicsReusable}
                  onCheckedChange={(checked) => onChange({ topicsReusable: checked })}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="activity-is-default">Activite par defaut</Label>
                <Switch
                  id="activity-is-default"
                  checked={values.isDefault}
                  onCheckedChange={(checked) => onChange({ isDefault: checked })}
                />
              </div>
            </div>

            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={() => void onSubmit()} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : mode === "create" ? (
              "Creer l'activite"
            ) : (
              "Enregistrer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Activity Detail Dialog
function ActivityDetailDialog({ activity }: { activity: Activity }) {
  const Icon = activity.icon ? iconMap[activity.icon] || BookOpen : BookOpen
  const CategoryIcon = categoryIcons[activity.category]
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Eye className="h-4 w-4" />
          Details
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${categoryColors[activity.category]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">{activity.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <CategoryIcon className="h-3 w-3" />
                {activityCategoryLabels[activity.category]}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Description */}
            <div>
              <h4 className="font-medium text-foreground mb-2">Description</h4>
              <p className="text-muted-foreground">{activity.description}</p>
            </div>

            {/* Quick Info */}
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {activity.defaultDuration} min (min: {activity.minDuration}, max: {activity.maxDuration})
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                {activity.membersRequired} membre(s) requis
              </Badge>
              {activity.requiresTopic && (
                <Badge variant="secondary">Sujet requis</Badge>
              )}
            </div>

            <Separator />

            {/* Instructions */}
            <div>
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <Play className="h-4 w-4" />
                Instructions
              </h4>
              <div className="bg-muted/50 rounded-lg p-4">
                <ol className="space-y-2">
                  {activity.instructions.split("\n").map((step, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Materials */}
            {activity.materials && activity.materials.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground mb-3">Materiel necessaire</h4>
                <ul className="space-y-1">
                  {activity.materials.map((material, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {material}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// Activity Card Component
function ActivityCard({
  activity,
  actionId,
  onToggleArchive,
  onEdit,
}: {
  activity: Activity
  actionId: string | null
  onToggleArchive: (activity: Activity, isArchived: boolean) => Promise<void>
  onEdit: (activity: Activity) => void
}) {
  const Icon = activity.icon ? iconMap[activity.icon] || BookOpen : BookOpen
  const isBusy = actionId === activity.id
  
  return (
    <Card className={`transition-all hover:shadow-md ${activity.isArchived ? "opacity-60" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-2 ${categoryColors[activity.category]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                {activity.name}
                {activity.isArchived && (
                  <Badge variant="secondary" className="text-xs">
                    Archive
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1 line-clamp-2">
                {activity.description}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isBusy}>
                {isBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={isBusy}
                onClick={() => onEdit(activity)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              {activity.isArchived ? (
                <DropdownMenuItem
                  disabled={isBusy}
                  onClick={() => void onToggleArchive(activity, false)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restaurer
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  disabled={isBusy}
                  onClick={() => void onToggleArchive(activity, true)}
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
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {activity.defaultDuration} min
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <Users className="h-3 w-3" />
              {activity.membersRequired}
            </Badge>
          </div>
          <ActivityDetailDialog activity={activity} />
        </div>
      </CardContent>
    </Card>
  )
}

// Category Section Component
function CategorySection({ 
  category, 
  activities: categoryActivities,
  isExpanded,
  onToggle,
  actionId,
  onToggleArchive,
  onEdit,
}: { 
  category: ActivityCategory
  activities: Activity[]
  isExpanded: boolean
  onToggle: () => void
  actionId: string | null
  onToggleArchive: (activity: Activity, isArchived: boolean) => Promise<void>
  onEdit: (activity: Activity) => void
}) {
  const CategoryIcon = categoryIcons[category]
  const activeCount = categoryActivities.filter(a => !a.isArchived).length
  
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${categoryColors[category]}`}>
                <CategoryIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {activityCategoryLabels[category]}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {activeCount} activite{activeCount > 1 ? "s" : ""} disponible{activeCount > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{activeCount}</Badge>
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardContent>
        </Card>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pl-4">
          {categoryActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              actionId={actionId}
              onToggleArchive={onToggleArchive}
              onEdit={onEdit}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export default function ActivitiesPage() {
  const [search, setSearch] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<ActivityCategory[]>(["ice_breaker"])
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [apiError, setApiError] = useState("")
  const [apiSuccess, setApiSuccess] = useState("")
  const [actionId, setActionId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<ActivityFormValues>(DEFAULT_ACTIVITY_FORM)
  const [formError, setFormError] = useState("")
  const [isSubmittingForm, setIsSubmittingForm] = useState(false)

  const categories: ActivityCategory[] = ["ice_breaker", "vocabulary", "conversation", "comprehension", "writing"]
  
  const activeActivities = activities.filter((a) => !a.isArchived)
  const archivedActivities = activities.filter((a) => a.isArchived)

  const fetchActivities = useCallback(async () => {
    setIsLoading(true)
    setApiError("")

    try {
      const response = await fetch("/api/activities?includeArchived=true&limit=100&page=1")
      const payload = await readJson<ApiActivitiesListResponse>(response)

      if (!response.ok || !payload.success) {
        setApiError(payload.error || "Chargement des activites impossible pour le moment.")
        setActivities([])
        setIsLoading(false)
        return
      }

      setActivities((payload.data ?? []).map(mapApiActivity))
      setIsLoading(false)
    } catch {
      setApiError("Impossible de joindre le serveur pour charger les activites.")
      setActivities([])
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchActivities()
  }, [fetchActivities])

  const handleToggleArchive = useCallback(
    async (activity: Activity, isArchived: boolean) => {
      setApiError("")
      setApiSuccess("")
      setActionId(activity.id)

      try {
        const response = await fetch(`/api/activities/${activity.id}/archive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived }),
        })
        const payload = await readJson<ApiArchiveResponse>(response)

        if (!response.ok || !payload.success || !payload.data) {
          setApiError(payload.error || "Mise a jour impossible pour cette activite.")
          setActionId(null)
          return
        }

        setActivities((previous) =>
          previous.map((item) =>
            item.id === activity.id
              ? {
                  ...item,
                  isArchived: payload.data!.is_archived,
                }
              : item
          )
        )
        setApiSuccess(
          isArchived
            ? "Activite archivee avec succes."
            : "Activite restauree avec succes."
        )
        setActionId(null)
      } catch {
        setApiError("Impossible de joindre le serveur pour mettre a jour l'activite.")
        setActionId(null)
      }
    },
    []
  )

  const openCreateDialog = useCallback(() => {
    setFormMode("create")
    setEditingActivityId(null)
    setFormValues(DEFAULT_ACTIVITY_FORM)
    setFormError("")
    setFormOpen(true)
  }, [])

  const openEditDialog = useCallback((activity: Activity) => {
    setFormMode("edit")
    setEditingActivityId(activity.id)
    setFormValues(mapActivityToFormValues(activity))
    setFormError("")
    setFormOpen(true)
  }, [])

  const handleSubmitForm = useCallback(async () => {
    setApiError("")
    setApiSuccess("")
    setFormError("")

    const validation = validateActivityForm(formValues)
    if (!validation.ok) {
      setFormError(validation.error)
      return
    }

    const isEdit = formMode === "edit" && !!editingActivityId
    const endpoint = isEdit
      ? `/api/activities/${editingActivityId}`
      : "/api/activities"
    const method = isEdit ? "PATCH" : "POST"

    setIsSubmittingForm(true)

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.payload),
      })
      const payload = await readJson<ApiActivityMutationResponse>(response)

      if (!response.ok || !payload.success || !payload.data) {
        setFormError(payload.error || "Enregistrement impossible.")
        setIsSubmittingForm(false)
        return
      }

      const mapped = mapApiActivity(payload.data)
      setActivities((previous) => {
        if (isEdit) {
          return previous.map((item) => (item.id === mapped.id ? mapped : item))
        }
        return [mapped, ...previous]
      })

      if (!isEdit) {
        setExpandedCategories((previous) =>
          previous.includes(mapped.category) ? previous : [...previous, mapped.category]
        )
      }

      setApiSuccess(
        isEdit
          ? "Activite modifiee avec succes."
          : "Activite creee avec succes."
      )
      setFormOpen(false)
      setIsSubmittingForm(false)
    } catch {
      setFormError("Impossible de joindre le serveur pour enregistrer l'activite.")
      setIsSubmittingForm(false)
    }
  }, [editingActivityId, formMode, formValues])

  const toggleCategory = (category: ActivityCategory) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const expandAll = () => setExpandedCategories(categories)
  const collapseAll = () => setExpandedCategories([])

  const filteredActivities = (categoryActivities: Activity[]) => {
    if (!search) return categoryActivities
    return categoryActivities.filter(
      (a) =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.description.toLowerCase().includes(search.toLowerCase())
    )
  }

  const getActivitiesByCategory = (category: ActivityCategory) => 
    filteredActivities(activeActivities.filter(a => a.category === category))

  const hasSearchResults = activeActivities.some(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activites</h1>
          <p className="text-muted-foreground">
            Bibliotheque d&apos;activites predefinies pour vos seances
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle activite
        </Button>
      </div>

      <ActivityFormDialog
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
        onChange={(patch) => setFormValues((previous) => ({ ...previous, ...patch }))}
        onSubmit={handleSubmitForm}
        isSubmitting={isSubmittingForm}
        errorMessage={formError}
      />

      {apiError && (
        <Card className="border-destructive/40">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{apiError}</p>
          </CardContent>
        </Card>
      )}
      {apiSuccess && (
        <Card className="border-green-500/40">
          <CardContent className="p-4">
            <p className="text-sm text-green-700">{apiSuccess}</p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-10">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Chargement des activites...</p>
          </CardContent>
        </Card>
      ) : (
        <>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-5">
        {categories.map(category => {
          const CategoryIcon = categoryIcons[category]
          const count = activeActivities.filter(a => a.category === category).length
          return (
            <Card key={category} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => {
              setExpandedCategories([category])
              document.getElementById(`category-${category}`)?.scrollIntoView({ behavior: 'smooth' })
            }}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`rounded-lg p-2 ${categoryColors[category]}`}>
                  <CategoryIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {activityCategoryLabels[category].split(" ")[0]}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Search and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher une activite..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Tout deployer
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Tout replier
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library">
            Bibliotheque ({activeActivities.length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archivees ({archivedActivities.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4 mt-4">
          {categories.map(category => {
            const categoryActivities = getActivitiesByCategory(category)
            if (categoryActivities.length === 0 && search) return null
            
            return (
              <div key={category} id={`category-${category}`}>
                <CategorySection
                  category={category}
                  activities={categoryActivities}
                  isExpanded={expandedCategories.includes(category)}
                  onToggle={() => toggleCategory(category)}
                  actionId={actionId}
                  onToggleArchive={handleToggleArchive}
                  onEdit={openEditDialog}
                />
              </div>
            )
          })}

          {search && !hasSearchResults && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium text-foreground">Aucune activite trouvee</p>
                <p className="text-xs text-muted-foreground">
                  Essayez avec d&apos;autres mots-cles
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4 mt-4">
          {archivedActivities.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {archivedActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  actionId={actionId}
                  onToggleArchive={handleToggleArchive}
                  onEdit={openEditDialog}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Archive className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium text-foreground">Aucune activite archivee</p>
                <p className="text-xs text-muted-foreground">
                  Les activites archivees apparaitront ici
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
