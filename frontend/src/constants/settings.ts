/**
 * The 5 Settings tabs this build covers — Profile (default, per
 * docs/InformationArchitecture.md §7.5) plus Preferences (Theme/Language),
 * Notifications (preferences, distinct from the Notification Center list
 * at `ROUTES.notifications`), Privacy, and Security (Account Recovery —
 * this app is passwordless, see docs/Authentication.md §10, so there is no
 * "change password" tab; a future session should not add one without
 * revisiting that confirmed decision). Help & Support (§7.5's 4th tab) is
 * out of this build's scope.
 */
export type SettingsSection =
  'profile' | 'preferences' | 'notifications' | 'privacy' | 'security'

export const SETTINGS_SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'security', label: 'Security' },
]
