"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Bell,
  Calendar,
  Clock,
  GraduationCap,
  CheckCircle2,
  Trash2,
  CheckCheck,
  Settings,
  BookOpen,
  Loader2,
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

const preferenceDefinitions = [
  {
    key: "session_reminder",
    title: "Rappel de seance",
    description: "Notification avant chaque seance",
  },
  {
    key: "activity_assignment",
    title: "Activite assignee",
    description: "Quand vous etes selectionne pour une activite",
  },
  {
    key: "absence_request_result",
    title: "Resultat d'absence",
    description: "Quand votre demande d'absence est traitee",
  },
  {
    key: "fcc_reminder",
    title: "Rappel FreeCodeCamp",
    description: "Rappel pour mettre a jour votre progression",
  },
  {
    key: "new_session",
    title: "Nouvelle seance",
    description: "Quand une nouvelle seance est planifiee",
  },
] as const

type PreferenceState = Record<string, { inApp: boolean; email: boolean }>

function getDefaultPreferencesState(): PreferenceState {
  return {
    session_reminder: { inApp: true, email: true },
    activity_assignment: { inApp: true, email: true },
    absence_request_result: { inApp: true, email: true },
    fcc_reminder: { inApp: true, email: false },
    new_session: { inApp: true, email: true },
  }
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

function notifyNotificationsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("notifications:changed"))
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) {
    return "A l'instant"
  }

  if (diffHours < 24) {
    return `Il y a ${diffHours}h`
  }

  if (diffDays < 7) {
    return `Il y a ${diffDays}j`
  }

  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

export default function MemberNotificationsPage() {
  const { user } = useAuth()
  const [notificationsList, setNotificationsList] = useState<Notification[]>([])
  const [activeTab, setActiveTab] = useState("all")
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

  const filteredNotifications = useMemo(
    () =>
      activeTab === "unread"
        ? notificationsList.filter((notification) => !notification.isRead)
        : notificationsList,
    [activeTab, notificationsList]
  )

  if (!user) {
    return null
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "session_reminder":
      case "new_session":
        return <Calendar className="h-5 w-5 text-blue-500" />
      case "activity_assignment":
      case "activity_selection":
        return <BookOpen className="h-5 w-5 text-green-500" />
      case "absence_result":
      case "absence_request_result":
      case "absence_request":
        return <Clock className="h-5 w-5 text-amber-500" />
      case "fcc_reminder":
      case "fcc_progress":
        return <GraduationCap className="h-5 w-5 text-indigo-500" />
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />
    }
  }

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

  const handleMarkAllAsRead = async () => {
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

  const handleClearAll = async () => {
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
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
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
            <Button variant="outline" onClick={() => void handleMarkAllAsRead()} disabled={isRefreshing}>
              {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
              Tout marquer comme lu
            </Button>
          ) : null}

          {notificationsList.length > 0 ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isRefreshing}>
                  {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
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
                  <AlertDialogAction onClick={() => void handleClearAll()}>
                    Effacer tout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Toutes ({notificationsList.length})</TabsTrigger>
          <TabsTrigger value="unread">Non lues ({unreadCount})</TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <NotificationList
            notifications={filteredNotifications}
            getNotificationIcon={getNotificationIcon}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDelete}
            actionId={actionId}
          />
        </TabsContent>

        <TabsContent value="unread" className="mt-6">
          <NotificationList
            notifications={filteredNotifications}
            getNotificationIcon={getNotificationIcon}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDelete}
            actionId={actionId}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferences de notification</CardTitle>
              <CardDescription>Choisissez comment vous souhaitez etre notifie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                {preferenceDefinitions.map((definition, index) => (
                  <div key={definition.key}>
                    <PreferenceRow
                      icon={
                        definition.key === "session_reminder" || definition.key === "new_session" ? (
                          <Calendar className="h-5 w-5 text-blue-500" />
                        ) : definition.key === "activity_assignment" ? (
                          <BookOpen className="h-5 w-5 text-green-500" />
                        ) : definition.key === "absence_request_result" ? (
                          <Clock className="h-5 w-5 text-amber-500" />
                        ) : (
                          <GraduationCap className="h-5 w-5 text-indigo-500" />
                        )
                      }
                      title={definition.title}
                      description={definition.description}
                      inApp={preferences[definition.key]?.inApp ?? true}
                      email={preferences[definition.key]?.email ?? false}
                      onToggleInApp={() => togglePreference(definition.key, "inApp")}
                      onToggleEmail={() => togglePreference(definition.key, "email")}
                    />
                    {index < preferenceDefinitions.length - 1 ? <Separator /> : null}
                  </div>
                ))}
              </div>

              {preferencesFeedback ? (
                <p className="text-xs text-muted-foreground">{preferencesFeedback}</p>
              ) : null}

              <Button onClick={() => void savePreferences()} disabled={isSavingPreferences}>
                {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enregistrer les preferences
              </Button>
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
  onMarkAsRead,
  onDelete,
  actionId,
}: {
  notifications: Notification[]
  getNotificationIcon: (type: string) => React.ReactNode
  onMarkAsRead: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  actionId: string | null
}) {
  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bell className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-center text-muted-foreground">Aucune notification</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {notifications.map((notification) => {
            const isBusy = actionId === notification.id

            return (
              <div
                key={notification.id}
                className={`flex items-start gap-4 p-4 ${!notification.isRead ? "bg-primary/5" : ""}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className={`font-medium ${
                          !notification.isRead ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                    </div>
                    {!notification.isRead ? (
                      <Badge className="flex-shrink-0 bg-primary text-primary-foreground">
                        Nouveau
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(notification.createdAt)}
                    </span>
                    {!notification.isRead ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isBusy}
                        className="h-auto p-0 text-xs"
                        onClick={() => void onMarkAsRead(notification.id)}
                      >
                        {isBusy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                        Marquer comme lu
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      className="h-auto p-0 text-xs text-destructive hover:text-destructive"
                      onClick={() => void onDelete(notification.id)}
                    >
                      {isBusy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
                      Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
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
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="ml-13 flex items-center gap-6 sm:ml-0">
        <div className="flex items-center gap-2">
          <Switch id={`${title}-inapp`} checked={inApp} onCheckedChange={onToggleInApp} />
          <Label htmlFor={`${title}-inapp`} className="text-sm">
            In-app
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id={`${title}-email`} checked={email} onCheckedChange={onToggleEmail} />
          <Label htmlFor={`${title}-email`} className="text-sm">
            Email
          </Label>
        </div>
      </div>
    </div>
  )
}
