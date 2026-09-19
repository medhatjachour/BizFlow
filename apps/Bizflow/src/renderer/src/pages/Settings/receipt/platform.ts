/**
 * Which operating system the app is running on.
 *
 * The receipt printer has to exist as an OS print queue before the app can send
 * a single byte to it, so the setup guidance has to name the right system.
 */

export type Platform = 'windows' | 'macos' | 'linux' | 'other'

export function detectPlatform(
  userAgent: string = typeof navigator === 'undefined' ? '' : navigator.userAgent
): Platform {
  if (/Windows/i.test(userAgent)) return 'windows'
  if (/Mac OS X|Macintosh/i.test(userAgent)) return 'macos'
  if (/Linux|X11|CrOS/i.test(userAgent)) return 'linux'
  return 'other'
}

/** Display name, or an empty string when the system is not recognised. */
export function platformLabel(platform: Platform): string {
  if (platform === 'macos') return 'macOS'
  if (platform === 'linux') return 'Linux'
  if (platform === 'other') return ''
  return 'Windows'
}
