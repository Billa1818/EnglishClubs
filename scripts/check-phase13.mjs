import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join, relative } from "node:path"

const rootDir = process.cwd()

const requiredFiles = [
  "lib/supabase/client.ts",
  "lib/supabase/server.ts",
  "lib/supabase/types.ts",
  "proxy.ts",
  "app/api/auth/register/route.ts",
  "app/api/auth/login/route.ts",
  "app/api/auth/logout/route.ts",
  "app/api/auth/forgot-password/route.ts",
  "app/api/auth/reset-password/route.ts",
  "app/api/invitations/route.ts",
  "app/api/invitations/[id]/route.ts",
  "app/api/invitations/verify/[token]/route.ts",
  "app/api/members/route.ts",
  "app/api/members/[id]/route.ts",
  "app/api/members/[id]/attendances/route.ts",
  "app/api/profile/route.ts",
  "app/api/profile/avatar/route.ts",
  "app/api/activities/route.ts",
  "app/api/activities/[id]/route.ts",
  "app/api/activities/[id]/archive/route.ts",
  "app/api/activities/[id]/cycle/route.ts",
  "app/api/activities/[id]/cycle/reset/route.ts",
  "app/api/sessions/route.ts",
  "app/api/sessions/[id]/route.ts",
  "app/api/sessions/[id]/start/route.ts",
  "app/api/sessions/[id]/complete/route.ts",
  "app/api/sessions/[id]/attendances/route.ts",
  "app/api/sessions/[id]/attendances/[userId]/route.ts",
  "app/api/sessions/[id]/activities/route.ts",
  "app/api/sessions/[id]/activities/[actId]/route.ts",
  "app/api/sessions/[id]/activities/[actId]/assign/route.ts",
  "app/api/sessions/[id]/activities/[actId]/select/route.ts",
  "app/api/sessions/[id]/next-activity/route.ts",
  "app/api/absences/route.ts",
  "app/api/absences/[id]/route.ts",
  "app/api/selection/summary/route.ts",
  "app/api/topics/route.ts",
  "app/api/topics/[id]/route.ts",
  "app/api/topics/[id]/archive/route.ts",
  "app/api/topics/[id]/use/route.ts",
  "app/api/topics/[id]/history/route.ts",
  "app/api/fcc/route.ts",
  "app/api/fcc/[id]/route.ts",
  "app/api/fcc/[id]/screenshot/route.ts",
  "app/api/fcc/[id]/validate/route.ts",
  "app/api/notifications/route.ts",
  "app/api/notifications/[id]/route.ts",
  "app/api/notifications/read-all/route.ts",
  "app/api/notifications/preferences/route.ts",
  "app/api/settings/route.ts",
  "app/api/settings/logo/route.ts",
  "app/api/settings/export/route.ts",
]

const requiredSqlScripts = [
  "001_helper_functions.sql",
  "002_create_profiles.sql",
  "003_create_members.sql",
  "004_create_app_config.sql",
  "005_rls_profiles.sql",
  "006_rls_members.sql",
  "007_rls_app_config.sql",
  "008_trigger_auto_member.sql",
  "009_create_invitations.sql",
  "010_rls_invitations.sql",
  "011_create_activities.sql",
  "012_rls_activities.sql",
  "013_seed_activities.sql",
  "017_create_sessions.sql",
  "018_create_session_activities.sql",
  "019_create_session_activity_assignments.sql",
  "020_rls_sessions.sql",
  "022_create_activity_selection_cycles.sql",
  "023_create_activity_selections.sql",
  "024_rls_selections.sql",
  "025_create_topics.sql",
  "026_create_topic_usages.sql",
  "027_rls_topics.sql",
  "028_seed_topics.sql",
  "029_create_fcc_progressions.sql",
  "030_rls_fcc_progressions.sql",
  "031_create_notifications.sql",
  "032_create_notification_preferences.sql",
  "033_rls_notifications.sql",
  "035_create_attendances.sql",
  "036_rls_attendances.sql",
  "037_create_absence_requests.sql",
  "038_rls_absence_requests.sql",
  "039_add_app_logo_url.sql",
]

const allowedMockDataFiles = new Set(["lib/mock-data.ts"])

function walkFiles(startDir) {
  const results = []
  const entries = readdirSync(startDir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(startDir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === ".next" || entry.name === "node_modules" || entry.name === ".git") {
        continue
      }
      results.push(...walkFiles(fullPath))
    } else if (entry.isFile()) {
      results.push(fullPath)
    }
  }

  return results
}

function hasFile(path) {
  return existsSync(join(rootDir, path))
}

function listMissingFiles(paths) {
  return paths.filter((path) => !hasFile(path))
}

function findMockDataImports() {
  const files = walkFiles(join(rootDir, "app")).concat(walkFiles(join(rootDir, "lib")))
  const offenders = []

  for (const file of files) {
    const rel = relative(rootDir, file)
    if (allowedMockDataFiles.has(rel)) {
      continue
    }

    if (!/\.(ts|tsx|js|jsx)$/.test(file)) {
      continue
    }

    const content = readFileSync(file, "utf8")
    if (content.includes('from "@/lib/mock-data"') || content.includes("from './mock-data'")) {
      offenders.push(rel)
    }
  }

  return offenders
}

function readPackageJson() {
  return JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"))
}

function checkPackageScripts(pkg) {
  const scripts = pkg.scripts ?? {}
  const missing = []

  if (!scripts.build) missing.push("build")
  if (!scripts.typecheck) missing.push("typecheck")
  if (!scripts["check:phase13"]) missing.push("check:phase13")

  return missing
}

function printList(title, items) {
  console.log(`\n${title}`)
  if (items.length === 0) {
    console.log("  OK")
    return
  }
  for (const item of items) {
    console.log(`  - ${item}`)
  }
}

const missingFiles = listMissingFiles(requiredFiles)
const missingSqlScripts = requiredSqlScripts.filter(
  (file) => !hasFile(join("scripts", file))
)
const mockDataOffenders = findMockDataImports()
const missingPackageScripts = checkPackageScripts(readPackageJson())

printList("Routes et fichiers attendus", missingFiles)
printList("Scripts SQL/RLS attendus", missingSqlScripts)
printList("Usages restants de lib/mock-data", mockDataOffenders)
printList("Scripts package.json manquants", missingPackageScripts)

const hasFailure =
  missingFiles.length > 0 ||
  missingSqlScripts.length > 0 ||
  mockDataOffenders.length > 0 ||
  missingPackageScripts.length > 0

console.log("\nResume")
if (hasFailure) {
  console.log("  Phase 13 incomplete: corriger les points listes ci-dessus.")
  process.exitCode = 1
} else {
  console.log("  Phase 13 static checks: OK")
}
