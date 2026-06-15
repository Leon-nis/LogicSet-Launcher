import { PostHog } from 'posthog-node'
import { randomUUID } from 'node:crypto'
import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
  AnalyticsSettings
} from '../../shared/types'
import type { LocalSettingsService } from './local-settings.service'

const POSTHOG_PROJECT_TOKEN =
  'phc_ro6juziSeLMcxBiXzdSe2LVUjcb55QQ3fFH9o6tYgrxU'
const POSTHOG_HOST = 'https://us.i.posthog.com'

const allowedEvents = new Set<AnalyticsEventName>([
  'game_launched',
  'launcher_opened',
  'launcher_session_ended',
  'launcher_session_started',
  'user_activated'
])

const allowedPropertyKeys = new Set<keyof AnalyticsEventProperties>([
  'app_version',
  'os',
  'session_id',
  'session_duration_seconds'
])

export interface AnalyticsService {
  getSettings(): Promise<AnalyticsSettings>
  setEnabled(enabled: boolean): Promise<AnalyticsSettings>
  startSession(): Promise<void>
  trackGameLaunched(): Promise<void>
  shutdown(): Promise<void>
}

export class PostHogAnalyticsService implements AnalyticsService {
  private readonly sessionId = randomUUID()
  private readonly sessionStartedAt = Date.now()
  private sessionEventsSent = false
  private sessionEnded = false
  private readonly client = new PostHog(POSTHOG_PROJECT_TOKEN, {
    host: POSTHOG_HOST,
    flushAt: 20,
    flushInterval: 10_000,
    requestTimeout: 5_000
  })

  constructor(
    private readonly settingsService: LocalSettingsService,
    private readonly appVersion: string
  ) {}

  async getSettings(): Promise<AnalyticsSettings> {
    return (await this.settingsService.load()).analytics
  }

  async setEnabled(enabled: boolean): Promise<AnalyticsSettings> {
    const settings = await this.settingsService.load()

    if (settings.analytics.enabled === enabled) {
      return settings.analytics
    }

    const savedSettings = await this.settingsService.save({
      ...settings,
      analytics: {
        ...settings.analytics,
        enabled
      }
    })

    if (enabled && !this.sessionEventsSent) {
      await this.startSession()
    }

    return savedSettings.analytics
  }

  async startSession(): Promise<void> {
    if (this.sessionEventsSent) {
      return
    }

    const settings = await this.settingsService.load()
    if (!settings.analytics.enabled) {
      return
    }

    this.sessionEventsSent = true
    const properties = { session_id: this.sessionId }
    await Promise.all([
      this.captureEvent('launcher_opened', properties),
      this.captureEvent('launcher_session_started', properties)
    ])
  }

  async trackGameLaunched(): Promise<void> {
    const settings = await this.settingsService.load()
    if (!settings.analytics.enabled) {
      return
    }

    await this.captureEvent('game_launched', {
      session_id: this.sessionId
    })

    if (settings.analytics.userActivated) {
      return
    }

    await this.settingsService.save({
      ...settings,
      analytics: {
        ...settings.analytics,
        userActivated: true
      }
    })
    await this.captureEvent('user_activated', {
      session_id: this.sessionId
    })
  }

  async shutdown(): Promise<void> {
    try {
      await this.endSession()
      await this.client.flush()
      this.client.shutdown(5_000)
    } catch {
      // Analytics must never prevent the launcher from closing.
    }
  }

  private async endSession(): Promise<void> {
    if (this.sessionEnded || !this.sessionEventsSent) {
      return
    }

    this.sessionEnded = true
    await this.captureEvent('launcher_session_ended', {
      session_id: this.sessionId,
      session_duration_seconds: Math.max(
        0,
        Math.round((Date.now() - this.sessionStartedAt) / 1_000)
      )
    })
  }

  private async captureEvent(
    event: AnalyticsEventName,
    properties: AnalyticsEventProperties = {}
  ): Promise<void> {
    try {
      if (!allowedEvents.has(event)) {
        return
      }

      const settings = await this.settingsService.load()
      if (!settings.analytics.enabled) {
        return
      }

      const sanitizedProperties = sanitizeProperties(properties)

      this.client.capture({
        distinctId: settings.analytics.anonymousId,
        event,
        properties: {
          ...sanitizedProperties,
          app_version: this.appVersion,
          os: process.platform,
          $session_id: this.sessionId,
          $process_person_profile: false
        }
      })
    } catch {
      // Analytics must never affect launcher behavior.
    }
  }
}

const sanitizeProperties = (
  properties: AnalyticsEventProperties
): AnalyticsEventProperties => {
  const sanitized: Record<string, string | number> = {}

  for (const [key, value] of Object.entries(properties)) {
    if (
      allowedPropertyKeys.has(key as keyof AnalyticsEventProperties) &&
      (typeof value === 'string' || typeof value === 'number')
    ) {
      sanitized[key] = value
    }
  }

  return sanitized
}
