"use client"

import { useState } from "react"
import {
  Bell,
  CheckCheck,
  Clock,
  Calendar,
  UserPlus,
  MessageSquare,
  GraduationCap,
  Settings,
  Trash2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { notifications } from "@/lib/mock-data"
import type { Notification } from "@/lib/types"

const notificationTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  absence_request: {
    icon: Clock,
    color: "bg-chart-4/10 text-chart-4",
    label: "Demande d'absence",
  },
  membership_request: {
    icon: UserPlus,
    color: "bg-chart-1/10 text-chart-1",
    label: "Demande d'adhésion",
  },
  session_reminder: {
    icon: Calendar,
    color: "bg-primary/10 text-primary",
    label: "Rappel de séance",
  },
  fcc_progress: {
    icon: GraduationCap,
    color: "bg-chart-2/10 text-chart-2",
    label: "Progression FreeCodeCamp",
  },
  activity_selection: {
    icon: MessageSquare,
    color: "bg-chart-3/10 text-chart-3",
    label: "Sélection activité",
  },
}

function NotificationCard({ notification }: { notification: Notification }) {
  const config = notificationTypeConfig[notification.type] || {
    icon: Bell,
    color: "bg-muted text-muted-foreground",
    label: "Notification",
  }
  const Icon = config.icon
  const timeAgo = getTimeAgo(new Date(notification.createdAt))

  return (
    <div
      className={`flex gap-4 rounded-lg border p-4 transition-colors ${
        notification.isRead
          ? "border-border bg-card"
          : "border-primary/20 bg-primary/5"
      }`}
    >
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${config.color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={`font-medium ${notification.isRead ? "text-foreground" : "text-foreground"}`}>
              {notification.title}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">{notification.body}</p>
          </div>
          {!notification.isRead && (
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary mt-2" />
          )}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
      </div>
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) {
    return `Il y a ${diffMins} minute${diffMins > 1 ? "s" : ""}`
  } else if (diffHours < 24) {
    return `Il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`
  } else if (diffDays < 7) {
    return `Il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`
  } else {
    return date.toLocaleDateString("fr-FR")
  }
}

function NotificationPreferences() {
  const notificationTypes = [
    {
      key: "session_reminder",
      label: "Rappels de séance",
      description: "Notification avant chaque séance",
    },
    {
      key: "activity_selection",
      label: "Sélection aux activités",
      description: "Quand vous êtes sélectionné pour une activité",
    },
    {
      key: "absence_request",
      label: "Demandes d'absence",
      description: "Résultat de vos demandes d'absence",
    },
    {
      key: "membership_request",
      label: "Demandes d'adhésion",
      description: "Nouvelles demandes d'adhésion (admin)",
    },
    {
      key: "fcc_progress",
      label: "Rappels FreeCodeCamp",
      description: "Rappels de mise à jour de progression",
    },
    {
      key: "new_session",
      label: "Nouvelles séances",
      description: "Quand une nouvelle séance est planifiée",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Préférences de notification
        </CardTitle>
        <CardDescription>
          Choisissez comment et quand vous souhaitez être notifié
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {notificationTypes.map((type, index) => (
            <div key={type.key}>
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">{type.label}</Label>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <Label className="text-xs text-muted-foreground">App</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <Switch defaultChecked={type.key === "session_reminder"} />
                  </div>
                </div>
              </div>
              {index < notificationTypes.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>

        <Button>Enregistrer les préférences</Button>
      </CardContent>
    </Card>
  )
}

export default function NotificationsPage() {
  const [localNotifications, setLocalNotifications] = useState(notifications)

  const unreadCount = localNotifications.filter((n) => !n.isRead).length
  const readNotifications = localNotifications.filter((n) => n.isRead)
  const unreadNotifications = localNotifications.filter((n) => !n.isRead)

  const markAllAsRead = () => {
    setLocalNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const clearAll = () => {
    setLocalNotifications([])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `Vous avez ${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
              : "Toutes vos notifications sont lues"}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Tout marquer comme lu
            </Button>
          )}
          {localNotifications.length > 0 && (
            <Button variant="ghost" onClick={clearAll}>
              <Trash2 className="mr-2 h-4 w-4" />
              Tout effacer
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{localNotifications.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-chart-4/10 p-2">
              <Clock className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{unreadCount}</p>
              <p className="text-sm text-muted-foreground">Non lues</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-accent/10 p-2">
              <CheckCheck className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{readNotifications.length}</p>
              <p className="text-sm text-muted-foreground">Lues</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            Toutes ({localNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Non lues ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="preferences">Préférences</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {localNotifications.length > 0 ? (
            <div className="space-y-3">
              {localNotifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium text-foreground">Aucune notification</p>
                <p className="text-xs text-muted-foreground">
                  Vous n&apos;avez pas encore de notifications
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          {unreadNotifications.length > 0 ? (
            <div className="space-y-3">
              {unreadNotifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCheck className="h-12 w-12 text-accent/50 mb-4" />
                <p className="text-sm font-medium text-foreground">Tout est lu !</p>
                <p className="text-xs text-muted-foreground">
                  Vous n&apos;avez pas de notifications non lues
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="preferences">
          <NotificationPreferences />
        </TabsContent>
      </Tabs>
    </div>
  )
}
