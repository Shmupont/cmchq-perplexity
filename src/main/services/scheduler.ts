// Background scheduler — refreshes portfolio every 5 min during US market hours.
// US market: M-F 6:30am-1:00pm PT (regular session). Cron expression uses PT timezone.

import cron, { type ScheduledTask } from 'node-cron'
import { getPortfolio } from './portfolio'

let task: ScheduledTask | null = null

export function startScheduler(opts: { onTick?: () => void } = {}): void {
  if (task) return
  // Every 5 minutes, 6:30am-12:55pm PT, Mon-Fri.
  // The cron spec doesn't support 6:30 start cleanly, so we run every 5min from
  // 6:00 to 12:55 and the worker no-ops outside the precise window.
  task = cron.schedule(
    '*/5 6-12 * * 1-5',
    async () => {
      const now = new Date()
      const ptHour = Number(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Los_Angeles',
          hour: 'numeric',
          hour12: false
        }).format(now)
      )
      const ptMin = Number(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Los_Angeles',
          minute: 'numeric'
        }).format(now)
      )
      const minutes = ptHour * 60 + ptMin
      const open = 6 * 60 + 30
      const close = 13 * 60
      if (minutes < open || minutes > close) return
      console.log(`[scheduler] refresh @ ${now.toISOString()}`)
      try {
        await getPortfolio()
        opts.onTick?.()
      } catch (err) {
        console.error('[scheduler] refresh failed:', err)
      }
    },
    { timezone: 'America/Los_Angeles' }
  )
  console.log('[scheduler] portfolio refresh registered (5 min, market hours, PT)')
}

export function stopScheduler(): void {
  if (task) {
    task.stop()
    task = null
  }
}
