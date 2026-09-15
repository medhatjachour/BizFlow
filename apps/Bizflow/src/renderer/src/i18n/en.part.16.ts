// en dictionary — part 16.
// Settings → Backup & Restore. This screen shipped a hand-rolled "bilingual
// dictionary": a lookup object whose entries read `t('key') || (isAr ? 'عربي' :
// 'English')`, which meant every label was really a two-language ternary and the
// screen could never support a third language. The Arabic halves are now keys
// like everywhere else, and the success toasts are translated rather than
// inlined at the call site.
export const enPart16 = {
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
}
