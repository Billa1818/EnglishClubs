"use client"

import { useState } from "react"
import {
  BookOpen,
  Search,
  MoreHorizontal,
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
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { activities } from "@/lib/mock-data"
import type { Activity, ActivityCategory } from "@/lib/types"
import { activityCategoryLabels } from "@/lib/types"

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
function ActivityCard({ activity }: { activity: Activity }) {
  const Icon = activity.icon ? iconMap[activity.icon] || BookOpen : BookOpen
  
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
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={activity.isDefault}>
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              {activity.isArchived ? (
                <DropdownMenuItem>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restaurer
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled={activity.isDefault}>
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
  onToggle 
}: { 
  category: ActivityCategory
  activities: Activity[]
  isExpanded: boolean
  onToggle: () => void
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
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export default function ActivitiesPage() {
  const [search, setSearch] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<ActivityCategory[]>(["ice_breaker"])

  const categories: ActivityCategory[] = ["ice_breaker", "vocabulary", "conversation", "comprehension", "writing"]
  
  const activeActivities = activities.filter((a) => !a.isArchived)
  const archivedActivities = activities.filter((a) => a.isArchived)

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activites</h1>
          <p className="text-muted-foreground">
            Bibliotheque d&apos;activites predefinies pour vos seances
          </p>
        </div>
      </div>

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
                />
              </div>
            )
          })}

          {search && activeActivities.filter(a => 
            a.name.toLowerCase().includes(search.toLowerCase()) ||
            a.description.toLowerCase().includes(search.toLowerCase())
          ).length === 0 && (
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
                <ActivityCard key={activity.id} activity={activity} />
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
    </div>
  )
}
