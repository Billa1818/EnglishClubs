export const TOPIC_SELECT =
  "id, activity_id, title, description, level, is_archived, usage_count, created_by, created_at, updated_at, activity:activities(id, name, name_en, requires_topic, is_archived)"

export function mapTopicsError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes("relation") && lower.includes("topics")) {
    return "La table `topics` est absente. Execute `025_create_topics.sql` puis `027_rls_topics.sql`."
  }

  if (lower.includes("relation") && lower.includes("topic_usages")) {
    return "La table `topic_usages` est absente. Execute `026_create_topic_usages.sql` puis `027_rls_topics.sql`."
  }

  if (lower.includes("schema cache")) {
    return "Le schema Supabase n'est pas a jour pour les sujets. Reexecute les scripts SQL 025 a 027."
  }

  if (
    lower.includes("topics_activity_id_fkey") ||
    (lower.includes("foreign key") && lower.includes("activity"))
  ) {
    return "L'activite associee est introuvable ou invalide."
  }

  if (lower.includes("topic_usages_unique_per_member_session")) {
    return "Ce sujet est deja marque comme utilise par ce membre pour cette seance."
  }

  return message
}

export function isActiveMember(
  member: { status: string; role: string } | null | undefined
) {
  return member?.status === "active"
}

export function isActiveAdmin(
  member: { status: string; role: string } | null | undefined
) {
  return member?.status === "active" && member.role === "admin"
}
