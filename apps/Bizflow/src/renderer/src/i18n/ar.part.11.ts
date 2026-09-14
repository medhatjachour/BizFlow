// ar dictionary — part 11.
// مقابلات المفاتيح في en.part.11.ts — نفس الترتيب ونفس الأسماء.
// eslint-disable-next-line
export const arPart11 = {
    // ── المدد الزمنية ────────────────────────────────────────────────────────
    empDurHoursMinutes: '{h}س {m}د',
    empDurHours: '{h}س',
    empDurMinutes: '{m}د',

    // ── رسائل الاحتياط ───────────────────────────────────────────────────────
    empActionErr: 'حدث خطأ غير متوقع',

    // ── الحضور ───────────────────────────────────────────────────────────────
    empAttNoMatch: 'لا توجد سجلات مطابقة لهذه المرشّحات',
    empAttNoMatchHint: 'جرّب شهرًا آخر أو أزل مرشّح الحالة.',
    empAttClearFilters: 'إزالة المرشّحات',
    empAttNoCheckOut: 'بدون انصراف',
    empAttNoCheckOutHint: '{count} يوم بدون تسجيل انصراف، لذا ساعاتها غير محتسبة',
    empCheckedInOk: 'تم تسجيل الحضور',
    empCheckedOutOk: 'تم تسجيل الانصراف',
    empCheckInErr: 'تعذّر تسجيل الحضور',
    empCheckOutErr: 'تعذّر تسجيل الانصراف',
    empAttSummaryLine: '{range} · {present} حاضر · {absent} غائب · {late} متأخر',

    // ── الورديات ─────────────────────────────────────────────────────────────
    empShiftOverlapShort: 'تعارض',
    empShiftStatCount: '{count} وردية',
    empPaidHours: 'الساعات المدفوعة',
    empShiftZeroLengthHint: 'وقت البداية والنهاية متطابق، لذلك تُحسب هذه الوردية بصفر ساعات.',

    // ── المستندات ────────────────────────────────────────────────────────────
    empDocAdded: 'أُضيف في',
    empDocumentEditTitle: 'بيانات المستند',
    empDocumentNumber: 'الرقم المرجعي',
    empDocRenewalSection: 'التجديد',
    empDocRenewalHint: 'اترك تاريخ الانتهاء فارغًا للمستندات التي لا تنتهي.',
    empDocRenewalFrom: 'متابعة التجديد اعتبارًا من {date}',
    empDocNoExpiryBadge: 'لا تنتهي',
    empDocExpiresOn: 'ينتهي في {date}',
    empDocIssuedOn: 'صدر في {date}',
    empDocExpiredOn: 'انتهى في {date}',
    empDocNoResults: 'لا توجد مستندات مطابقة للبحث',
    empDocNoResultsHint: 'تأكد من الإملاء أو أفرغ خانة البحث.',
    empDocStatCount: '{count} مستند في الملف',
    empDocMissingReference: 'بدون رقم مرجعي',
    empDocExpiringInDays: 'ينتهي خلال {count} يوم',
    empDocUploadedOn: 'رُفع في {date}',
    empDocSearchPlaceholder: 'ابحث بالاسم أو الرقم المرجعي أو النوع…',
    empDocErrInvalidExpiry: 'تاريخ الانتهاء هذا غير صحيح',
    empDocErrInvalidIssue: 'تاريخ الإصدار هذا غير صحيح',
    empDocErrExpiryBeforeIssue: 'يجب أن يكون تاريخ الانتهاء بعد تاريخ الإصدار',
    empDocAttachedOk: 'تم إرفاق المستند',
    empDocMetadataSavedOk: 'تم تحديث بيانات المستند',
    empDocOpenErr: 'تعذّر فتح المستند',
    empDocSaveMetadataErr: 'تعذّر حفظ بيانات المستند',

    // ── الملاحظات والسجل ─────────────────────────────────────────────────────
    empNoteAddedOk: 'تمت إضافة الملاحظة',
    empNoteAddErr: 'تعذّرت إضافة الملاحظة',

    // ── العمل الإضافي ────────────────────────────────────────────────────────
    empOTLoggedOk: 'تم تسجيل العمل الإضافي',
    empOTLogErr: 'تعذّر تسجيل العمل الإضافي',
    empOTApprovedOk: 'تم اعتماد العمل الإضافي',
    empOTApproveErr: 'تعذّر اعتماد العمل الإضافي',
    empOTRevokedOk: 'تم سحب الاعتماد',
    empOTRevokeErr: 'تعذّر سحب الاعتماد',
    empOTDeletedOk: 'تم حذف سجل العمل الإضافي',
    empOTDeleteErr: 'تعذّر حذف سجل العمل الإضافي',
    empOTConfirmDelete: 'حذف سجل العمل الإضافي هذا؟ لن تصل هذه الساعات إلى مسير الرواتب.',
    empOTBulkApproved: 'تم اعتماد {count} سجل عمل إضافي',

    // ── الإجازات ─────────────────────────────────────────────────────────────
    empLeaveRequestedOk: 'تم طلب الإجازة',
    empLeaveRequestErr: 'تعذّر طلب الإجازة',
    empLeaveApprovedOk: 'تم اعتماد الإجازة',
    empLeaveRejectedOk: 'تم رفض الإجازة',
    empLeaveUpdateErr: 'تعذّر تحديث طلب الإجازة',
    empLeaveDeletedOk: 'تم حذف طلب الإجازة',
    empLeaveDeleteErr: 'تعذّر حذف طلب الإجازة',
    empLeaveConfirmDelete: 'حذف طلب الإجازة هذا؟ سيُعاد احتساب الرصيد.',
    empLeaveBulkApproved: 'تم اعتماد {count} طلب إجازة',

    // ── دورة حياة الموظف ─────────────────────────────────────────────────────
    empContractEndedOk: 'تم إنهاء العقد — وأصبحت حالة الموظف «منتهية»',
    empContractEndErr: 'تعذّر إنهاء العقد',
    empReactivatedOk: 'تمت إعادة تفعيل الموظف',
    empReactivateErr: 'تعذّرت إعادة تفعيل الموظف',
    empPerfUpdatedOk: 'تم تحديث درجة الأداء',
    empPerfUpdateErr: 'تعذّر تحديث درجة الأداء',

    // ── إطار الملف الشخصي ────────────────────────────────────────────────────
    empTerminatedEditLocked: 'التحرير مقفل على هذا السجل. تبقى الرواتب والسجل التاريخي متاحة — أعد تفعيل الموظف لاستعادة الصلاحية الكاملة.',

    // ── نموذج الموظف (إضافة / تعديل) ─────────────────────────────────────────
    empFormSectionPayroll: 'الرواتب والالتزامات',
    empFormSectionContract: 'العقد والانتهاء',
    empFormSectionNotes: 'ملاحظات',
    empSalaryBasis: 'أساس الراتب',
    empFormEmailPlaceholder: 'employee@company.com',
    empFormEmergencyPhonePlaceholder: '+20 100 000 0000',
    empFormScorePlaceholder: '0 – 100',
    empFormTaxIdPlaceholder: 'الرقم الضريبي / رقم الملف الضريبي',
    empFormSocialInsurancePlaceholder: 'الرقم التأميني / التأمينات الاجتماعية',
    empFormBankPlaceholder: 'مثال: البنك الأهلي',
    empFormIbanPlaceholder: 'رقم الحساب / آيبان',
    empFormLeaveDaysHint: 'عدد الأيام المستحقة في السنة',
}
