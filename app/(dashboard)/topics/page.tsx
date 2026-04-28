"use client"

import { useState } from "react"
import {
  MessageSquare,
  Plus,
  Search,
  MoreHorizontal,
  BookOpen,
  Archive,
  Edit,
  Trash2,
  RotateCcw,
  TrendingUp,
  Filter,
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { topics, activities } from "@/lib/mock-data"
import type { EnglishLevel } from "@/lib/types"

const levelConfig: Record<EnglishLevel, { label: string; color: string }> = {
  beginner: { label: "Débutant", color: "bg-chart-2/20 text-chart-2" },
  intermediate: { label: "Intermédiaire", color: "bg-chart-1/20 text-chart-1" },
  advanced: { label: "Avancé", color: "bg-chart-3/20 text-chart-3" },
}

function CreateTopicDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau sujet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer un nouveau sujet</DialogTitle>
          <DialogDescription>
            Ajoutez un sujet à la bibliothèque pour vos activités.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre du sujet</Label>
            <Input id="title" placeholder="Ex: Talk about your dream job" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description / Contexte</Label>
            <Textarea
              id="description"
              placeholder="Décrivez le sujet et donnez des pistes..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activity">Activité associée</Label>
              <Select>
                <SelectTrigger id="activity">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {activities
                    .filter((a) => !a.isArchived && a.requiresTopic)
                    .map((activity) => (
                      <SelectItem key={activity.id} value={activity.id}>
                        {activity.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Niveau</Label>
              <Select defaultValue="intermediate">
                <SelectTrigger id="level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Débutant</SelectItem>
                  <SelectItem value="intermediate">Intermédiaire</SelectItem>
                  <SelectItem value="advanced">Avancé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="submit">Créer le sujet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TopicCard({ topic }: { topic: typeof topics[0] }) {
  return (
    <Card className={topic.isArchived ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{topic.title}</CardTitle>
              {topic.isArchived && (
                <Badge variant="secondary" className="text-xs">
                  Archivé
                </Badge>
              )}
            </div>
            <CardDescription>{topic.description}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              {topic.isArchived ? (
                <DropdownMenuItem>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restaurer
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem>
                  <Archive className="mr-2 h-4 w-4" />
                  Archiver
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
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
          {topic.activity && (
            <Badge variant="outline" className="gap-1">
              <BookOpen className="h-3 w-3" />
              {topic.activity.name}
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1 ml-auto">
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

  const activeTopics = topics.filter((t) => !t.isArchived)
  const archivedTopics = topics.filter((t) => t.isArchived)

  const filterTopics = (topicsList: typeof topics) => {
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
  }

  const filteredActive = filterTopics(activeTopics)
  const filteredArchived = filterTopics(archivedTopics)

  const topicActivities = activities.filter((a) => !a.isArchived && a.requiresTopic)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sujets</h1>
          <p className="text-muted-foreground">
            Gérez la bibliothèque de sujets pour vos activités
          </p>
        </div>
        <CreateTopicDialog />
      </div>

      {/* Stats */}
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
                {activeTopics.filter((t) => t.usageCount > 0).length}
              </p>
              <p className="text-sm text-muted-foreground">Utilisés</p>
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
                {activeTopics.filter((t) => t.usageCount === 0).length}
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
              <p className="text-sm text-muted-foreground">Archivés</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un sujet..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Niveau" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous niveaux</SelectItem>
                <SelectItem value="beginner">Débutant</SelectItem>
                <SelectItem value="intermediate">Intermédiaire</SelectItem>
                <SelectItem value="advanced">Avancé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Activité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes activités</SelectItem>
                <SelectItem value="none">Sans activité</SelectItem>
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
          <TabsTrigger value="archived">Archivés ({filteredArchived.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {filteredActive.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredActive.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium text-foreground">Aucun sujet trouvé</p>
                <p className="text-xs text-muted-foreground">
                  Créez votre premier sujet pour commencer
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          {filteredArchived.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredArchived.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Archive className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium text-foreground">Aucun sujet archivé</p>
                <p className="text-xs text-muted-foreground">
                  Les sujets archivés apparaîtront ici
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
