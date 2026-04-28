"use client"

import { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  BookOpen,
  Plus,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCheck,
  UserX,
  Shuffle,
  GripVertical,
  Minus,
  Eye,
  Smile,
  HelpCircle,
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
  Palmtree,
  Play,
  Settings2,
  MessageCircle,
  Award,
  PlayCircle,
  StopCircle,
  SkipForward,
  CircleDot,
  Pause,
  CheckCircle2,
  FastForward,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { sessions, activities, debateTopics, users } from "@/lib/mock-data"
import { useAuth } from "@/lib/auth-context"
import type {
  SessionStatus,
  AttendanceStatus,
  Activity,
  ActivityCategory,
  DebateTopic,
  SessionDebate,
  User,
  SessionActivityStatus,
  SessionActivity,
  AssignmentTiming,
} from "@/lib/types"
import { activityCategoryLabels } from "@/lib/types"
import { Link2 } from "lucide-react"

const statusConfig: Record<
  SessionStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }
> = {
  upcoming: { label: "A venir", variant: "default", icon: Clock },
  ongoing: { label: "En cours", variant: "secondary", icon: AlertCircle },
  completed: { label: "Terminee", variant: "outline", icon: CheckCircle },
  cancelled: { label: "Annulee", variant: "destructive", icon: XCircle },
}

const attendanceStatusConfig: Record<
  AttendanceStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }
> = {
  declared: { label: "Declare", variant: "secondary", icon: Clock },
  confirmed: { label: "Confirme", variant: "default", icon: CheckCircle },
  absent: { label: "Absent", variant: "destructive", icon: XCircle },
  excused: { label: "Excuse", variant: "outline", icon: AlertCircle },
}

const activityStatusConfig: Record<
  SessionActivityStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType; color: string }
> = {
  pending: { label: "A venir", variant: "outline", icon: Clock, color: "text-muted-foreground" },
  in_progress: { label: "En cours", variant: "default", icon: PlayCircle, color: "text-primary" },
  completed: { label: "Terminee", variant: "secondary", icon: CheckCircle2, color: "text-green-600" },
  skipped: { label: "Passee", variant: "outline", icon: FastForward, color: "text-amber-600" },
}

const assignmentTimingConfig: Record<AssignmentTiming, { label: string; helper: string }> = {
  before_event: {
    label: "Avant l'evenement",
    helper: "Les membres sont selectionnes avant le debut de la seance.",
  },
  during_event: {
    label: "Pendant l'evenement",
    helper: "L'admin fera la selection en direct pendant la seance.",
  },
}

const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360

const shuffleUsers = (members: User[]) => {
  const shuffled = [...members]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[randomIndex]
    shuffled[randomIndex] = current
  }
  return shuffled
}

const formatMemberName = (member: User) => `${member.firstName} ${member.lastName}`

// Icon mapping for activities
const iconMap: Record<string, React.ElementType> = {
  smile: Smile,
  "help-circle": HelpCircle,
  link: Link2,
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
  edit: Pencil,
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

// Level badge colors
const levelColors: Record<string, string> = {
  beginner: "bg-green-500/10 text-green-600 border-green-200",
  intermediate: "bg-amber-500/10 text-amber-600 border-amber-200",
  advanced: "bg-red-500/10 text-red-600 border-red-200",
}

const levelLabels: Record<string, string> = {
  beginner: "Debutant",
  intermediate: "Intermediaire",
  advanced: "Avance",
}

// Configure Debate Dialog
function ConfigureDebateDialog({
  availableTopics,
  availableMembers,
  currentDebate,
  onConfigure,
}: {
  availableTopics: DebateTopic[]
  availableMembers: User[]
  currentDebate?: SessionDebate
  onConfigure: (topicId: string, participantsCount: number, selectedMembers: User[]) => void
}) {
  const [selectedTopic, setSelectedTopic] = useState<DebateTopic | null>(currentDebate?.topic || null)
  const [participantsCount, setParticipantsCount] = useState<number>(currentDebate?.participantsCount || 3)
  const [selectedMembers, setSelectedMembers] = useState<User[]>(currentDebate?.selectedMembers || [])
  const [open, setOpen] = useState(false)

  const handleSelectTopic = (topic: DebateTopic) => {
    setSelectedTopic(topic)
  }

  const handleRandomSelection = () => {
    // Filter out already selected members and shuffle
    const available = availableMembers.filter(m => !selectedMembers.some(sm => sm.id === m.id))
    const shuffled = [...available].sort(() => Math.random() - 0.5)
    const needed = Math.min(participantsCount - selectedMembers.length, shuffled.length)
    setSelectedMembers([...selectedMembers, ...shuffled.slice(0, needed)])
  }

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== userId))
  }

  const handleConfigure = () => {
    if (selectedTopic && selectedMembers.length > 0) {
      onConfigure(selectedTopic.id, participantsCount, selectedMembers)
      setOpen(false)
    }
  }

  const resetSelections = () => {
    setSelectedMembers([])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={currentDebate ? "outline" : "default"}>
          <MessageCircle className="mr-2 h-4 w-4" />
          {currentDebate ? "Modifier le debat" : "Configurer le debat"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Configurer le debat de la seance</DialogTitle>
          <DialogDescription>
            Choisissez un sujet de debat et selectionnez les membres qui y participeront
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          {/* Topic Selection */}
          <div className="space-y-4">
            <Label>Choisir un sujet de debat</Label>
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-2">
                {availableTopics.filter(t => !t.isArchived).map(topic => {
                  const isSelected = selectedTopic?.id === topic.id
                  
                  return (
                    <div
                      key={topic.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                      onClick={() => handleSelectTopic(topic)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">
                            {topic.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {topic.description}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={`text-xs ${levelColors[topic.level]}`}>
                          {levelLabels[topic.level]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Utilise {topic.usageCount} fois
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Members Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Selection des participants</Label>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Nombre:</Label>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={() => setParticipantsCount(Math.max(2, participantsCount - 1))}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-bold text-sm">
                    {participantsCount}
                  </span>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setParticipantsCount(Math.min(availableMembers.length, participantsCount + 1))}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {selectedTopic ? (
              <div className="space-y-4">
                {/* Selected topic preview */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <MessageCircle className="h-4 w-4 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{selectedTopic.title}</p>
                        <Badge variant="outline" className={`text-xs mt-1 ${levelColors[selectedTopic.level]}`}>
                          {levelLabels[selectedTopic.level]}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Random selection button */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleRandomSelection}
                    disabled={selectedMembers.length >= participantsCount}
                  >
                    <Shuffle className="mr-2 h-4 w-4" />
                    Selection aleatoire
                  </Button>
                  {selectedMembers.length > 0 && (
                    <Button variant="ghost" size="icon" onClick={resetSelections}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Selected members */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    Membres selectionnes ({selectedMembers.length}/{participantsCount})
                  </p>
                  {selectedMembers.length > 0 ? (
                    <div className="space-y-2">
                      {selectedMembers.map((member, index) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-2 rounded-lg border border-border bg-background"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {index + 1}
                            </div>
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={member.photoUrl} />
                              <AvatarFallback className="text-xs">
                                {member.firstName[0]}{member.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-foreground">
                              {member.firstName} {member.lastName}
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed rounded-lg">
                      <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Cliquez sur &quot;Selection aleatoire&quot;
                      </p>
                    </div>
                  )}
                </div>

                {/* Available members for manual selection */}
                {selectedMembers.length < participantsCount && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Ou selectionnez manuellement:
                    </p>
                    <ScrollArea className="h-[100px]">
                      <div className="flex flex-wrap gap-2">
                        {availableMembers
                          .filter(m => !selectedMembers.some(sm => sm.id === m.id))
                          .map(member => (
                            <Button
                              key={member.id}
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => setSelectedMembers([...selectedMembers, member])}
                              disabled={selectedMembers.length >= participantsCount}
                            >
                              <Avatar className="h-5 w-5 mr-1">
                                <AvatarImage src={member.photoUrl} />
                                <AvatarFallback className="text-xs">
                                  {member.firstName[0]}
                                </AvatarFallback>
                              </Avatar>
                              {member.firstName}
                            </Button>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium text-foreground">
                  Selectionnez un sujet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Choisissez un sujet a gauche pour configurer le debat
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleConfigure} 
            disabled={!selectedTopic || selectedMembers.length === 0}
          >
            <Award className="mr-2 h-4 w-4" />
            Configurer le debat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Add Activity Dialog
function AddActivityDialog({ 
  availableActivities,
  onAdd 
}: { 
  availableActivities: Activity[]
  onAdd: (activityId: string, duration: number, assignmentTiming: AssignmentTiming) => void 
}) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [duration, setDuration] = useState<number>(0)
  const [assignmentTiming, setAssignmentTiming] = useState<AssignmentTiming>("before_event")
  const [open, setOpen] = useState(false)

  const categories: ActivityCategory[] = ["ice_breaker", "vocabulary", "conversation", "comprehension", "writing"]
  
  const handleSelectActivity = (activity: Activity) => {
    setSelectedActivity(activity)
    setDuration(activity.defaultDuration)
  }

  const handleAdd = () => {
    if (selectedActivity) {
      onAdd(selectedActivity.id, duration, assignmentTiming)
      setOpen(false)
      setSelectedActivity(null)
      setAssignmentTiming("before_event")
    }
  }

  const getActivitiesByCategory = (category: ActivityCategory) => 
    availableActivities.filter(a => a.category === category && !a.isArchived)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une activite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Ajouter une activite a la seance</DialogTitle>
          <DialogDescription>
            Choisissez une activite, configurez sa duree et le moment de selection des membres.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          {/* Activity Selection */}
          <div className="space-y-4">
            <Label>Choisir une activite</Label>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {categories.map(category => {
                  const categoryActivities = getActivitiesByCategory(category)
                  if (categoryActivities.length === 0) return null
                  
                  return (
                    <div key={category}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        {activityCategoryLabels[category]}
                      </h4>
                      <div className="space-y-2">
                        {categoryActivities.map(activity => {
                          const Icon = activity.icon ? iconMap[activity.icon] || BookOpen : BookOpen
                          const isSelected = selectedActivity?.id === activity.id
                          
                          return (
                            <div
                              key={activity.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                isSelected 
                                  ? "border-primary bg-primary/5" 
                                  : "border-border hover:border-primary/50 hover:bg-muted/50"
                              }`}
                              onClick={() => handleSelectActivity(activity)}
                            >
                              <div className={`rounded-lg p-1.5 ${categoryColors[activity.category]}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-foreground truncate">
                                  {activity.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {activity.defaultDuration} min
                                </p>
                              </div>
                              {isSelected && (
                                <CheckCircle className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Duration Configuration */}
          <div className="space-y-4">
            <Label>Configuration</Label>
            {selectedActivity ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${categoryColors[selectedActivity.category]}`}>
                        {(() => {
                          const Icon = selectedActivity.icon ? iconMap[selectedActivity.icon] || BookOpen : BookOpen
                          return <Icon className="h-5 w-5" />
                        })()}
                      </div>
                      <div>
                        <CardTitle className="text-base">{selectedActivity.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {activityCategoryLabels[selectedActivity.category]}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {selectedActivity.description}
                    </p>
                    
                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Duree</Label>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => setDuration(Math.max(selectedActivity.minDuration, duration - 5))}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-16 text-center font-bold text-lg">
                            {duration} min
                          </span>
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDuration(Math.min(selectedActivity.maxDuration, duration + 5))}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <Slider
                        value={[duration]}
                        onValueChange={(value) => setDuration(value[0])}
                        min={selectedActivity.minDuration}
                        max={selectedActivity.maxDuration}
                        step={5}
                        className="py-2"
                      />
                      
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Min: {selectedActivity.minDuration} min</span>
                        <span>Max: {selectedActivity.maxDuration} min</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {selectedActivity.membersRequired} membre(s)
                      </div>
                      {selectedActivity.requiresTopic && (
                        <Badge variant="secondary" className="text-xs">
                          Sujet requis
                        </Badge>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label>Quand faire la selection des membres ?</Label>
                      <div className="grid gap-2">
                        <button
                          type="button"
                          onClick={() => setAssignmentTiming("before_event")}
                          className={`rounded-lg border p-3 text-left transition-colors ${
                            assignmentTiming === "before_event"
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <p className="text-sm font-medium text-foreground">
                            {assignmentTimingConfig.before_event.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {assignmentTimingConfig.before_event.helper}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssignmentTiming("during_event")}
                          className={`rounded-lg border p-3 text-left transition-colors ${
                            assignmentTiming === "during_event"
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <p className="text-sm font-medium text-foreground">
                            {assignmentTimingConfig.during_event.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {assignmentTimingConfig.during_event.helper}
                          </p>
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Instructions Preview */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Instructions
                  </Label>
                  <ScrollArea className="h-[150px] rounded-lg border p-3">
                    <div className="text-sm text-muted-foreground space-y-1">
                      {selectedActivity.instructions.split("\n").map((step, i) => (
                        <p key={i}>{step}</p>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium text-foreground">
                  Selectionnez une activite
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cliquez sur une activite a gauche pour la configurer
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleAdd} disabled={!selectedActivity}>
            Ajouter a la seance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Activity Instructions Dialog
function ActivityInstructionsDialog({ activity }: { activity: Activity }) {
  const Icon = activity.icon ? iconMap[activity.icon] || BookOpen : BookOpen
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Eye className="h-4 w-4" />
          Instructions
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${categoryColors[activity.category]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{activity.name}</DialogTitle>
              <DialogDescription>
                {activityCategoryLabels[activity.category]} - {activity.defaultDuration} min
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4 py-4">
            <div>
              <h4 className="font-medium text-foreground mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">{activity.description}</p>
            </div>

            <Separator />

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

            {activity.materials && activity.materials.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium text-foreground mb-2">Materiel</h4>
                  <ul className="space-y-1">
                    {activity.materials.map((material, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {material}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const session = sessions.find((s) => s.id === id)
  const [sessionActivities, setSessionActivities] = useState<SessionActivity[]>(
    (session?.activities || []).map((a) => ({
      ...a,
      status: a.status || "pending",
      assignmentTiming: a.assignmentTiming || "before_event",
    }))
  )
  const [sessionDebate, setSessionDebate] = useState<SessionDebate | undefined>(session?.debate)
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(session?.status || "upcoming")
  const [sessionStartedAt, setSessionStartedAt] = useState<string | undefined>(session?.startedAt)
  const [randomAssignActivityId, setRandomAssignActivityId] = useState<string | null>(null)
  const [randomAssignTiming, setRandomAssignTiming] = useState<AssignmentTiming>("before_event")
  const [randomAssignCount, setRandomAssignCount] = useState<number>(1)
  const [rouletteRotation, setRouletteRotation] = useState<number>(0)
  const [rouletteSpinning, setRouletteSpinning] = useState<boolean>(false)
  const [roulettePickedMembers, setRoulettePickedMembers] = useState<User[]>([])
  const [rouletteFocusedMemberId, setRouletteFocusedMemberId] = useState<string | null>(null)
  const rouletteTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold text-foreground">Seance non trouvee</h1>
        <p className="text-muted-foreground">Cette seance n&apos;existe pas.</p>
        <Button asChild className="mt-4">
          <Link href="/sessions">Retour aux seances</Link>
        </Button>
      </div>
    )
  }

  const sessionDate = new Date(session.date)
  const config = statusConfig[sessionStatus]
  const StatusIcon = config.icon

  const availableActivities = activities.filter(
    (a) => !a.isArchived && !sessionActivities.find((sa) => sa.activity.id === a.id)
  )

  const totalDuration = sessionActivities.reduce((acc, sa) => acc + (sa.duration || sa.activity.defaultDuration), 0)

  const handleAddActivity = (activityId: string, duration: number, assignmentTiming: AssignmentTiming) => {
    const activity = activities.find(a => a.id === activityId)
    if (!activity) return
    
    const newSessionActivity: SessionActivity = {
      id: `sa-new-${Date.now()}`,
      sessionId: session.id,
      activity,
      orderIndex: sessionActivities.length + 1,
      duration,
      assignmentTiming,
      assignments: [],
      status: "pending",
    }
    
    setSessionActivities([...sessionActivities, newSessionActivity])
  }

  const handleRemoveActivity = (sessionActivityId: string) => {
    setSessionActivities(sessionActivities.filter(sa => sa.id !== sessionActivityId))
  }

  const getEligibleMembersForActivity = (sessionActivityId: string) => {
    const targetActivity = sessionActivities.find((sa) => sa.id === sessionActivityId)
    if (!targetActivity) return []

    const alreadyAssignedIds = new Set(
      targetActivity.assignments.map((assignment) => assignment.user.id)
    )
    return users.filter(
      (candidate) =>
        candidate.role === "member" &&
        session.attendees.some(
          (attendance) =>
            attendance.user.id === candidate.id &&
            (attendance.status === "declared" || attendance.status === "confirmed")
        ) &&
        !alreadyAssignedIds.has(candidate.id)
    )
  }

  const handleAutoAssignMembers = (
    sessionActivityId: string,
    timing: AssignmentTiming,
    selectedCount?: number,
    preselectedMembers?: User[]
  ) => {
    const targetActivity = sessionActivities.find((sa) => sa.id === sessionActivityId)
    if (!targetActivity) return

    const requiredCount = targetActivity.activity.membersRequired
    if (requiredCount <= 0) return

    const eligibleMembers = getEligibleMembersForActivity(sessionActivityId)

    if (eligibleMembers.length === 0) return

    const countToSelect = Math.max(
      1,
      Math.min(selectedCount ?? requiredCount, eligibleMembers.length)
    )

    const eligibleMemberIds = new Set(eligibleMembers.map((member) => member.id))
    const safePreselected = (preselectedMembers || [])
      .filter((member, index, all) => {
        if (!eligibleMemberIds.has(member.id)) return false
        return all.findIndex((item) => item.id === member.id) === index
      })
      .slice(0, countToSelect)

    const membersNeeded = countToSelect - safePreselected.length
    const remainingMembers = eligibleMembers.filter(
      (candidate) => !safePreselected.some((selected) => selected.id === candidate.id)
    )
    const randomFallback = shuffleUsers(remainingMembers).slice(0, Math.max(0, membersNeeded))
    const selectedMembers = [...safePreselected, ...randomFallback]

    if (selectedMembers.length === 0) return

    const assignedAt = new Date().toISOString()
    const newAssignments = selectedMembers.map((member, index) => ({
      id: `aa-${sessionActivityId}-${Date.now()}-${index}`,
      sessionActivityId,
      user: member,
      assignmentType: timing === "during_event" ? "manual" : "automatic",
      assignedBy: user?.id || "1",
      assignedAt,
    }))

    setSessionActivities((prev) =>
      prev.map((sa) => (sa.id === sessionActivityId ? { ...sa, assignments: newAssignments } : sa))
    )
  }

  const clearRouletteTimeouts = () => {
    rouletteTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
    rouletteTimeoutsRef.current = []
  }

  const resetRouletteState = () => {
    clearRouletteTimeouts()
    setRouletteRotation(0)
    setRouletteSpinning(false)
    setRoulettePickedMembers([])
    setRouletteFocusedMemberId(null)
  }

  const openRandomAssignDialog = (sessionActivityId: string, timing: AssignmentTiming) => {
    const targetActivity = sessionActivities.find((sa) => sa.id === sessionActivityId)
    if (!targetActivity) return

    const eligibleMembers = getEligibleMembersForActivity(sessionActivityId)
    if (eligibleMembers.length === 0) return

    const defaultCount = Math.min(targetActivity.activity.membersRequired, eligibleMembers.length)
    resetRouletteState()
    setRandomAssignActivityId(sessionActivityId)
    setRandomAssignTiming(timing)
    setRandomAssignCount(Math.max(1, defaultCount))
  }

  const closeRandomAssignDialog = () => {
    resetRouletteState()
    setRandomAssignActivityId(null)
  }

  const handleConfigureDebate = (topicId: string, participantsCount: number, selectedMembers: User[]) => {
    const topic = debateTopics.find(t => t.id === topicId)
    if (!topic) return

    const newDebate: SessionDebate = {
      id: `sd-${Date.now()}`,
      sessionId: session.id,
      topic,
      participantsCount,
      selectedMembers,
      selectedAt: new Date().toISOString(),
      selectedBy: "1",
      status: "selected",
    }
    setSessionDebate(newDebate)
  }

  // Get available members for debate (those who declared attendance)
  const availableMembersForDebate = users.filter(u => 
    session.attendees.some(a => a.user.id === u.id && (a.status === "declared" || a.status === "confirmed"))
  )

  const randomAssignTarget = randomAssignActivityId
    ? sessionActivities.find((sa) => sa.id === randomAssignActivityId)
    : undefined
  const randomAssignEligibleMembers = randomAssignActivityId
    ? getEligibleMembersForActivity(randomAssignActivityId)
    : []
  const maxRandomAssignCount = randomAssignEligibleMembers.length
  const safeRandomAssignCount =
    maxRandomAssignCount > 0 ? Math.max(1, Math.min(randomAssignCount, maxRandomAssignCount)) : 0
  const rouletteSegmentAngle = maxRandomAssignCount > 0 ? 360 / maxRandomAssignCount : 0
  const rouletteIsReadyToAssign =
    safeRandomAssignCount > 0 && roulettePickedMembers.length === safeRandomAssignCount && !rouletteSpinning

  const handleLaunchRoulette = () => {
    if (!randomAssignActivityId || safeRandomAssignCount === 0 || rouletteSpinning) return

    const winners = shuffleUsers(randomAssignEligibleMembers).slice(0, safeRandomAssignCount)
    if (winners.length === 0) return

    clearRouletteTimeouts()
    setRouletteSpinning(true)
    setRoulettePickedMembers([])
    setRouletteFocusedMemberId(null)

    const spinRound = (roundIndex: number, currentRotation: number) => {
      const winner = winners[roundIndex]
      const winnerIndex = randomAssignEligibleMembers.findIndex((member) => member.id === winner.id)
      if (winnerIndex === -1) {
        setRouletteSpinning(false)
        return
      }

      const currentNormalized = normalizeAngle(currentRotation)
      const winnerAngle = normalizeAngle(360 - winnerIndex * rouletteSegmentAngle)
      let offset = winnerAngle - currentNormalized
      if (offset < 0) offset += 360

      const nextRotation = currentRotation + 5 * 360 + offset
      setRouletteFocusedMemberId(null)
      setRouletteRotation(nextRotation)

      const settleTimeout = setTimeout(() => {
        setRouletteFocusedMemberId(winner.id)
        setRoulettePickedMembers((prev) => [...prev, winner])

        if (roundIndex === winners.length - 1) {
          setRouletteSpinning(false)
          return
        }

        const pauseTimeout = setTimeout(() => {
          spinRound(roundIndex + 1, nextRotation)
        }, 700)
        rouletteTimeoutsRef.current.push(pauseTimeout)
      }, 3200)

      rouletteTimeoutsRef.current.push(settleTimeout)
    }

    spinRound(0, rouletteRotation)
  }

  const handleConfirmRouletteAssignment = () => {
    if (!randomAssignActivityId || !rouletteIsReadyToAssign) return
    handleAutoAssignMembers(
      randomAssignActivityId,
      randomAssignTiming,
      safeRandomAssignCount,
      roulettePickedMembers
    )
    closeRandomAssignDialog()
  }

  useEffect(() => {
    return () => {
      clearRouletteTimeouts()
    }
  }, [])

  // Session control handlers
  const handleStartSession = () => {
    setSessionStatus("ongoing")
    setSessionStartedAt(new Date().toISOString())
    // Start the first activity automatically
    if (sessionActivities.length > 0) {
      setSessionActivities(prev => prev.map((a, i) => 
        i === 0 
          ? { ...a, status: "in_progress" as SessionActivityStatus, startedAt: new Date().toISOString() }
          : a
      ))
    }
  }

  const handleEndSession = () => {
    setSessionStatus("completed")
    // Mark all remaining activities as completed or skipped
    setSessionActivities(prev => prev.map(a => ({
      ...a,
      status: a.status === "in_progress" ? "completed" : a.status === "pending" ? "skipped" : a.status,
      completedAt: a.status === "in_progress" ? new Date().toISOString() : a.completedAt
    } as SessionActivity)))
  }

  const handleStartActivity = (activityId: string) => {
    setSessionActivities(prev => prev.map(a => ({
      ...a,
      status: a.id === activityId ? "in_progress" : a.status,
      startedAt: a.id === activityId ? new Date().toISOString() : a.startedAt
    } as SessionActivity)))
  }

  const handleCompleteActivity = (activityId: string) => {
    const currentIndex = sessionActivities.findIndex(a => a.id === activityId)
    setSessionActivities(prev => prev.map((a, i) => {
      if (a.id === activityId) {
        return { ...a, status: "completed" as SessionActivityStatus, completedAt: new Date().toISOString() }
      }
      // Auto-start next activity
      if (i === currentIndex + 1 && a.status === "pending") {
        return { ...a, status: "in_progress" as SessionActivityStatus, startedAt: new Date().toISOString() }
      }
      return a
    }))
  }

  const handleSkipActivity = (activityId: string) => {
    const currentIndex = sessionActivities.findIndex(a => a.id === activityId)
    setSessionActivities(prev => prev.map((a, i) => {
      if (a.id === activityId) {
        return { ...a, status: "skipped" as SessionActivityStatus }
      }
      // Auto-start next activity if current was in progress
      if (i === currentIndex + 1 && sessionActivities[currentIndex].status === "in_progress" && a.status === "pending") {
        return { ...a, status: "in_progress" as SessionActivityStatus, startedAt: new Date().toISOString() }
      }
      return a
    }))
  }

  // Get current activity
  const currentActivity = sessionActivities.find(a => a.status === "in_progress")
  const completedActivities = sessionActivities.filter(a => a.status === "completed").length
  const isAllActivitiesCompleted = sessionActivities.every(a => a.status === "completed" || a.status === "skipped")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/sessions">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  Seance du{" "}
                  {sessionDate.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h1>
                <Badge variant={config.variant} className="gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {session.startTime} - {session.endTime}
              </p>
            </div>
            <div className="flex gap-2">
              {sessionStatus === "upcoming" && (
                <>
                  <Button variant="outline">Modifier</Button>
                  <Button 
                    onClick={handleStartSession}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Demarrer la seance
                  </Button>
                </>
              )}
              {sessionStatus === "ongoing" && (
                <Button 
                  onClick={handleEndSession}
                  variant="destructive"
                  className="gap-2"
                >
                  <StopCircle className="h-4 w-4" />
                  Terminer la seance
                </Button>
              )}
              {sessionStatus === "completed" && (
                <Badge variant="secondary" className="h-9 px-4 text-sm">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Seance terminee
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live Session Banner */}
      {sessionStatus === "ongoing" && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500 animate-ping" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Seance en cours</p>
                <p className="text-sm text-muted-foreground">
                  Demarree a {sessionStartedAt ? new Date(sessionStartedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                  {currentActivity && (
                    <span className="ml-2">
                      - Activite {sessionActivities.findIndex(a => a.id === currentActivity.id) + 1}/{sessionActivities.length}: {currentActivity.activity.name}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {completedActivities}/{sessionActivities.length} activites
              </Badge>
              {isAllActivitiesCompleted && (
                <Button onClick={handleEndSession} size="sm" variant="outline" className="gap-2">
                  <StopCircle className="h-4 w-4" />
                  Terminer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-semibold text-foreground">
                {sessionDate.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-accent/10 p-2">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Participants</p>
              <p className="font-semibold text-foreground">
                {session.attendees.filter((a) => a.status === "declared" || a.status === "confirmed").length}{" "}
                inscrits
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-chart-3/10 p-2">
              <BookOpen className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Activites</p>
              <p className="font-semibold text-foreground">{sessionActivities.length} prevues</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-chart-4/10 p-2">
              <Clock className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duree totale</p>
              <p className="font-semibold text-foreground">{totalDuration} min</p>
            </div>
          </CardContent>
        </Card>
        <Card className={sessionDebate ? "border-primary/30 bg-primary/5" : ""}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`rounded-lg p-2 ${sessionDebate ? "bg-primary/10" : "bg-muted"}`}>
              <MessageCircle className={`h-5 w-5 ${sessionDebate ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Debat</p>
              <p className="font-semibold text-foreground">
                {sessionDebate ? `${sessionDebate.selectedMembers.length} debatteurs` : "Non configure"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activities">
        <TabsList>
          <TabsTrigger value="activities">Activites</TabsTrigger>
          <TabsTrigger value="debate" className="gap-1">
            <MessageCircle className="h-4 w-4" />
            Debat
          </TabsTrigger>
          <TabsTrigger value="attendance">Presences</TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Programme de la seance</h2>
            {availableActivities.length > 0 && sessionStatus === "upcoming" && (
              <AddActivityDialog 
                availableActivities={availableActivities}
                onAdd={handleAddActivity}
              />
            )}
          </div>

          {sessionActivities.length > 0 ? (
            <div className="space-y-4">
              {sessionActivities.map((sessionActivity, index) => {
                const Icon = sessionActivity.activity.icon 
                  ? iconMap[sessionActivity.activity.icon] || BookOpen 
                  : BookOpen
                const activityStatusCfg = activityStatusConfig[sessionActivity.status]
                const ActivityStatusIcon = activityStatusCfg.icon
                const isInProgress = sessionActivity.status === "in_progress"
                const isCompleted = sessionActivity.status === "completed"
                const isSkipped = sessionActivity.status === "skipped"
                const isPending = sessionActivity.status === "pending"
                
                return (
                  <Card 
                    key={sessionActivity.id}
                    className={`transition-all ${
                      isInProgress 
                        ? "border-primary/50 bg-primary/5 ring-2 ring-primary/20" 
                        : isCompleted 
                          ? "border-green-500/30 bg-green-500/5" 
                          : isSkipped
                            ? "opacity-60"
                            : ""
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {sessionStatus === "upcoming" && (
                              <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                            )}
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                              isInProgress 
                                ? "bg-primary text-primary-foreground" 
                                : isCompleted 
                                  ? "bg-green-500 text-white" 
                                  : "bg-primary/10 text-primary"
                            }`}>
                              {isCompleted ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : isInProgress ? (
                                <PlayCircle className="h-5 w-5" />
                              ) : (
                                index + 1
                              )}
                            </div>
                          </div>
                          <div className={`rounded-lg p-2 ${categoryColors[sessionActivity.activity.category]}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">{sessionActivity.activity.name}</CardTitle>
                              <Badge 
                                variant={activityStatusCfg.variant} 
                                className={`text-xs ${isInProgress ? "animate-pulse" : ""}`}
                              >
                                <ActivityStatusIcon className="mr-1 h-3 w-3" />
                                {activityStatusCfg.label}
                              </Badge>
                            </div>
                            <CardDescription className="flex items-center gap-2">
                              <span>{activityCategoryLabels[sessionActivity.activity.category]}</span>
                              <span className="text-primary font-medium">
                                {sessionActivity.duration || sessionActivity.activity.defaultDuration} min
                              </span>
                              {sessionActivity.startedAt && (
                                <span className="text-xs text-muted-foreground">
                                  - Demarre a {new Date(sessionActivity.startedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Activity control buttons for ongoing session */}
                          {sessionStatus === "ongoing" && (
                            <>
                              {isPending && !currentActivity && (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleStartActivity(sessionActivity.id)}
                                  className="gap-1 bg-green-600 hover:bg-green-700"
                                >
                                  <Play className="h-4 w-4" />
                                  Demarrer
                                </Button>
                              )}
                              {isInProgress && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleSkipActivity(sessionActivity.id)}
                                    className="gap-1"
                                  >
                                    <SkipForward className="h-4 w-4" />
                                    Passer
                                  </Button>
                                  <Button 
                                    size="sm"
                                    onClick={() => handleCompleteActivity(sessionActivity.id)}
                                    className="gap-1 bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Terminer
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                          <ActivityInstructionsDialog activity={sessionActivity.activity} />
                          {sessionStatus === "upcoming" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Settings2 className="mr-2 h-4 w-4" />
                                  Modifier la duree
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Shuffle className="mr-2 h-4 w-4" />
                                  Selection automatique
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Selection manuelle
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleRemoveActivity(sessionActivity.id)}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Retirer de la seance
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {sessionActivity.activity.description}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">
                            <Users className="mr-1 h-3 w-3" />
                            {sessionActivity.activity.membersRequired} membre(s) requis
                          </Badge>
                          <Badge variant={sessionActivity.assignmentTiming === "during_event" ? "secondary" : "outline"}>
                            <Clock className="mr-1 h-3 w-3" />
                            {assignmentTimingConfig[sessionActivity.assignmentTiming].label}
                          </Badge>
                          {sessionActivity.activity.requiresTopic && (
                            <Badge variant="secondary">Sujet requis</Badge>
                          )}
                          {sessionActivity.topic && (
                            <Badge variant="default">
                              Sujet: {sessionActivity.topic.title}
                            </Badge>
                          )}
                        </div>

                        {sessionActivity.assignments.length > 0 && (
                          <div className="mt-4">
                            <p className="mb-2 text-sm font-medium text-foreground">Membres assignes</p>
                            <div className="flex flex-wrap gap-2">
                              {sessionActivity.assignments.map((assignment) => (
                                <div
                                  key={assignment.id}
                                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5"
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={assignment.user.photoUrl} />
                                    <AvatarFallback className="text-xs">
                                      {assignment.user.firstName[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm text-foreground">
                                    {assignment.user.firstName} {assignment.user.lastName}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {assignment.assignmentType}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {sessionActivity.assignments.length === 0 && sessionActivity.activity.membersRequired > 0 && (
                          <div className="rounded-lg border border-dashed border-border p-4 text-center">
                            <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
                            {sessionActivity.assignmentTiming === "during_event" ? (
                              <>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  La selection est prevue pendant l&apos;evenement.
                                </p>
                                {sessionStatus === "ongoing" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() =>
                                      openRandomAssignDialog(sessionActivity.id, "during_event")
                                    }
                                  >
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Selectionner maintenant
                                  </Button>
                                ) : (
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    L&apos;admin fera la selection au cours de l&apos;evenement.
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  Aucun membre assigne
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-2"
                                  onClick={() =>
                                    openRandomAssignDialog(sessionActivity.id, "before_event")
                                  }
                                >
                                  <Shuffle className="mr-2 h-4 w-4" />
                                  Selectionner maintenant
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {/* Total Duration Summary */}
              <Card className="bg-muted/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">Duree totale du programme</span>
                  </div>
                  <Badge variant="outline" className="text-lg font-bold">
                    {totalDuration} minutes
                  </Badge>
                </CardContent>
              </Card>

              {/* Debate Section Preview */}
              <Separator className="my-4" />
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Debat de fin de seance</h3>
                <Badge variant="secondary" className="ml-auto">Apres les activites</Badge>
              </div>

              {sessionDebate ? (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <MessageCircle className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{sessionDebate.topic.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-xs ${levelColors[sessionDebate.topic.level]}`}>
                              {levelLabels[sessionDebate.topic.level]}
                            </Badge>
                            <span>{sessionDebate.participantsCount} participants</span>
                          </CardDescription>
                        </div>
                      </div>
                      {sessionStatus === "upcoming" && (
                        <ConfigureDebateDialog
                          availableTopics={debateTopics}
                          availableMembers={availableMembersForDebate.length > 0 ? availableMembersForDebate : users.filter(u => u.role === "member")}
                          currentDebate={sessionDebate}
                          onConfigure={handleConfigureDebate}
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {sessionDebate.topic.description}
                    </p>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Membres selectionnes pour le debat:</p>
                      <div className="flex flex-wrap gap-2">
                        {sessionDebate.selectedMembers.map((member, index) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5"
                          >
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {index + 1}
                            </div>
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={member.photoUrl} />
                              <AvatarFallback className="text-xs">
                                {member.firstName[0]}{member.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-foreground">
                              {member.firstName} {member.lastName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <MessageCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-foreground">Aucun debat configure</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Ajoutez un sujet de debat pour cette seance
                    </p>
                    {sessionStatus === "upcoming" && (
                      <ConfigureDebateDialog
                        availableTopics={debateTopics}
                        availableMembers={availableMembersForDebate.length > 0 ? availableMembersForDebate : users.filter(u => u.role === "member")}
                        onConfigure={handleConfigureDebate}
                      />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium text-foreground">Aucune activite planifiee</p>
                <p className="text-xs text-muted-foreground">
                  Ajoutez des activites pour cette seance
                </p>
                {sessionStatus === "upcoming" && (
                  <AddActivityDialog 
                    availableActivities={availableActivities}
                    onAdd={handleAddActivity}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="debate" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Sujet de debat</h2>
            {sessionStatus === "upcoming" && (
              <ConfigureDebateDialog
                availableTopics={debateTopics}
                availableMembers={availableMembersForDebate.length > 0 ? availableMembersForDebate : users.filter(u => u.role === "member")}
                currentDebate={sessionDebate}
                onConfigure={handleConfigureDebate}
              />
            )}
          </div>

          {sessionDebate ? (
            <div className="space-y-6">
              {/* Debate Topic Card */}
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-primary/10 p-3">
                      <MessageCircle className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl">{sessionDebate.topic.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {sessionDebate.topic.description}
                      </CardDescription>
                      <div className="flex items-center gap-3 mt-3">
                        <Badge variant="outline" className={levelColors[sessionDebate.topic.level]}>
                          {levelLabels[sessionDebate.topic.level]}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Utilise {sessionDebate.topic.usageCount} fois
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Debate Participants */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Participants au debat ({sessionDebate.selectedMembers.length})
                    </CardTitle>
                    {sessionStatus === "upcoming" && (
                      <Button variant="outline" size="sm" onClick={() => {
                        const available = (availableMembersForDebate.length > 0 ? availableMembersForDebate : users.filter(u => u.role === "member"))
                          .filter(m => !sessionDebate.selectedMembers.some(sm => sm.id === m.id))
                        const shuffled = [...available].sort(() => Math.random() - 0.5)
                        const newMember = shuffled[0]
                        if (newMember) {
                          handleConfigureDebate(
                            sessionDebate.topic.id,
                            sessionDebate.participantsCount + 1,
                            [...sessionDebate.selectedMembers, newMember]
                          )
                        }
                      }}>
                        <Shuffle className="mr-2 h-4 w-4" />
                        Ajouter aleatoirement
                      </Button>
                    )}
                  </div>
                  <CardDescription>
                    Membres selectionnes pour developper ce sujet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {sessionDebate.selectedMembers.map((member, index) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                          {index + 1}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.photoUrl} />
                          <AvatarFallback>
                            {member.firstName[0]}{member.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            @{member.pseudo}
                          </p>
                        </div>
                        <Badge variant="outline" className={levelColors[member.englishLevel]}>
                          {levelLabels[member.englishLevel]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Debate Guidelines */}
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Deroulement du debat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">1</span>
                      Le moderateur presente le sujet et les regles du debat (2 min)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">2</span>
                      Chaque participant developpe sa position (3-5 min par personne)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">3</span>
                      Phase de questions et reponses entre participants (10 min)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">4</span>
                      Ouverture au public pour questions et commentaires (5 min)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">5</span>
                      Conclusion et synthese par le moderateur (2 min)
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <MessageCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-foreground">Aucun debat configure</p>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                  Configurez un sujet de debat pour cette seance. Les membres selectionnes developperont le sujet apres les activites.
                </p>
                {sessionStatus === "upcoming" && (
                  <ConfigureDebateDialog
                    availableTopics={debateTopics}
                    availableMembers={availableMembersForDebate.length > 0 ? availableMembersForDebate : users.filter(u => u.role === "member")}
                    onConfigure={handleConfigureDebate}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Liste des presences</h2>
            {sessionStatus === "ongoing" && (
              <Button>
                <CheckCircle className="mr-2 h-4 w-4" />
                Valider les presences
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membre</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="hidden md:table-cell">Declare le</TableHead>
                    <TableHead className="hidden md:table-cell">Confirme le</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {session.attendees.length > 0 ? (
                    session.attendees.map((attendance) => {
                      const statusCfg = attendanceStatusConfig[attendance.status]
                      const AttendanceIcon = statusCfg.icon

                      return (
                        <TableRow key={attendance.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={attendance.user.photoUrl} />
                                <AvatarFallback>
                                  {attendance.user.firstName[0]}
                                  {attendance.user.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">
                                  {attendance.user.firstName} {attendance.user.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  @{attendance.user.pseudo}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusCfg.variant} className="gap-1">
                              <AttendanceIcon className="h-3 w-3" />
                              {statusCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {attendance.declaredAt ? (
                              <span className="text-sm text-muted-foreground">
                                {new Date(attendance.declaredAt).toLocaleDateString("fr-FR")}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {attendance.confirmedAt ? (
                              <span className="text-sm text-muted-foreground">
                                {new Date(attendance.confirmedAt).toLocaleDateString("fr-FR")}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
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
                                <DropdownMenuItem>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Confirmer present
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Marquer absent
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <AlertCircle className="mr-2 h-4 w-4" />
                                  Marquer excuse
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Users className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Aucun participant pour cette seance
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={randomAssignActivityId !== null}
        onOpenChange={(open) => {
          if (!open) closeRandomAssignDialog()
        }}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Selection aleatoire des membres</DialogTitle>
            <DialogDescription>
              L&apos;admin choisit le nombre de membres puis lance une roulette qui tourne avec les noms.
            </DialogDescription>
          </DialogHeader>

          {randomAssignTarget ? (
            <div className="space-y-4 py-1">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium text-foreground">
                  {randomAssignTarget.activity.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Mode: {assignmentTimingConfig[randomAssignTiming].label}
                </p>
                <p className="text-xs text-muted-foreground">
                  Membres disponibles: {maxRandomAssignCount}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="random-assignment-count">
                  Nombre de membres a selectionner
                </Label>
                <Input
                  id="random-assignment-count"
                  type="number"
                  min={1}
                  max={Math.max(1, maxRandomAssignCount)}
                  value={randomAssignCount}
                  onChange={(e) => {
                    const parsed = Number(e.target.value)
                    if (Number.isNaN(parsed)) return
                    const clamped = Math.min(Math.max(1, parsed), Math.max(1, maxRandomAssignCount))
                    setRandomAssignCount(clamped)
                    setRoulettePickedMembers([])
                    setRouletteFocusedMemberId(null)
                    setRouletteRotation(0)
                  }}
                  disabled={rouletteSpinning}
                />
                <Slider
                  value={[randomAssignCount]}
                  onValueChange={(value) => {
                    const nextCount = value[0]
                    setRandomAssignCount(nextCount)
                    setRoulettePickedMembers([])
                    setRouletteFocusedMemberId(null)
                    setRouletteRotation(0)
                  }}
                  min={1}
                  max={Math.max(1, maxRandomAssignCount)}
                  step={1}
                  disabled={rouletteSpinning || maxRandomAssignCount <= 1}
                />
              </div>

              <div className="space-y-2">
                <Label>Roulette des membres</Label>
                <div className="flex justify-center">
                  <div className="relative h-60 w-60">
                    <div className="absolute left-1/2 top-1 z-30 h-0 w-0 -translate-x-1/2 border-l-[10px] border-r-[10px] border-b-[16px] border-l-transparent border-r-transparent border-b-destructive" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary/40 bg-gradient-to-b from-muted to-muted/60 shadow-inner">
                      <div className="absolute inset-2 rounded-full border border-dashed border-border/70" />
                      <div
                        className="absolute inset-0 transition-transform duration-[3200ms] ease-[cubic-bezier(0.18,0.82,0.16,1)]"
                        style={{ transform: `rotate(${rouletteRotation}deg)` }}
                      >
                        {randomAssignEligibleMembers.map((member, index) => {
                          const segmentAngle = index * rouletteSegmentAngle
                          const isPicked = roulettePickedMembers.some((picked) => picked.id === member.id)
                          const isFocused = rouletteFocusedMemberId === member.id

                          return (
                            <div
                              key={member.id}
                              className={`absolute left-1/2 top-1/2 w-24 -translate-x-1/2 -translate-y-1/2 rounded-md border px-1.5 py-0.5 text-center text-[9px] font-medium leading-tight shadow-sm ${
                                isFocused
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : isPicked
                                    ? "border-emerald-600 bg-emerald-100 text-emerald-900"
                                    : "border-border bg-card/90 text-foreground"
                              }`}
                              style={{
                                transform: `rotate(${segmentAngle}deg) translateY(-98px) rotate(${-segmentAngle}deg)`,
                              }}
                            >
                              {formatMemberName(member)}
                            </div>
                          )
                        })}
                      </div>
                      <div className="absolute left-1/2 top-1/2 z-20 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background bg-card text-[10px] font-semibold shadow">
                        GO
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  {rouletteSpinning
                    ? "La roulette tourne. Attendez l'arret pour voir les membres selectionnes."
                    : rouletteIsReadyToAssign
                      ? "Roulette terminee. Validez pour attribuer ces membres."
                      : "Cliquez sur \"Lancer la roulette\" pour demarrer la selection."}
                </p>
              </div>

              {roulettePickedMembers.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-sm font-medium text-foreground">
                    Membres tires ({roulettePickedMembers.length}/{safeRandomAssignCount})
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {roulettePickedMembers.map((member) => (
                      <Badge key={member.id} variant="secondary">
                        {formatMemberName(member)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">Activite introuvable.</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeRandomAssignDialog}>
              Annuler
            </Button>
            {roulettePickedMembers.length > 0 && !rouletteSpinning && (
              <Button
                variant="secondary"
                onClick={handleLaunchRoulette}
                disabled={!randomAssignActivityId || safeRandomAssignCount === 0}
              >
                Relancer la roulette
              </Button>
            )}
            <Button
              onClick={rouletteIsReadyToAssign ? handleConfirmRouletteAssignment : handleLaunchRoulette}
              disabled={!randomAssignActivityId || safeRandomAssignCount === 0 || rouletteSpinning}
            >
              {rouletteSpinning
                ? "Roulette en cours..."
                : rouletteIsReadyToAssign
                  ? "Attribuer les membres tires"
                  : "Lancer la roulette"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
