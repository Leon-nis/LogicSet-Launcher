import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
  AnalyticsSettings
} from '../../shared/types'
import type { LocalSettingsService } from './local-settings.service'

const POSTHOG_PROJECT_TOKEN =
  'phc_ro6juziSeLMcxBiXzdSe2LVUjcb55QQ3fFH9o6tYgrxU'
const POSTHOG_HOST = 'https://us.i.posthog.com'
const POSTHOG_CAPTURE_PATH = '/i/v0/e/'

const allowedEvents = new Set<AnalyticsEventName>([
  'analytics_enabled',
  'mod_update_tab_opened',
  'mod_update_checked',
  'mod_update_installed'
])

const allowedPropertyKeys = new Set<keyof AnalyticsEventProperties>([
  'app_version',
  'os',
  'success',
  'error_code',
  'installed_version',
  'remote_version',
  'modpack_version'
])

export interface AnalyticsService {
  getSettings(): Promise<AnalyticsSettings>
  setEnabled(enabled: boolean): Promise<AnalyticsSettings>
  trackEvent(
    event: AnalyticsEventName,
    properties?: AnalyticsEventProperties
  ): Promise<void>
}

export class PostHogAnalyticsService implements AnalyticsService {
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

    if (enabled) {
      void this.captureEvent('analytics_enabled')
    }

    return savedSettings.analytics
  }

  async trackEvent(
    event: AnalyticsEventName,
    properties: AnalyticsEventProperties = {}
  ): Promise<void> {
    if (event === 'analytics_enabled') {
      return
    }

    return this.captureEvent(event, properties)
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

      await fetch(`${POSTHOG_HOST}${POSTHOG_CAPTURE_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: POSTHOG_PROJECT_TOKEN,
          event,
          distinct_id: settings.analytics.anonymousId,
          properties: {
            ...sanitizedProperties,
            app_version: this.appVersion,
            os: process.platform
          }
        }),
        signal: AbortSignal.timeout(5_000)
      })
    } catch {
      // Analytics must never affect launcher behavior.
    }
  }
}

const sanitizeProperties = (
  properties: AnalyticsEventProperties
): AnalyticsEventProperties => {
  const sanitized: Record<string, string | boolean> = {}

  for (const [key, value] of Object.entries(properties)) {
    if (
      allowedPropertyKeys.has(key as keyof AnalyticsEventProperties) &&
      (typeof value === 'string' || typeof value === 'boolean')
    ) {
      sanitized[key] = value
    }
  }

  return sanitized
}
