/** "20 Aug 2026" (en-IN, same output the pages used before). */
export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/** Calendar-day distance as a label: "Today", "1 day ago", "N days ago". (Detail page behavior.) */
export function daysSince(dateStr: string) {
  const then = new Date(dateStr)
  const now = new Date()
  const diffMs = now.setHours(0, 0, 0, 0) - new Date(then).setHours(0, 0, 0, 0)
  const days = Math.max(0, Math.round(diffMs / 86400000))
  if (days === 0) return "Today"
  if (days === 1) return "1 day ago"
  return `${days} days ago`
}

/** Elapsed-time distance as a label: "Today", "Yesterday", "N days ago". (Dashboard behavior.) */
export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return `${days} days ago`
}
