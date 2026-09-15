/**
 * `OrderAudit.event` names and their human labels live together here because a
 * label map that drifts from the names actually written is invisible: the
 * dashboard just falls back to printing the raw event string. Writing through
 * `AUDIT_EVENTS` and labelling through `AUDIT_LABELS` makes that impossible —
 * a new event without a label fails the build.
 */
export const AUDIT_EVENTS = {
  checkoutCompleted: "checkout.session.completed",
  licenseManualIssue: "license.issued.manual",
  licenseActivated: "license.activated",
  licenseDeviceReleased: "license.device.released",
  licenseRevoked: "license.revoked",
  licenseReactivated: "license.reactivated",
  licenseReissued: "license.reissued",
} as const;

export type AuditEvent = (typeof AUDIT_EVENTS)[keyof typeof AUDIT_EVENTS];

export const AUDIT_LABELS: Record<AuditEvent, string> = {
  [AUDIT_EVENTS.checkoutCompleted]: "Checkout completed",
  [AUDIT_EVENTS.licenseManualIssue]: "Issued manually by an admin",
  [AUDIT_EVENTS.licenseActivated]: "Activated on a device",
  [AUDIT_EVENTS.licenseDeviceReleased]: "Device binding released",
  [AUDIT_EVENTS.licenseRevoked]: "Licence revoked",
  [AUDIT_EVENTS.licenseReactivated]: "Licence re-activated",
  [AUDIT_EVENTS.licenseReissued]: "Licence re-issued",
};

/** Falls back to the raw event name so an unexpected row is still readable. */
export function auditLabel(event: string): string {
  return AUDIT_LABELS[event as AuditEvent] ?? event;
}
