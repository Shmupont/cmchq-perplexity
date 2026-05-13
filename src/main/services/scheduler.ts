// Background scheduler — refreshes portfolio every 5 min during US market hours
// and generates daily + weekly briefings on schedule.
// US market: M-F 6:30am-1:00pm PT (regular session). Cron expressions use PT timezone.

import cron, { type ScheduledTask } from 'node-cron'
import { getPortfolio } from './portfolio'
import { generateDailyBrief, generateWeeklyBrief } from './briefing'

let portfolioTask: ScheduledTask | null = null
let dailyBriefTask: ScheduledTask | null = null
let weeklyBriefTask: ScheduledTask | null = null

export function startScheduler(opts: { onTick?: () => void } = {}): void {
  if (!portfolioTask) {
    // Every 5 minutes, 6:30am-12:55pm PT, Mon-Fri.
    // The cron spec doesn't support 6:30 start cleanly, so we run every 5min from
    // 6:00 to 12:55 and the worker no-ops outside the precise window.
    portfolioTask = cron.schedule(
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
        console.log(`[scheduler] portfolio refresh @ ${now.toISOString()}`)
        try {
          await getPortfolio()
          opts.onTick?.()
        } catch (err) {
          console.error('[scheduler] portfolio refresh failed:', err)
        }
      },
      { timezone: 'America/Los_Angeles' }
    )
    console.log('[scheduler] portfolio refresh registered (5 min, market hours, PT)')
  }

  if (!dailyBriefTask) {
    // 7:00 AM PT every day
    dailyBriefTask = cron.schedule(
      '0 7 * * *',
      async () => {
        console.log('[scheduler] generating daily brief')
        try {
          await generateDailyBrief()
        } catch (err) {
          console.error('[scheduler] daily brief failed:', err)
        }
      },
      { timezone: 'America/Los_Angeles' }
    )
    console.log('[scheduler] daily brief registered (7:00 AM PT)')
  }

  if (!weeklyBriefTask) {
    // 8:00 PM PT every Sunday
    weeklyBriefTask = cron.schedule(
      '0 20 * * 0',
      async () => {
        console.log('[scheduler] generating weekly brief')
        try {
          await generateWeeklyBrief()
        } catch (err) {
          console.error('[scheduler] weekly brief failed:', err)
        }
      },
      { timezone: 'America/Los_Angeles' }
    )
    console.log('[scheduler] weekly brief registered (Sun 8:00 PM PT)')
  }
}

export function stopScheduler(): void {
  if (portfolioTask) {
    portfolioTask.stop()
    portfolioTask = null
  }
  if (dailyBriefTask) {
    dailyBriefTask.stop()
    dailyBriefTask = null
  }
  if (weeklyBriefTask) {
    weeklyBriefTask.stop()
    weeklyBriefTask = null
  }
}
