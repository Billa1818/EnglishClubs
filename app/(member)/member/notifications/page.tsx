"use client"

import { useState } from "react"
import {
  Bell,
  Calendar,
  Clock,
  Users,
  GraduationCap,
  CheckCircle2,
  Trash2,
  CheckCheck,
  Settings,
  BookOpen,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/lib/auth-context"
import { notifications as mockNotifications } from "@/lib/mock-data"

// Member-specific notifications
const memberNotifications = [
  {
    id: "mn1",
    userId: "2",
    type: "session_reminder",
    title: "Rappel de seance",
    body: "La prochaine seance aura lieu demain a 18h00. N&apos;oubliez pas de confirmer votre presence !",
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "mn2",
    userId: "2",
    type: "activity_assignment",
    title: "Nouvelle activite assignee",
    body: "Vous avez ete selectionne pour l&apos;activite &apos;Presentation orale&apos; lors de la prochaine seance.",
    isRead: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "mn3",
    userId: "2",
    type: "absence_result",
    title: "Demande d&apos;absence approuvee",
    body: "Votre demande d&apos;absence pour la seance du 15 janvier a ete approuvee.",
    isRead: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "mn4",
    userId: "2",
    type: "fcc_reminder",
    title: "Rappel FreeCodeCamp",
    body: "Vous n&apos;avez pas mis a jour votre progression FreeCodeCamp depuis 7 jours.",
    isRead: true,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "mn5",
    userId: "2",
    type: "new_session",
    title: "Nouvelle seance planifiee",
    body: "Une nouvelle seance a ete planifiee pour le samedi 20 janvier a 18h00.",
    isRead: true,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export default function MemberNotificationsPage() {
  const { user } = useAuth()
  const [notificationsList, setNotificationsList] = useState(memberNotifications)
  const [activeTab, setActiveTab] = useState("all")

  // Notification preferences
  const [preferences, setPreferences] = useState({
    session_reminder: { inApp: true, email: true },
    activity_assignment: { inApp: true, email: true },
    absence_result: { inApp: true, email: true },
    fcc_reminder: { inApp: true, email: false },
    new_session: { inApp: true, email: true },
  })

  if (!user) return null

  const unreadCount = notificationsList.filter(n => !n.isRead).length
  const filteredNotifications = activeTab === "unread" 
    ? notificationsList.filter(n => !n.isRead)
    : notificationsList

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "session_reminder":
        return <Calendar className="h-5 w-5 text-blue-500" />
      case "activity_assignment":
        return <BookOpen className="h-5 w-5 text-green-500" />
      case "absence_result":
        return <Clock className="h-5 w-5 text-amber-500" />
      case "fcc_reminder":
        return <GraduationCap className="h-5 w-5 text-purple-500" />
      case "new_session":
        return <Calendar className="h-5 w-5 text-primary" />
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />
    }
  }

  const handleMarkAsRead = (id: string) => {
    setNotificationsList(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    )
  }

  const handleMarkAllAsRead = () => {
    setNotificationsList(prev => 
      prev.map(n => ({ ...n, isRead: true }))
    )
  }

  const handleDelete = (id: string) => {
    setNotificationsList(prev => prev.filter(n => n.id !== id))
  }

  const handleClearAll = () => {
    setNotificationsList([])
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return "A l&apos;instant"
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  }

  const togglePreference = (type: string, channel: "inApp" | "email") => {
    setPreferences(prev => ({
      ...prev,
      [type]: {
        ...prev[type as keyof typeof prev],
        [channel]: !prev[type as keyof typeof prev][channel]
      }
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 
              ? `Vous avez ${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
              : "Toutes vos notifications sont lues"
            }
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Tout marquer comme lu
            </Button>
          )}
          {notificationsList.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Tout effacer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Effacer toutes les notifications ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irreversible. Toutes vos notifications seront supprimees.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll}>
                    Effacer tout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Toutes ({notificationsList.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Non lues ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <NotificationList 
            notifications={filteredNotifications}
            getNotificationIcon={getNotificationIcon}
            formatDate={formatDate}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="unread" className="mt-6">
          <NotificationList 
            notifications={filteredNotifications}
            getNotificationIcon={getNotificationIcon}
            formatDate={formatDate}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferences de notification</CardTitle>
              <CardDescription>
                Choisissez comment vous souhaitez etre notifie
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <PreferenceRow
                  icon={<Calendar className="h-5 w-5 text-blue-500" />}
                  title="Rappel de seance"
                  description="Notification avant chaque seance"
                  inApp={preferences.session_reminder.inApp}
                  email={preferences.session_reminder.email}
                  onToggleInApp={() => togglePreference("session_reminder", "inApp")}
                  onToggleEmail={() => togglePreference("session_reminder", "email")}
                />
                <Separator />
                <PreferenceRow
                  icon={<BookOpen className="h-5 w-5 text-green-500" />}
                  title="Activite assignee"
                  description="Quand vous etes selectionne pour une activite"
                  inApp={preferences.activity_assignment.inApp}
                  email={preferences.activity_assignment.email}
                  onToggleInApp={() => togglePreference("activity_assignment", "inApp")}
                  onToggleEmail={() => togglePreference("activity_assignment", "email")}
                />
                <Separator />
                <PreferenceRow
                  icon={<Clock className="h-5 w-5 text-amber-500" />}
                  title="Resultat d&apos;absence"
                  description="Quand votre demande d&apos;absence est traitee"
                  inApp={preferences.absence_result.inApp}
                  email={preferences.absence_result.email}
                  onToggleInApp={() => togglePreference("absence_result", "inApp")}
                  onToggleEmail={() => togglePreference("absence_result", "email")}
                />
                <Separator />
                <PreferenceRow
                  icon={<GraduationCap className="h-5 w-5 text-purple-500" />}
                  title="Rappel FreeCodeCamp"
                  description="Rappel pour mettre a jour votre progression"
                  inApp={preferences.fcc_reminder.inApp}
                  email={preferences.fcc_reminder.email}
                  onToggleInApp={() => togglePreference("fcc_reminder", "inApp")}
                  onToggleEmail={() => togglePreference("fcc_reminder", "email")}
                />
                <Separator />
                <PreferenceRow
                  icon={<Calendar className="h-5 w-5 text-primary" />}
                  title="Nouvelle seance"
                  description="Quand une nouvelle seance est planifiee"
                  inApp={preferences.new_session.inApp}
                  email={preferences.new_session.email}
                  onToggleInApp={() => togglePreference("new_session", "inApp")}
                  onToggleEmail={() => togglePreference("new_session", "email")}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NotificationList({
  notifications,
  getNotificationIcon,
  formatDate,
  onMarkAsRead,
  onDelete,
}: {
  notifications: typeof memberNotifications
  getNotificationIcon: (type: string) => React.ReactNode
  formatDate: (date: string) => string
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bell className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-center text-muted-foreground">
            Aucune notification
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start gap-4 p-4 ${
                !notification.isRead ? "bg-primary/5" : ""
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`font-medium ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.body}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <Badge className="bg-primary text-primary-foreground flex-shrink-0">
                      Nouveau
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(notification.createdAt)}
                  </span>
                  {!notification.isRead && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-auto p-0 text-xs"
                      onClick={() => onMarkAsRead(notification.id)}
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Marquer comme lu
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-auto p-0 text-xs text-destructive hover:text-destructive"
                    onClick={() => onDelete(notification.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Supprimer
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function PreferenceRow({
  icon,
  title,
  description,
  inApp,
  email,
  onToggleInApp,
  onToggleEmail,
}: {
  icon: React.ReactNode
  title: string
  description: string
  inApp: boolean
  email: boolean
  onToggleInApp: () => void
  onToggleEmail: () => void
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted flex-shrink-0">
          {icon}
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-6 ml-13 sm:ml-0">
        <div className="flex items-center gap-2">
          <Switch id={`${title}-inapp`} checked={inApp} onCheckedChange={onToggleInApp} />
          <Label htmlFor={`${title}-inapp`} className="text-sm">In-app</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id={`${title}-email`} checked={email} onCheckedChange={onToggleEmail} />
          <Label htmlFor={`${title}-email`} className="text-sm">Email</Label>
        </div>
      </div>
    </div>
  )
}
