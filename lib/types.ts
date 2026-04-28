// Types for englishClubs

export type MemberStatus = "pending" | "active" | "suspended" | "removed"
export type SessionStatus = "upcoming" | "ongoing" | "completed" | "cancelled"
export type AttendanceStatus = "declared" | "confirmed" | "absent" | "excused"
export type AbsenceRequestStatus = "pending" | "approved" | "rejected"
export type SelectionMode = "automatic" | "manual" | "semi-automatic"
export type ActivityCategory = "ice_breaker" | "vocabulary" | "conversation" | "comprehension" | "writing"
export type SessionActivityStatus = "pending" | "in_progress" | "completed" | "skipped"
export type AssignmentTiming = "before_event" | "during_event"

export const activityCategoryLabels: Record<ActivityCategory, string> = {
  ice_breaker: "Ice Breakers",
  vocabulary: "Jeux de vocabulaire",
  conversation: "Conversation structuree",
  comprehension: "Comprehension orale/ecrite",
  writing: "Production ecrite",
}

export const activityCategoryDurations: Record<ActivityCategory, { min: number; max: number; default: number }> = {
  ice_breaker: { min: 10, max: 15, default: 10 },
  vocabulary: { min: 20, max: 30, default: 25 },
  conversation: { min: 30, max: 50, default: 40 },
  comprehension: { min: 20, max: 40, default: 30 },
  writing: { min: 10, max: 15, default: 10 },
}
export type EnglishLevel = "beginner" | "intermediate" | "advanced"
export type UserRole = "admin" | "member"

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  pseudo: string
  photoUrl?: string
  englishLevel: EnglishLevel
  role: UserRole
}

export interface Member {
  id: string
  user: User
  status: MemberStatus
  joinedAt: string
  presenceCount: number
  absenceCount: number
}

export interface Invitation {
  id: string
  token: string
  email?: string
  expiresAt: string
  usedAt?: string
  createdBy: string
  createdAt: string
}

export interface Session {
  id: string
  date: string
  startTime: string
  endTime: string
  status: SessionStatus
  createdBy: string
  activities: SessionActivity[]
  attendees: Attendance[]
  debate?: SessionDebate
  startedAt?: string
  completedAt?: string
  currentActivityIndex?: number
}

export interface Activity {
  id: string
  name: string
  nameEn: string // English name for display
  description: string
  category: ActivityCategory
  defaultDuration: number // in minutes
  minDuration: number
  maxDuration: number
  membersRequired: number
  selectionMode: SelectionMode
  requiresTopic: boolean
  topicsReusable: boolean
  isArchived: boolean
  isDefault: boolean // true for predefined activities
  instructions: string // detailed instructions for running the activity
  materials?: string[] // materials needed
  icon?: string // icon name for the activity
}

export interface SessionActivity {
  id: string
  sessionId: string
  activity: Activity
  orderIndex: number
  duration: number // actual duration for this session (in minutes)
  assignmentTiming: AssignmentTiming // when members are assigned: before event or during event
  assignments: ActivityAssignment[]
  topicId?: string
  topic?: Topic
  status: SessionActivityStatus
  startedAt?: string
  completedAt?: string
}

export interface ActivityAssignment {
  id: string
  sessionActivityId: string
  user: User
  assignmentType: string
  reason?: string
  assignedBy: string
  assignedAt: string
}

export interface Attendance {
  id: string
  sessionId: string
  user: User
  status: AttendanceStatus
  declaredAt?: string
  confirmedAt?: string
  confirmedBy?: string
}

export interface AbsenceRequest {
  id: string
  user: User
  sessionId: string
  session: Session
  reason?: string
  status: AbsenceRequestStatus
  adminComment?: string
  requestedAt: string
  reviewedAt?: string
  reviewedBy?: string
}

export interface Topic {
  id: string
  activityId?: string
  activity?: Activity
  title: string
  description: string
  level: EnglishLevel
  isArchived: boolean
  usageCount: number
}

export interface TopicUsage {
  id: string
  topicId: string
  topic: Topic
  sessionId: string
  userId: string
  user: User
  usedAt: string
}

export interface FCCProgression {
  id: string
  user: User
  track: string
  level: string
  modulesCompleted: number
  certificateName?: string
  screenshotUrl?: string
  updatedAt: string
  validatedBy?: string
  validatedAt?: string
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  body: string
  isRead: boolean
  createdAt: string
  metadata?: Record<string, unknown>
}

export interface NotificationPreference {
  userId: string
  notificationType: string
  inApp: boolean
  email: boolean
}

export interface AppConfig {
  id: string
  appName: string
  appLogoUrl?: string
  accessType: "open" | "invitation"
  scheduleDays: string[]
  startTime: string
  endTime: string
  frequency: string
  rules?: string
  absenceMinDelayHours: number
  fccReminderDays: number
}

export interface ActivitySelectionCycle {
  id: string
  activityId: string
  activity: Activity
  startedAt: string
  selections: ActivitySelection[]
}

export interface ActivitySelection {
  id: string
  cycleId: string
  userId: string
  user: User
  sessionId: string
  selectedAt: string
  selectedBy?: string
}

// Auth types
export interface AuthUser extends User {
  password: string // In real app, this would be hashed
  isEmailVerified: boolean
  createdAt: string
  lastLoginAt?: string
}

export interface PendingRegistration {
  id: string
  email: string
  firstName: string
  lastName: string
  pseudo: string
  englishLevel: EnglishLevel
  invitationToken?: string
  status: "pending_email" | "pending_admin" | "approved" | "rejected"
  requestedAt: string
  reviewedAt?: string
  reviewedBy?: string
  adminComment?: string
}

// Debate types
export interface DebateTopic {
  id: string
  title: string
  description: string
  level: EnglishLevel
  isArchived: boolean
  usageCount: number
  createdAt: string
  createdBy?: string
}

export interface SessionDebate {
  id: string
  sessionId: string
  topic: DebateTopic
  participantsCount: number
  selectedMembers: User[]
  selectedAt: string
  selectedBy: string
  status: "pending" | "selected" | "completed"
}
