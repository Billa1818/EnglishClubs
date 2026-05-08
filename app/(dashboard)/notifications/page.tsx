"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
  Loader2,
  CheckCircle2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { Notification } from "@/lib/types"

type ApiNotificationRow = {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  is_read: boolean
  created_at: string
  metadata?: Record<string, unknown> | null
}

type ApiNotificationsResponse = {
  success?: boolean
  error?: string
  data?: ApiNotificationRow[]
}

type ApiPreferencesResponse = {
  success?: boolean
  error?: string
  data?: {
    preferences?: Array<{
      notificationType: string
      inApp: boolean
      email: boolean
    }>
  }
}

const notificationTypeConfig: Record<
  string,
  { icon: React.ElementType; color: string; label: string }
> = {
  absence_request: {
    icon: Clock,
    color: "bg-chart-4/10 text-chart-4",
    label: "Demande d'absence",
  },
  absence_request_result: {
    icon: Clock,
    color: "bg-chart-4/10 text-chart-4",
    label: "Resultat d'absence",
  },
  absence_result: {
    icon: Clock,
    color: "bg-chart-4/10 text-chart-4",
    label: "Resultat d'absence",
  },
  membership_request: {
    icon: UserPlus,
    color: "bg-chart-1/10 text-chart-1",
    label: "Demande d'adhesion",
  },
  new_absence_request: {
    icon: Clock,
    color: "bg-chart-1/10 text-chart-1",
    label: "Nouvelle absence",
  },
  session_reminder: {
    icon: Calendar,
    color: "bg-primary/10 text-primary",
    label: "Rappel de seance",
  },
  fcc_progress: {
    icon: GraduationCap,
    color: "bg-chart-2/10 text-chart-2",
    label: "Progression FreeCodeCamp",
  },
  fcc_reminder: {
    icon: GraduationCap,
    color: "bg-chart-2/10 text-chart-2",
    label: "Rappel FreeCodeCamp",
  },
  activity_selection: {
    icon: MessageSquare,
    color: "bg-chart-3/10 text-chart-3",
    label: "Selection activite",
  },
  activity_assignment: {
    icon: MessageSquare,
    color: "bg-chart-3/10 text-chart-3",
    label: "Activite assignee",
  },
  new_session: {
    icon: Calendar,
    color: "bg-primary/10 text-primary",
    label: "Nouvelle seance",
  },
}

const preferenceDefinitions = [
  {
    key: "session_reminder",
    label: "Rappels de seance",
    description: "Notification avant chaque seance",
  },
  {
    key: "activity_assignment",
    label: "Selection aux activites",
    description: "Quand vous etes selectionne pour une activite",
  },
  {
    key: "absence_request_result",
    label: "Resultat des absences",
    description: "Traitement des demandes d'absence",
  },
  {
    key: "membership_request",
    label: "Demandes d'adhesion",
    description: "Nouvelles demandes d'adhesion (admin)",
  },
  {
    key: "new_absence_request",
    label: "Nouvelles absences",
    description: "Nouvelles demandes d'absence (admin)",
  },
  {
    key: "fcc_reminder",
    label: "Rappels FreeCodeCamp",
    description: "Rappels de mise a jour de progression",
  },
  {
    key: "new_session",
    label: "Nouvelles seances",
    description: "Quand une nouvelle seance est planifiee",
  },
] as const

type PreferenceState = Record<string, { inApp: boolean; email: boolean }>

function getDefaultPreferencesState(): PreferenceState {
  const state: PreferenceState = {}

  for (const definition of preferenceDefinitions) {
    state[definition.key] = {
      inApp: true,
      email:
        definition.key === "session_reminder" || definition.key === "new_session",
    }
  }

  return state
}

function mapNotification(row: ApiNotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    isRead: row.is_read,
    createdAt: row.created_at,
    metadata: row.metadata ?? undefined,
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) {
    return "A l'instant"
  }

  if (diffMins < 60) {
    return `Il y a ${diffMins} minute${diffMins > 1 ? "s" : ""}`
  }

  if (diffHours < 24) {
    return `Il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`
  }

  if (diffDays < 7) {
    return `Il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`
  }

  return date.toLocaleDateString("fr-FR")
}

function notifyNotificationsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("notifications:changed"))
  }
}

function NotificationCard({
  notification,
  isLoading,
  onMarkAsRead,
  onDelete,
}: {
  notification: Notification
  isLoading: boolean
  onMarkAsRead: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
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
        notification.isRead ? "border-border bg-card" : "border-primary/20 bg-primary/5"
      }`}
    >
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${config.color}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-foreground">{notification.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{notification.body}</p>
          </div>
          {!notification.isRead ? (
            <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>

          {!notification.isRead ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={isLoading}
              className="h-auto p-0 text-xs"
              onClick={() => void onMarkAsRead(notification.id)}
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Marquer comme lu
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="sm"
            disabled={isLoading}
            className="h-auto p-0 text-xs text-destructive hover:text-destructive"
            onClick={() => void onDelete(notification.id)}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Supprimer
          </Button>
        </div>
      </div>
    </div>
  )
}

function NotificationPreferences({
  preferences,
  onToggle,
  onSave,
  isSaving,
  feedback,
}: {
  preferences: PreferenceState
  onToggle: (key: string, channel: "inApp" | "email") => void
  onSave: () => Promise<void>
  isSaving: boolean
  feedback: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Preferences de notification
        </CardTitle>
        <CardDescription>
          Choisissez comment et quand vous souhaitez etre notifie
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {preferenceDefinitions.map((type, index) => (
            <div key={type.key}>
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">{type.label}</Label>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <Label className="text-xs text-muted-foreground">App</Label>
                    <Switch
                      checked={preferences[type.key]?.inApp ?? true}
                      onCheckedChange={() => onToggle(type.key, "inApp")}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <Switch
                      checked={preferences[type.key]?.email ?? false}
                      onCheckedChange={() => onToggle(type.key, "email")}
                    />
                  </div>
                </div>
              </div>
              {index < preferenceDefinitions.length - 1 ? (
                <Separator className="mt-4" />
              ) : null}
            </div>
          ))}
        </div>

        {feedback ? <p className="text-xs text-muted-foreground">{feedback}</p> : null}

        <Button onClick={() => void onSave()} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Enregistrer les preferences
        </Button>
      </CardContent>
    </Card>
  )
}

export default function NotificationsPage() {
  const [notificationsList, setNotificationsList] = useState<Notification[]>([])
  const [preferences, setPreferences] = useState<PreferenceState>(() =>
    getDefaultPreferencesState()
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [preferencesFeedback, setPreferencesFeedback] = useState("")
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage("")

    try {
      const [notificationsResponse, preferencesResponse] = await Promise.all([
        fetch("/api/notifications?limit=100"),
        fetch("/api/notifications/preferences"),
      ])

      const notificationsPayload =
        (await notificationsResponse.json().catch(() => ({}))) as ApiNotificationsResponse
      const preferencesPayload =
        (await preferencesResponse.json().catch(() => ({}))) as ApiPreferencesResponse

      if (!notificationsResponse.ok || !notificationsPayload.success) {
        setErrorMessage(notificationsPayload.error || "Impossible de charger les notifications.")
        setNotificationsList([])
      } else {
        setNotificationsList((notificationsPayload.data ?? []).map(mapNotification))
      }

      if (preferencesResponse.ok && preferencesPayload.success) {
        const defaultState = getDefaultPreferencesState()
        for (const row of preferencesPayload.data?.preferences ?? []) {
          defaultState[row.notificationType] = {
            inApp: row.inApp,
            email: row.email,
          }
        }
        setPreferences(defaultState)
      }
    } catch {
      setErrorMessage("Impossible de charger les notifications pour le moment.")
      setNotificationsList([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const unreadCount = useMemo(
    () => notificationsList.filter((notification) => !notification.isRead).length,
    [notificationsList]
  )

  const readNotifications = useMemo(
    () => notificationsList.filter((notification) => notification.isRead),
    [notificationsList]
  )

  const unreadNotifications = useMemo(
    () => notificationsList.filter((notification) => !notification.isRead),
    [notificationsList]
  )

  const handleMarkAsRead = async (notificationId: string) => {
    setActionId(notificationId)

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isRead: true }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
      }

      if (!response.ok || !payload.success) {
        setErrorMessage(payload.error || "Impossible de marquer la notification comme lue.")
        return
      }

      setNotificationsList((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                isRead: true,
              }
            : notification
        )
      )
      notifyNotificationsChanged()
    } catch {
      setErrorMessage("Impossible de marquer la notification comme lue.")
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (notificationId: string) => {
    setActionId(notificationId)

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      })
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
      }

      if (!response.ok || !payload.success) {
        setErrorMessage(payload.error || "Suppression impossible.")
        return
      }

      setNotificationsList((current) =>
        current.filter((notification) => notification.id !== notificationId)
      )
      notifyNotificationsChanged()
    } catch {
      setErrorMessage("Suppression impossible.")
    } finally {
      setActionId(null)
    }
  }

  const markAllAsRead = async () => {
    setIsRefreshing(true)

    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      })
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
      }

      if (!response.ok || !payload.success) {
        setErrorMessage(payload.error || "Impossible de marquer toutes les notifications.")
        return
      }

      setNotificationsList((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      )
      notifyNotificationsChanged()
    } catch {
      setErrorMessage("Impossible de marquer toutes les notifications.")
    } finally {
      setIsRefreshing(false)
    }
  }

  const clearAll = async () => {
    setIsRefreshing(true)

    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
      })
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
      }

      if (!response.ok || !payload.success) {
        setErrorMessage(payload.error || "Suppression impossible.")
        return
      }

      setNotificationsList([])
      notifyNotificationsChanged()
    } catch {
      setErrorMessage("Suppression impossible.")
    } finally {
      setIsRefreshing(false)
    }
  }

  const togglePreference = (type: string, channel: "inApp" | "email") => {
    setPreferencesFeedback("")
    setPreferences((current) => ({
      ...current,
      [type]: {
        inApp: channel === "inApp" ? !current[type]?.inApp : current[type]?.inApp ?? true,
        email: channel === "email" ? !current[type]?.email : current[type]?.email ?? false,
      },
    }))
  }

  const savePreferences = async () => {
    setIsSavingPreferences(true)
    setPreferencesFeedback("")

    try {
      const payload = {
        preferences: Object.entries(preferences).map(([notificationType, config]) => ({
          notificationType,
          inApp: !!config.inApp,
          email: !!config.email,
        })),
      }

      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const responsePayload = (await response.json().catch(() => ({}))) as ApiPreferencesResponse

      if (!response.ok || !responsePayload.success) {
        setPreferencesFeedback(responsePayload.error || "Enregistrement impossible.")
        return
      }

      setPreferencesFeedback("Preferences enregistrees.")
    } catch {
      setPreferencesFeedback("Enregistrement impossible.")
    } finally {
      setIsSavingPreferences(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `Vous avez ${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${
                  unreadCount > 1 ? "s" : ""
                }`
              : "Toutes vos notifications sont lues"}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 ? (
            <Button variant="outline" onClick={() => void markAllAsRead()} disabled={isRefreshing}>
              {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
              Tout marquer comme lu
            </Button>
          ) : null}
          {notificationsList.length > 0 ? (
            <Button variant="ghost" onClick={() => void clearAll()} disabled={isRefreshing}>
              {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Tout effacer
            </Button>
          ) : null}
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{notificationsList.length}</p>
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
          <TabsTrigger value="all">Toutes ({notificationsList.length})</TabsTrigger>
          <TabsTrigger value="unread">Non lues ({unreadCount})</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {notificationsList.length > 0 ? (
            <div className="space-y-3">
              {notificationsList.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  isLoading={actionId === notification.id}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">Aucune notification</p>
                <p className="text-xs text-muted-foreground">
                  Vous n'avez pas encore de notifications
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          {unreadNotifications.length > 0 ? (
            <div className="space-y-3">
              {unreadNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  isLoading={actionId === notification.id}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCheck className="mb-4 h-12 w-12 text-accent/50" />
                <p className="text-sm font-medium text-foreground">Tout est lu !</p>
                <p className="text-xs text-muted-foreground">
                  Vous n'avez pas de notifications non lues
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="preferences">
          <NotificationPreferences
            preferences={preferences}
            onToggle={togglePreference}
            onSave={savePreferences}
            isSaving={isSavingPreferences}
            feedback={preferencesFeedback}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
