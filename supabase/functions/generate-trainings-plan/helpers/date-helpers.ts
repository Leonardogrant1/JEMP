// ── Date helpers ─────────────────────────────────────────────────────────────

function computePlanDates() {
  const now = new Date()
  // Normalize to UTC midnight
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  // JS: 0=Sun..6=Sat → DB: 1=Mon..7=Sun
  const jsDow = today.getUTCDay()
  const todayDow = jsDow === 0 ? 7 : jsDow

  // Monday of current week
  const currentMonday = new Date(today)
  currentMonday.setUTCDate(today.getUTCDate() - (todayDow - 1))

  // Monday of next (first complete) week
  const nextMonday = new Date(currentMonday)
  nextMonday.setUTCDate(currentMonday.getUTCDate() + 7)

  // End date = Sunday of 4th complete week (nextMonday + 27 days)
  const endDate = new Date(nextMonday)
  endDate.setUTCDate(nextMonday.getUTCDate() + 27)

  return { today, todayDow, currentMonday, nextMonday, endDate }
}

// Returns all concrete dates on which a session with the given day_of_week should be scheduled:
// - partial current week (days >= today)
// - 4 complete weeks starting from nextMonday
function getScheduledDates(
  sessionDow: number,
  todayDow: number,
  currentMonday: Date,
  nextMonday: Date,
): Date[] {
  const dates: Date[] = []

  // Partial week: only schedule if the session day hasn't passed yet
  if (sessionDow >= todayDow) {
    const d = new Date(currentMonday)
    d.setUTCDate(currentMonday.getUTCDate() + sessionDow - 1)
    dates.push(d)
  }

  // 4 complete weeks
  for (let week = 0; week < 4; week++) {
    const d = new Date(nextMonday)
    d.setUTCDate(nextMonday.getUTCDate() + week * 7 + sessionDow - 1)
    dates.push(d)
  }

  return dates
}

export { computePlanDates, getScheduledDates }
