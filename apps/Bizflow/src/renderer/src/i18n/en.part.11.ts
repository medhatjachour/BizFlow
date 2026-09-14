// en dictionary — part 11.
// Strings for the employee profile hook (toasts and confirmations), the shift /
// attendance / document tabs, and document renewal tracking.
// These are the last user-visible English strings in the HR module; keep new HR
// copy here rather than in part.10 so the two do not collide.
// eslint-disable-next-line
export const enPart11 = {
    // ── Durations ────────────────────────────────────────────────────────────
    empDurHoursMinutes: '{h}h {m}m',
    empDurHours: '{h}h',
    empDurMinutes: '{m}m',

    // ── Toast fallbacks ──────────────────────────────────────────────────────
    empActionErr: 'Something went wrong',

    // ── Attendance ───────────────────────────────────────────────────────────
    empAttNoMatch: 'No records match these filters',
    empAttNoMatchHint: 'Try a different month or clear the status filter.',
    empAttClearFilters: 'Clear filters',
    empAttNoCheckOut: 'No check-out',
    empAttNoCheckOutHint: '{count} days have no check-out, so their hours are excluded',
    empCheckedInOk: 'Checked in',
    empCheckedOutOk: 'Checked out',
    empCheckInErr: 'Could not record the check-in',
    empCheckOutErr: 'Could not record the check-out',
    empAttSummaryLine: '{range} · {present} present · {absent} absent · {late} late',

    // ── Shifts ───────────────────────────────────────────────────────────────
    empShiftOverlapShort: 'Overlap',
    empShiftStatCount: '{count} shifts',
    empPaidHours: 'Paid hours',
    empShiftZeroLengthHint: 'Start and end are the same time, so this shift counts as zero hours.',

    // ── Documents ────────────────────────────────────────────────────────────
    empDocAdded: 'Added',
    empDocumentEditTitle: 'Document details',
    empDocumentNumber: 'Reference number',
    empDocRenewalSection: 'Renewal',
    empDocRenewalHint: 'Leave the expiry blank for documents that never lapse.',
    empDocRenewalFrom: 'Renewal tracked from {date}',
    empDocNoExpiryBadge: 'Does not expire',
    empDocExpiresOn: 'Expires {date}',
    empDocIssuedOn: 'Issued {date}',
    empDocExpiredOn: 'Expired {date}',
    empDocNoResults: 'No documents match your search',
    empDocNoResultsHint: 'Check the spelling or clear the search box.',
    empDocStatCount: '{count} documents on file',
    empDocMissingReference: 'Missing reference number',
    empDocExpiringInDays: 'Expires in {count} days',
    empDocUploadedOn: 'Uploaded {date}',
    empDocSearchPlaceholder: 'Search by name, reference or type…',
    empDocErrInvalidExpiry: 'That expiry date is not a real date',
    empDocErrInvalidIssue: 'That issue date is not a real date',
    empDocErrExpiryBeforeIssue: 'The expiry date has to come after the issue date',
    empDocAttachedOk: 'Document attached',
    empDocMetadataSavedOk: 'Document details updated',
    empDocOpenErr: 'Could not open the document',
    empDocSaveMetadataErr: 'Could not save the document details',

    // ── Notes & activity ─────────────────────────────────────────────────────
    empNoteAddedOk: 'Note added',
    empNoteAddErr: 'Could not add the note',

    // ── Overtime ─────────────────────────────────────────────────────────────
    empOTLoggedOk: 'Overtime logged',
    empOTLogErr: 'Could not log the overtime',
    empOTApprovedOk: 'Overtime approved',
    empOTApproveErr: 'Could not approve the overtime',
    empOTRevokedOk: 'Approval withdrawn',
    empOTRevokeErr: 'Could not withdraw the approval',
    empOTDeletedOk: 'Overtime record deleted',
    empOTDeleteErr: 'Could not delete the overtime record',
    empOTConfirmDelete: 'Delete this overtime record? The hours will no longer reach payroll.',
    empOTBulkApproved: '{count} overtime records approved',

    // ── Leave ────────────────────────────────────────────────────────────────
    empLeaveRequestedOk: 'Leave requested',
    empLeaveRequestErr: 'Could not request the leave',
    empLeaveApprovedOk: 'Leave approved',
    empLeaveRejectedOk: 'Leave rejected',
    empLeaveUpdateErr: 'Could not update the leave request',
    empLeaveDeletedOk: 'Leave request deleted',
    empLeaveDeleteErr: 'Could not delete the leave request',
    empLeaveConfirmDelete: 'Delete this leave request? The balance will be recalculated.',
    empLeaveBulkApproved: '{count} leave requests approved',

    // ── Lifecycle ────────────────────────────────────────────────────────────
    empContractEndedOk: 'Contract ended — the employee is now marked as terminated',
    empContractEndErr: 'Could not end the contract',
    empReactivatedOk: 'Employee reactivated',
    empReactivateErr: 'Could not reactivate the employee',
    empPerfUpdatedOk: 'Performance score updated',
    empPerfUpdateErr: 'Could not update the performance score',

    // ── Profile shell ────────────────────────────────────────────────────────
    empTerminatedEditLocked: 'Editing is locked on this record. Payroll and history stay available — reactivate the employee to restore full access.',

    // ── Employee form (add / edit) ───────────────────────────────────────────
    empFormSectionPayroll: 'Payroll & compliance',
    empFormSectionContract: 'Contract & expiry',
    empFormSectionNotes: 'Notes',
    empSalaryBasis: 'Pay basis',
    empFormEmailPlaceholder: 'employee@company.com',
    empFormEmergencyPhonePlaceholder: '+1 555 000 0000',
    empFormScorePlaceholder: '0 – 100',
    empFormTaxIdPlaceholder: 'TIN / tax file no.',
    empFormSocialInsurancePlaceholder: 'SSN / social insurance no.',
    empFormBankPlaceholder: 'e.g. National Bank',
    empFormIbanPlaceholder: 'Account number / IBAN',
    empFormLeaveDaysHint: 'Days granted per leave year',
}
