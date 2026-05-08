export type SelectionMode = "automatic" | "manual" | "semi-automatic"

export function normalizeUserIds(userIds: string[] | null | undefined) {
  return Array.from(new Set((userIds ?? []).filter(Boolean)))
}

export function getEligibleUserIds(options: {
  activeUserIds: string[]
  alreadyCountedUserIds?: string[]
  excludeUserIds?: string[]
}) {
  const activeSet = new Set(normalizeUserIds(options.activeUserIds))
  const countedSet = new Set(normalizeUserIds(options.alreadyCountedUserIds))
  const excludeSet = new Set(normalizeUserIds(options.excludeUserIds))

  const eligible: string[] = []
  for (const userId of activeSet) {
    if (countedSet.has(userId)) {
      continue
    }
    if (excludeSet.has(userId)) {
      continue
    }
    eligible.push(userId)
  }
  return eligible
}

export function pickRandomUserIds(
  candidateUserIds: string[],
  requestedCount: number
) {
  const count = Math.max(0, Math.min(requestedCount, candidateUserIds.length))
  if (count === 0) {
    return []
  }

  const pool = [...candidateUserIds]
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const current = pool[index]
    pool[index] = pool[randomIndex]
    pool[randomIndex] = current
  }

  return pool.slice(0, count)
}

export function normalizeSelectionCount(
  inputCount: number | undefined,
  fallbackCount: number,
  maxCount = 50
) {
  const base = Number.isFinite(inputCount) ? (inputCount as number) : fallbackCount
  return Math.min(Math.max(Math.trunc(base), 1), maxCount)
}

