// English dictionary — Settings.
// One file per language for the whole Settings surface: General (including the
// software-update panel), Modules, Users & Roles, Backup & Restore, Tax &
// Receipts and Email Reports.
//
// Merged from the old `part.13`–`part.17`. Two of those screens keep the split
// they always had: the chrome lives here, while module names and the role /
// permission vocabulary live in `src/shared/modules.ts` and
// `src/shared/permissionsAr.ts`.
// eslint-disable-next-line
export const enSettings = {
  // The Settings → General "software update" panel. Its copy was hardcoded English
  // inside an otherwise translated screen, so Arabic users saw an English block
  // bolted onto the bottom of the page. Keep update-checker copy here.
  // ── Software update ──────────────────────────────────────────────────────
  updTitle: 'Software update',
  updIdle: 'Check whether a newer version is available.',
  updChecking: 'Checking for updates…',
  updAvailable: 'Update available: v{version} — downloading…',
  updDownloading: 'Downloading… {percent}%',
  updDownloaded: 'v{version} downloaded — restart to install.',
  updUpToDate: 'You are on the latest version.',
  updError: 'Update error: {message}',
  updUnknownError: 'unknown error',
  updDevOnly: 'Updates are only available in the installed app.',
  updCheckButton: 'Check for updates',
  updRestartButton: 'Restart and install',
  updInstalledVersion: 'Installed version',
  // The product name is a proper noun, so only the version is a variable.
  updVersionValue: 'BizFlow v{version}',

  // Settings → Modules. The screen that decides which business modules are on was
  // English-only in an otherwise translated app, and the module copy it renders
  // (names, descriptions, feature bullets) lives in src/shared/modules.ts as
  // `nameAr` / `descriptionAr` / `featuresAr`. Keep both halves of that screen's
  // copy in the same place: this file for the chrome, the registry for the modules.
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

  // Settings → Users & Roles. The whole access-control area — the user list, the
  // create/edit/change-password modals, the role manager and the permission
  // matrix — was English-only, which is the worst screen to leave in English: it
  // is where an Arabic-speaking owner decides who may see the money.
  //
  // Two halves, like the Modules screen: the chrome lives here, and the role and
  // capability *labels* (data owned by src/shared/permissions.ts) are translated
  // by src/shared/permissionsAr.ts.
  // ── Users screen ────────────────────────────────────────────────────────
  umLoading: 'Loading users…',
  umTitle: 'User Management',
  umTitlePlugin: '{plugin} team',
  umSubtitle: 'Manage system users, roles and permissions',
  umSubtitlePlugin: "Assign {plugin} roles and review each team member's access.",
  umAdd: 'Add User',
  umAddPlugin: 'Add {plugin} user',
  umStatMembers: 'Team members',
  umStatActive: 'Active accounts',
  umStatAccess: 'Access model',
  umStatAccessValue: 'Role-based plugin access',
  umRolesHeading: 'Role Permissions',
  umRoleCustom: 'Custom role',
  umRoleOwnerAccess: 'Owner access',
  umNoPluginAccess: 'No plugin access',
  umChoosePluginRole: 'Choose a {plugin} role before creating this user.',
  umPasswordMismatch: 'Passwords do not match.',
  umPasswordTooShort: 'Password must be at least 6 characters long.',
  umCreated: 'User created successfully.',
  umCreateFailed: 'Failed to create user: {error}',
  umUpdated: 'User updated successfully.',
  umUpdateFailed: 'Failed to update user: {error}',
  umPasswordChanged: 'Password changed successfully.',
  umPasswordChangeFailed: 'Failed to change password: {error}',
  umDeleted: 'User deleted successfully.',
  umDeactivated: 'User deactivated successfully.',
  umDeleteCheckFailed: 'Failed to check what depends on this user.',
  umDeleteFailed: 'Failed to delete this user.',
  umDeactivateFailed: 'Failed to deactivate this user.',
  umNoSelection: 'No user was selected.',
  umAddTitle: 'Add New User',
  umEditTitle: 'Edit User',
  umUsername: 'Username',
  umUsernameRequired: 'Username *',
  umUsernamePlaceholder: 'username',
  umUsernameLocked: 'Username cannot be changed',
  umPasswordRequired: 'Password *',
  umPasswordPlaceholder: 'Minimum 6 characters',
  umConfirmPassword: 'Confirm Password *',
  umConfirmPasswordPlaceholder: 'Re-enter password',
  umFullName: 'Full Name',
  umFullNamePlaceholder: 'John Doe',
  umEmail: 'Email',
  umEmailPlaceholder: 'user@example.com',
  umPhone: 'Phone',
  umPhonePlaceholder: '+1-555-0000',
  umKernelRole: 'Kernel role *',
  umRole: 'Role',
  umLegacyRole: '{role} (legacy)',
  umAccountActive: 'Account is active',
  umCreate: 'Create User',
  umUpdate: 'Update User',
  umCancel: 'Cancel',
  umChangePasswordTitle: 'Change Password for {username}',
  umNewPassword: 'New Password',
  umConfirmNewPassword: 'Confirm New Password',
  umConfirmNewPasswordPlaceholder: 'Re-enter new password',
  umChangePassword: 'Change Password',

  // ── Users table ─────────────────────────────────────────────────────────
  umColUser: 'User',
  umColRole: 'Role',
  umColRolePlugin: '{plugin} role',
  umColContact: 'Contact',
  umColStatus: 'Status',
  umColLastLogin: 'Last Login',
  umColActions: 'Actions',
  umEmpty: 'No users found for the current scope.',
  umKernelRolePrefix: 'Kernel: {role}',
  umActive: 'Active',
  umInactive: 'Inactive',
  umNever: 'Never',
  umEditShort: 'Edit user',
  umEditAria: 'Edit {username}',
  umChangePasswordShort: 'Change password',
  umChangePasswordAria: 'Change password for {username}',
  umDeactivate: 'Deactivate',
  umActivate: 'Activate',
  umDeactivateAria: 'Deactivate {username}',
  umActivateAria: 'Activate {username}',
  umDeleteShort: 'Deactivate or delete user',
  umDeleteAria: 'Deactivate or delete {username}',

  // ── Plugin role picker ──────────────────────────────────────────────────
  umPluginAccessTitle: 'Plugin access',
  umPluginRoleTitle: '{plugin} role',
  umPluginAccessHint: 'Assign a separate role for each enabled plugin.',
  umPluginRoleHint: 'Choose a role and review exactly what it allows before saving.',
  umRoleCanDo: '{role} can:',
  umNoPermissions: 'No permissions granted yet.',

  // ── Roles & permissions screen ──────────────────────────────────────────
  rpLoadFailed: 'Failed to load roles.',
  rpSaveFailed: 'Failed to save the role.',
  rpCreateFailed: 'Failed to create the role.',
  rpDeleteFailed: 'Failed to delete the role.',
  rpResetFailed: 'Failed to reset the role.',
  rpCreated: 'Role “{name}” created.',
  rpDeleted: 'Role “{name}” deleted.',
  rpReset: 'Role “{name}” reset to defaults.',
  rpLoading: 'Loading roles…',
  rpCoreTitle: 'Core roles',
  rpPluginTitle: '{plugin} roles',
  rpIntro:
    'Pick a role, then switch its permissions on or off. Changes save instantly and apply the next time that user signs in.',
  rpReadOnly: '(read-only — needs the “Manage settings” permission)',
  rpKernelNote:
    "These roles cover the core app — dashboard, reports, finance, staff and settings. Each plugin keeps its own roles, managed from that plugin's settings.",
  rpPermissionsCount: '{granted}/{total} permissions',
  rpNewPlaceholder: 'New role name…',
  rpCreateAria: 'Create role',
  rpBadgeFull: 'full access',
  rpBadgeBuiltIn: 'built-in',
  rpBadgeCustom: 'custom',
  rpBadgeCustomised: 'customised',
  rpSaving: 'Saving…',
  rpResetAction: 'Reset',
  rpDeleteAction: 'Delete',
  rpAdminProtected: 'Admin role is protected',
  // Rendered as: {lead} <b>{name}</b> {tail}
  rpAdminProtectedLead: 'The',
  rpAdminRoleName: 'Admin',
  rpAdminProtectedTail: "role always has every permission and can't be limited or restricted.",

  // ── Permission matrix ───────────────────────────────────────────────────
  permTitle: '{scope} permissions',
  permSummary: '{granted} of {total} pages enabled · sensitive actions require their page',
  permFilter: 'Filter permissions…',
  permReadOnlyPage: 'Read-only page',
  permPageAccess: 'Page access',
  permSensitiveOne: ' · {count} sensitive action',
  permSensitiveMany: ' · {count} sensitive actions',
  permAllowPageAria: 'Allow {page}',
  permNoMatch: 'No permissions match “{query}”.',
  rpPresetNone: 'None',
  rpPresetNoneHint: 'Revoke everything in this section',
  rpPresetViewer: 'Viewer',
  rpPresetViewerHint: 'Read-only pages only',
  rpPresetEditor: 'Editor',
  rpPresetEditorHint: 'All pages, no sensitive actions',
  rpPresetAdmin: 'Admin',
  rpPresetAdminHint: 'All pages and sensitive actions',

  // ── Chrome shared with other Settings screens ───────────────────────────
  settingsNavAria: 'Settings navigation',
  bkSaveFailed: 'Failed to save preference.',
  bkChooseFailed: 'Failed to choose folder.',
  bkLoadFailed: 'Failed to load backups.',
  bkCreateFailed: 'Failed to create backup.',
  bkRestoreFailed: 'Failed to restore backup.',
  bkSelectFailed: 'Failed to select file.',
  bkDeleteFailed: 'Failed to delete backup.',
  trPrinterPlaceholder: 'e.g., POS-80 / COM3 / /dev/usb/lp0',
  trKitchenPrinterPlaceholder: 'e.g., Kitchen Thermal',

  // Settings → Backup & Restore. This screen shipped a hand-rolled "bilingual
  // dictionary": a lookup object whose entries read `t('key') || (isAr ? 'عربي' :
  // 'English')`, which meant every label was really a two-language ternary and the
  // screen could never support a third language. The Arabic halves are now keys
  // like everywhere else, and the success toasts are translated rather than
  // inlined at the call site.
  // ── Manual backup card ──────────────────────────────────────────────────
  bkManualDesc: 'You will be prompted to choose where to save the backup file.',
  bkCreating: 'Creating backup…',
  // ── Automatic backup card ───────────────────────────────────────────────
  bkCloseTitle: 'Backup when closing application',
  bkCloseDesc: 'Prompt to create a fresh backup every time you exit BizFlow.',
  bkCloseFolderLabel: 'Close Backup Target Folder',
  bkCloseFolderDefault: 'Default (Documents/BizFlow Backups)',
  // ── Backup history ──────────────────────────────────────────────────────
  bkHistoryTitle: 'Backup History',
  bkHistorySubtitle: 'All backups registered on this system across all directories',
  bkRestoreFromFile: 'Restore from file…',
  bkRefresh: 'Refresh',
  bkNoBackupsTitle: 'No backups found',
  bkNoBackupsSubtitle: 'Click "Create Backup Now" to safeguard your data.',
  bkMissingFile: 'File not found on disk — it may have been moved or deleted.',
  bkRestore: 'Restore',
  bkDelete: 'Delete',
  bkRemoveMissing: 'Remove from registry',
  bkRestoring: 'Restoring…',
  bkDeleting: 'Deleting…',
  // ── Confirmation dialogs ────────────────────────────────────────────────
  bkConfirmRestoreTitle: 'Confirm Database Restore',
  bkConfirmRestoreDesc:
    'Warning: Your active database will be completely replaced by the selected backup. The application will restart automatically.',
  bkConfirmDeleteTitle: 'Confirm Backup Deletion',
  bkConfirmDeleteDesc:
    'Are you sure you want to permanently delete this backup file? This action cannot be undone.',
  // ── Toasts ──────────────────────────────────────────────────────────────
  bkFolderUpdated: 'Backup folder updated',
  bkCreated: 'Backup saved: {name}',
  bkRestored: 'Backup restored successfully! Please restart the application.',
  bkRemoved: 'Backup removed',

  // Settings → Tax & Receipts, and Settings → Email Reports. Both screens carried
  // the same hand-rolled two-language lookup object as Backup & Restore, so their
  // copy could not be translated by anything but a code change. The keys below are
  // the Arabic halves of that object, promoted to dictionary entries.
  emActionsTitle: 'Actions & Testing',
  emBtnPreview: 'Preview Report',
  emBtnSendNow: 'Send Report Now',
  emBtnTest: 'Send Test Email',
  emConfigTitle: 'Email & Delivery Configuration',
  emEmailLabel: 'Recipient Email Address',
  emEnableDesc: 'Automatically receive sales, revenue, and inventory alert summaries',
  emEnableTitle: 'Enable Automated Reports',
  emErrorEmailRequired: 'Please enter a valid email address first.',
  emErrorGeneric: 'An error occurred while processing your request.',
  emFreqDaily: 'Daily (Recommended)',
  emFreqLabel: 'Report Frequency',
  emFreqMonthly: 'Monthly',
  emFreqWeekly: 'Weekly',
  emLiveData: 'Live Data',
  emLowStockTitle: 'Low Stock Alerts',
  emPreviewNotice: 'This preview shows current live data for today. The scheduled report will be generated at delivery time.',
  emPreviewTitle: 'Live Report Preview',
  emPreviewing: 'Generating preview…',
  emRemaining: 'remaining',
  emSaveSuccess: 'Email settings saved successfully!',
  emSaving: 'Saving…',
  emScheduleDesc: 'Reports are automatically scheduled and dispatched at 11:00 PM to summarize the day’s activities.',
  emScheduleTitle: 'Automated Schedule',
  emSendSuccess: 'Report sent successfully!',
  emSendingNow: 'Sending report…',
  emSoldCount: 'sold',
  emStatProfit: 'Net Profit',
  emStatRevenue: 'Total Revenue',
  emStatSales: 'Total Sales',
  emSubtitle: 'Get automated business performance reports delivered straight to your inbox.',
  emTestSuccess: 'Test email sent successfully! Check your inbox.',
  emTesting: 'Sending test…',
  emTopProductsTitle: 'Top Selling Products',
  emailReports: 'Email Reports',
  includeCOGSDescription: 'Deducts purchase costs from total revenue when calculating net profit metrics.',
  saveSettings: 'Save Settings',
  trLayoutDesc: 'Control barcodes, QR codes, logos, and printed language templates.',
  trLayoutTitle: 'Receipt Content & Layout',
  trOpenCashDrawer: 'Kick Cash Drawer Open After Print',
  trPoliciesTitle: 'Return Policy & POS Discounts',
  trReceiptLang: 'Receipt Language',
  trRefundNotice: 'Customer returns accepted within',
  trRefundNoticeSuffix: 'days from purchase date. (0 to disable returns)',
  trTaxExample: 'Example: On a sale of 100.00, tax applied will be',
  trTaxSectionTitle: 'Sales Tax & COGS Accounting',
  trTestPrintBtn: 'Print Test Receipt',
  trNoPrintersFound: 'No USB thermal printers detected.',
  trDetectFailed: 'Failed to scan printers',
  trTestPrinted: 'Test receipt printed successfully!',
  trTestPrintFailed: 'Test print failed',
  trTestPrintError: 'Test print error',
  trStoreNamePlaceholder: 'e.g., BizFlow Store',
  trStoreAddressPlaceholder: '123 Main Street, Suite 100',
  trPrinting: 'Printing…',
  trHeaderPlaceholder: 'Welcome to our store!',
  trFooterPlaceholder: 'Thank you for your business! Please visit us again.',
  trDays: 'Days',
  trDetectedPrinters: 'Detected: {list}',
}
