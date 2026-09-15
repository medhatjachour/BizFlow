// en dictionary — part 14.
// Settings → Modules. The screen that decides which business modules are on was
// English-only in an otherwise translated app, and the module copy it renders
// (names, descriptions, feature bullets) lives in src/shared/modules.ts as
// `nameAr` / `descriptionAr` / `featuresAr`. Keep both halves of that screen's
// copy in the same place: this file for the chrome, the registry for the modules.
export const enPart14 = {
  // ── Modules screen ───────────────────────────────────────────────────────
  modulesTab: 'Modules',
  modsTitle: 'Business Modules',
  modsLead:
    'Enable the modules that match your business type. Disabled modules are hidden from the menu but their data is preserved — you can re-enable them at any time without losing anything.',
  modsRestartTitle: 'Restart required',
  modsRestartBody: 'Module changes are saved. Restart the app to activate them.',
  modsRestartNow: 'Restart Now',
  modsRestarting: 'Restarting…',
  modsNoBundledTitle: 'No modules bundled',
  modsNoBundledBody:
    'This build was compiled without optional modules. Rebuild with ENABLED_MODULES to include them.',
  modsActiveBadge: 'Active',
  modsPriceHint: 'One-time licence price',
  modsOneTime: 'one-time',
  modsShowDetails: 'Show details',
  modsSaving: 'Saving…',
  modsToggleFailed: 'Could not save the module change. Please try again.',
  modsRelaunchFailed: 'Could not restart the app automatically. Close and reopen it manually.',
  modsEnable: 'Enable',
  modsDisable: 'Disable',
  modsIncluded: 'What is included',
  modsDataTables: 'Data tables',
  // Rendered as: {lead} <strong>{strong}</strong>{tail}
  modsSafetyLead: 'Disabling this module hides its menu and screens, but it',
  modsSafetyStrong: 'never deletes your data',
  modsSafetyTail: 'Re-enable it at any time to get everything back.',
  modsComingSoon: 'Coming soon',
  modsComingDelivery: 'Delivery',
  modsComingDeliveryDesc: 'Driver dispatch, zones, order tracking',
  modsComingLoyalty: 'Loyalty & CRM',
  modsComingLoyaltyDesc: 'Points, tiers, birthday rewards',
  modsComingBranch: 'Multi-Branch',
  modsComingBranchDesc: 'Shared inventory across locations',
  modsStatusActive: 'available',
  modsStatusPlanned: 'planned',
  modsStatusFuture: 'future',
}
