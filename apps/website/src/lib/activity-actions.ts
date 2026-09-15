import type { Tone } from "@/components/ui";

/**
 * `AccountActivity.action` verbs and their customer-facing labels live together
 * for the same reason the audit events do: a label map that drifts from the
 * verbs actually written is invisible — the account area just prints the raw
 * `license_revoked` string at the customer. Writing through `ACTIVITY_ACTIONS`
 * and labelling through `ACTIVITY_META` makes a missing label a compile error.
 */
export const ACTIVITY_ACTIONS = {
  purchase: "purchase",
  licenseIssued: "license_issued",
  licenseReissued: "license_reissued",
  licenseRevoked: "license_revoked",
  licenseReactivated: "license_reactivated",
  deviceActivation: "device_activation",
  deviceReleased: "device_released",
  download: "download",
  supportTicket: "support_ticket",
  customRequest: "custom_request",
  accountSuspended: "account_suspended",
  accountReactivated: "account_reactivated",
  roleChanged: "role_changed",
  signedOutAll: "signed_out_all",
} as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[keyof typeof ACTIVITY_ACTIONS];

export const ACTIVITY_META: Record<ActivityAction, { label: string; tone: Tone }> = {
  [ACTIVITY_ACTIONS.purchase]: { label: "Purchase", tone: "good" },
  [ACTIVITY_ACTIONS.licenseIssued]: { label: "Licence issued", tone: "info" },
  [ACTIVITY_ACTIONS.licenseReissued]: { label: "Licence key re-sent", tone: "neutral" },
  [ACTIVITY_ACTIONS.licenseRevoked]: { label: "Licence revoked", tone: "bad" },
  [ACTIVITY_ACTIONS.licenseReactivated]: { label: "Licence re-activated", tone: "good" },
  [ACTIVITY_ACTIONS.deviceActivation]: { label: "Device activated", tone: "info" },
  [ACTIVITY_ACTIONS.deviceReleased]: { label: "Device released", tone: "warn" },
  [ACTIVITY_ACTIONS.download]: { label: "Download", tone: "neutral" },
  [ACTIVITY_ACTIONS.supportTicket]: { label: "Support", tone: "violet" },
  [ACTIVITY_ACTIONS.customRequest]: { label: "Custom request", tone: "warn" },
  [ACTIVITY_ACTIONS.accountSuspended]: { label: "Account suspended", tone: "bad" },
  [ACTIVITY_ACTIONS.accountReactivated]: { label: "Account re-activated", tone: "good" },
  [ACTIVITY_ACTIONS.roleChanged]: { label: "Role changed", tone: "info" },
  [ACTIVITY_ACTIONS.signedOutAll]: { label: "Signed out", tone: "neutral" },
};

/** Falls back to the raw verb so a legacy row is still readable. */
export function activityMeta(action: string): { label: string; tone: Tone } {
  return ACTIVITY_META[action as ActivityAction] ?? { label: action, tone: "neutral" };
}
