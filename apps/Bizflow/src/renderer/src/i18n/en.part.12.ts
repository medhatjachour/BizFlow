// en dictionary — part 12.
// Lifecycle (onboarding / offboarding / final settlement), the HR attention
// panel, and the approvals inbox. These used to be `isAr ? '...' : '...'`
// ternaries baked into the components, which meant a third language could never
// be added and the strings were invisible to the translation tooling. They are
// real keys now — keep new lifecycle / attention / inbox copy here.
// eslint-disable-next-line
export const enPart12 = {
    // ── Lifecycle shell ──────────────────────────────────────────────────────
    lcTitle: 'Lifecycle',
    lcLead: 'What has to happen when someone joins and when they leave — plus the final settlement.',
    lcProbation: 'Probation',
    lcProbationEnded: 'Probation ended',
    lcProbationLeft: '{days} days of probation left',
    lcProbationNote: 'Review performance before this date and decide: confirm, extend, or end.',

    // ── Checklists ───────────────────────────────────────────────────────────
    lcOnboarding: 'Onboarding',
    lcOnboardingLead: 'Nobody can be paid without a tax number and bank details.',
    lcOffboarding: 'Offboarding',
    lcOffboardingLead: 'Someone serving notice is still employed until offboarding is completed.',
    lcStartOnboarding: 'Start onboarding',
    lcStartOffboarding: 'Start offboarding',
    lcAddTask: 'Add a task…',
    lcAdd: 'Add',
    lcRequired: 'Required',
    lcOptional: 'Optional',
    lcProgress: '{done} of {total}',
    lcAllDone: 'All required tasks are complete',
    lcWaitingOn: '{count} required task(s) still open',
    lcNoOnboardingYet: 'No onboarding list yet.',
    lcNoOffboardingYet: 'No offboarding list yet.',
    lcMarkDone: 'Mark as done',
    lcMarkNotDone: 'Mark as not done',
    lcDeleteTask: 'Delete task',
    lcTasksAdded: '{count} task(s) added',

    // ── Checklist categories ─────────────────────────────────────────────────
    lcCatDocuments: 'Documents',
    lcCatAccess: 'Access',
    lcCatEquipment: 'Equipment',
    lcCatPayroll: 'Payroll',
    lcCatHandover: 'Handover',
    lcCatCompliance: 'Compliance',
    lcCatOther: 'Other',

    // ── Exit ─────────────────────────────────────────────────────────────────
    lcLastWorkingDay: 'Last working day',
    lcReason: 'Exit reason',
    lcRehire: 'Eligible for rehire',
    lcYes: 'Yes',
    lcNo: 'No',
    lcNotes: 'Notes',
    lcExitNotes: 'Exit interview notes',
    lcComplete: 'Complete offboarding',
    lcForce: 'Complete anyway, with tasks still open',
    lcOutstanding: 'Required tasks are still open',
    lcTerminated: 'Offboarding completed',
    lcNoOffboardingInProgress:
      'No offboarding in progress. Start it to record the last working day, the handover list and the settlement.',
    lcOffboardingStarted: 'Offboarding started',
    lcOffboardingCompleted: 'Offboarding completed',

    // ── Exit reasons ─────────────────────────────────────────────────────────
    lcReasonResignation: 'Resignation',
    lcReasonEndOfContract: 'End of contract',
    lcReasonDismissal: 'Dismissal',
    lcReasonRedundancy: 'Redundancy',
    lcReasonRetirement: 'Retirement',

    // ── Settlement ───────────────────────────────────────────────────────────
    lcSettlement: 'Final settlement',
    lcSettlementNote: 'A calculation, not a decision. Nothing is saved until you confirm.',
    lcSalaryForDays: 'Salary for days worked',
    lcOvertime: 'Approved overtime',
    lcExtraShifts: 'Extra shifts',
    lcLeaveEncashment: 'Leave encashment',
    lcEndOfService: 'End-of-service benefit',
    lcOtherAdditions: 'Other additions',
    lcDeductions: 'Deductions',
    lcNet: 'Net payable',
    lcDaysWorked: '{days} of {of} days',
    lcYearsOfService: '{years} completed year(s) of service',
    lcGratuityBasis: 'Gratuity basis: months per year of service',
    lcIncludeGratuity: 'Include end-of-service benefit',
    lcGratuityDisclaimer:
      'End-of-service is a contractual convention that varies by country. Change the basis, or switch it off if it does not apply.',
    lcCreatePayslip: 'Create final payslip',
    lcCreatePayslipDone: 'Final payslip created',
    lcReplaceWarning: 'If a payslip already exists for this month it will be replaced.',
    lcCalculating: 'Calculating…',
    lcSettlementNoteText: 'Final settlement · last day {date} · {years} year(s) of service',

    // ── Shared actions / errors ──────────────────────────────────────────────
    lcClose: 'Close',
    lcCancel: 'Cancel',
    lcCouldNotUpdateTask: 'Could not update the task',
    lcCouldNotAddTask: 'Could not add the task',
    lcCouldNotRemoveTask: 'Could not remove the task',
    lcCouldNotStartOnboarding: 'Could not start onboarding',
    lcCouldNotStartOffboarding: 'Could not start offboarding',
    lcCouldNotCompleteOffboarding: 'Could not complete offboarding',
    lcCouldNotCreatePayslip: 'Could not create the final payslip',

    // ── Attention panel ──────────────────────────────────────────────────────
    hrAttnTitle: 'What needs attention today',
    hrAttnSubtitle: 'Derived from what is recorded on each employee',
    hrAttnContractsEnding: 'Contracts ending',
    hrAttnIdsExpiring: 'ID documents expiring',
    hrAttnPayrollNotReady: 'Payroll not ready to run',
    hrAttnAbsentOrLate: 'Absent or late today',
    hrAttnNoManager: 'No line manager',
    hrAttnProbationEnding: 'Probation ending',
    hrAttnOnboardingIncomplete: 'Onboarding incomplete',
    hrAttnOffboardingOpen: 'Offboarding not closed',
    hrAttnMissingBank: 'bank account',
    hrAttnMissingTax: 'tax / insurance number',
    hrAttnMissingSep: ', ',
    hrAttnMissing: 'missing {list}',
    hrAttnExpiredAgo: 'Expired {days}d ago',
    hrAttnInDays: 'in {days}d',
    hrAttnLate: 'Late',
    hrAttnAbsent: 'Absent',
    hrAttnTasksLeft: '{count} task(s) left',
    hrAttnContractsHint:
      'A contract ends within 60 days, or already has. Renew it or close it out properly.',
    hrAttnIdsHint:
      'An ID or residency document is running out. Official records cannot rely on an expired one.',
    hrAttnPayrollHint:
      'A salary cannot be paid correctly without bank details and a tax or insurance number.',
    hrAttnAbsentHint: 'Record the reason so the attendance record stays truthful.',
    hrAttnNoManagerHint:
      'Everyone should report to someone. It is the first question asked at review time.',
    hrAttnProbationHint: 'Confirm, extend or end — before the date passes on its own.',
    hrAttnOnboardingHint:
      'Required tasks outstanding — some of them (tax number, bank details) block payroll.',
    hrAttnOffboardingHint:
      'The last working day has passed but the file is still open — access and equipment may still be live.',
    hrAttnAllClear:
      'Nothing needs your attention today — contracts, documents, payroll details and attendance are all in order.',

    // ── Approvals inbox ──────────────────────────────────────────────────────
    hrInboxTitle: 'Waiting on you',
    hrInboxRefresh: 'Refresh',
    hrInboxEmpty: 'Nothing is waiting on a decision.',
    hrInboxLeave: 'Leave requests',
    hrInboxOvertime: 'Overtime awaiting approval',
    hrInboxApprove: 'Approve',
    hrInboxReject: 'Reject',
    hrInboxBalanceLeft: 'Balance left',
    hrInboxLeaveApproved: 'Leave approved',
    hrInboxLeaveRejected: 'Leave rejected',
    hrInboxReturnedToPending: 'Returned to pending',
    hrInboxOvertimeApproved: 'Overtime approved',
    hrInboxApprovalWithdrawn: 'Approval withdrawn',
    hrInboxSubtitle:
      'Every leave and overtime request in one place, instead of opening each profile to hunt for them.',
    hrInboxCouldNotRequest: 'Could not update the request',
    hrInboxCouldNotRecord: 'Could not update the record',
    hrInboxOverBalance:
      'This takes them past their allowance ({left} left). Approving puts the balance in the negative.',
    hrInboxOvertimeHint: 'Only approved hours reach payroll.',
    hrInboxUndoHint:
      'Changed your mind? Open the employee profile — a leave request can go back to pending and an overtime approval can be withdrawn, without deleting either record.',
    hrInboxAttendanceHint:
      'Approving leave writes it into the attendance calendar; rejecting it later removes those days again.',
    hrInboxDay: 'day',
    hrInboxDaysPlural: 'days',

    // ── Team list table ──────────────────────────────────────────────────────
    hrTeamApprovals: 'Approvals',
    hrTeamActive: 'Active:',
    hrTeamClearAll: 'Clear all',
}
