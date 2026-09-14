// ar dictionary — part 12.
// دورة حياة الموظف (التهيئة / إنهاء الخدمة / المستحقات النهائية)، لوحة ما يحتاج
// انتباهك، وصندوق الموافقات. كانت هذه النصوص مكتوبة داخل المكوّنات بصيغة
// `isAr ? '...' : '...'` فأصبحت مفاتيح حقيقية.
// eslint-disable-next-line
export const arPart12 = {
    // ── إطار دورة الحياة ─────────────────────────────────────────────────────
    lcTitle: 'الرحلة الوظيفية',
    lcLead: 'ما يجب فعله عند انضمام الموظف وعند خروجه — والمستحقات النهائية.',
    lcProbation: 'فترة التجربة',
    lcProbationEnded: 'انتهت فترة التجربة',
    lcProbationLeft: 'باقي {days} يوم على نهاية التجربة',
    lcProbationNote: 'راجع الأداء قبل هذا التاريخ واتخذ قرار التثبيت أو التمديد.',

    // ── قوائم المهام ─────────────────────────────────────────────────────────
    lcOnboarding: 'التهيئة',
    lcOnboardingLead: 'لا يمكن صرف راتب بلا رقم ضريبي وحساب بنكي.',
    lcOffboarding: 'إنهاء الخدمة',
    lcOffboardingLead: 'الموظف الذي يستقيل لا يزال موظفاً حتى إتمام الإجراءات.',
    lcStartOnboarding: 'ابدأ التهيئة',
    lcStartOffboarding: 'ابدأ إجراءات إنهاء الخدمة',
    lcAddTask: 'أضِف مهمة…',
    lcAdd: 'إضافة',
    lcRequired: 'إلزامية',
    lcOptional: 'اختيارية',
    lcProgress: '{done} من {total}',
    lcAllDone: 'كل المهام الإلزامية مكتملة',
    lcWaitingOn: '{count} مهمة إلزامية متبقية',
    lcNoOnboardingYet: 'لا توجد قائمة تهيئة بعد.',
    lcNoOffboardingYet: 'لا توجد قائمة إنهاء خدمة بعد.',
    lcMarkDone: 'تحديد كمكتملة',
    lcMarkNotDone: 'إلغاء الإكمال',
    lcDeleteTask: 'حذف المهمة',
    lcTasksAdded: 'أُضيفت {count} مهمة',

    // ── تصنيفات المهام ───────────────────────────────────────────────────────
    lcCatDocuments: 'مستندات',
    lcCatAccess: 'صلاحيات الدخول',
    lcCatEquipment: 'عهدة وأجهزة',
    lcCatPayroll: 'رواتب',
    lcCatHandover: 'تسليم عمل',
    lcCatCompliance: 'التزامات',
    lcCatOther: 'أخرى',

    // ── الخروج ────────────────────────────────────────────────────────────────
    lcLastWorkingDay: 'آخر يوم عمل',
    lcReason: 'سبب الخروج',
    lcRehire: 'قابل لإعادة التوظيف',
    lcYes: 'نعم',
    lcNo: 'لا',
    lcNotes: 'ملاحظات',
    lcExitNotes: 'ملاحظات مقابلة الخروج',
    lcComplete: 'إنهاء الخدمة نهائياً',
    lcForce: 'أكمل رغم المهام المتبقية',
    lcOutstanding: 'مهام إلزامية لم تكتمل',
    lcTerminated: 'تم إنهاء الخدمة',
    lcNoOffboardingInProgress:
      'لا توجد إجراءات خروج بعد. ابدأها لتسجيل آخر يوم عمل وقائمة التسليم والمستحقات.',
    lcOffboardingStarted: 'بدأت إجراءات إنهاء الخدمة',
    lcOffboardingCompleted: 'تم إنهاء الخدمة',

    // ── أسباب الخروج ─────────────────────────────────────────────────────────
    lcReasonResignation: 'استقالة',
    lcReasonEndOfContract: 'انتهاء العقد',
    lcReasonDismissal: 'إنهاء من صاحب العمل',
    lcReasonRedundancy: 'تقليص عدد العاملين',
    lcReasonRetirement: 'تقاعد',

    // ── المستحقات النهائية ───────────────────────────────────────────────────
    lcSettlement: 'المستحقات النهائية',
    lcSettlementNote: 'حساب تقديري — راجعه قبل الصرف. لا شيء يُحفظ حتى تؤكد.',
    lcSalaryForDays: 'راتب أيام العمل',
    lcOvertime: 'وقت إضافي معتمد',
    lcExtraShifts: 'ورديات إضافية',
    lcLeaveEncashment: 'بدل رصيد الإجازات',
    lcEndOfService: 'مكافأة نهاية الخدمة',
    lcOtherAdditions: 'إضافات أخرى',
    lcDeductions: 'خصومات',
    lcNet: 'الصافي المستحق',
    lcDaysWorked: '{days} من {of} يوم',
    lcYearsOfService: '{years} سنة خدمة كاملة',
    lcGratuityBasis: 'أساس المكافأة: أشهر لكل سنة خدمة',
    lcIncludeGratuity: 'احتسب مكافأة نهاية الخدمة',
    lcGratuityDisclaimer:
      'مكافأة نهاية الخدمة عرف تعاقدي ويختلف بحسب الدولة. عدّل الأساس أو أوقفها إن لم تنطبق عليك.',
    lcCreatePayslip: 'أنشئ قسيمة الراتب النهائية',
    lcCreatePayslipDone: 'أُنشئت قسيمة الراتب النهائية',
    lcReplaceWarning: 'إن وُجدت قسيمة لهذا الشهر فسيتم استبدالها.',
    lcCalculating: 'جارٍ الحساب…',
    lcSettlementNoteText: 'مستحقات نهائية · آخر يوم عمل {date} · {years} سنة خدمة',

    // ── إجراءات وأخطاء مشتركة ────────────────────────────────────────────────
    lcClose: 'إغلاق',
    lcCancel: 'إلغاء',
    lcCouldNotUpdateTask: 'تعذّر تحديث المهمة',
    lcCouldNotAddTask: 'تعذّرت إضافة المهمة',
    lcCouldNotRemoveTask: 'تعذّر حذف المهمة',
    lcCouldNotStartOnboarding: 'تعذّر بدء التهيئة',
    lcCouldNotStartOffboarding: 'تعذّر بدء إجراءات إنهاء الخدمة',
    lcCouldNotCompleteOffboarding: 'تعذّر إتمام إنهاء الخدمة',
    lcCouldNotCreatePayslip: 'تعذّر إنشاء قسيمة الراتب النهائية',

    // ── لوحة الانتباه ────────────────────────────────────────────────────────
    hrAttnTitle: 'ما يحتاج انتباهك اليوم',
    hrAttnSubtitle: 'مبنية على بيانات الموظفين المسجّلة',
    hrAttnContractsEnding: 'عقود تنتهي',
    hrAttnIdsExpiring: 'وثائق هوية تنتهي',
    hrAttnPayrollNotReady: 'رواتب غير جاهزة للصرف',
    hrAttnAbsentOrLate: 'غياب أو تأخير اليوم',
    hrAttnNoManager: 'بلا مسؤول مباشر',
    hrAttnProbationEnding: 'فترة تجربة تنتهي',
    hrAttnOnboardingIncomplete: 'تهيئة غير مكتملة',
    hrAttnOffboardingOpen: 'إجراءات خروج غير مغلقة',
    hrAttnMissingBank: 'حساب بنكي',
    hrAttnMissingTax: 'رقم ضريبي/تأميني',
    hrAttnMissingSep: '، ',
    hrAttnMissing: 'ينقص: {list}',
    hrAttnExpiredAgo: 'انتهى قبل {days} يوم',
    hrAttnInDays: 'بعد {days} يوم',
    hrAttnLate: 'تأخر',
    hrAttnAbsent: 'غائب',
    hrAttnTasksLeft: '{count} مهمة متبقية',
    hrAttnContractsHint: 'عقد ينتهي خلال ٦٠ يوماً أو انتهى بالفعل. جدّده أو أنهِ العلاقة رسمياً.',
    hrAttnIdsHint: 'الهوية أو الإقامة تنتهي قريباً. تعذّر التسجيل الرسمي بلا وثيقة سارية.',
    hrAttnPayrollHint: 'لا يمكن صرف الراتب بلا رقم حساب أو رقم ضريبي/تأميني صحيح.',
    hrAttnAbsentHint: 'سجّل سبب الغياب حتى يظل كشف الحضور صحيحاً.',
    hrAttnNoManagerHint: 'لكل موظف مسؤول مباشر. هذا أول ما يُسأل عنه عند التقييم أو المشكلة.',
    hrAttnProbationHint: 'قرار التثبيت أو التمديد يجب أن يُتخذ قبل أن يمر التاريخ.',
    hrAttnOnboardingHint:
      'مهام إلزامية متبقية — بعضها (الرقم الضريبي والحساب البنكي) يمنع صرف الراتب.',
    hrAttnOffboardingHint:
      'مضى آخر يوم عمل ولم يُغلق الملف — الصلاحيات والعهد قد تكون ما زالت مفتوحة.',
    hrAttnAllClear:
      'لا شيء يحتاج انتباهك اليوم — العقود والوثائق والرواتب والحضور كلها سليمة.',

    // ── صندوق الموافقات ──────────────────────────────────────────────────────
    hrInboxTitle: 'الموافقات المعلّقة',
    hrInboxRefresh: 'تحديث',
    hrInboxEmpty: 'لا يوجد شيء ينتظر قرارك الآن.',
    hrInboxLeave: 'طلبات الإجازة',
    hrInboxOvertime: 'الوقت الإضافي بانتظار الموافقة',
    hrInboxApprove: 'موافقة',
    hrInboxReject: 'رفض',
    hrInboxBalanceLeft: 'الرصيد المتبقي',
    hrInboxLeaveApproved: 'تمت الموافقة على الإجازة',
    hrInboxLeaveRejected: 'تم رفض الإجازة',
    hrInboxReturnedToPending: 'أُعيد الطلب إلى قائمة الانتظار',
    hrInboxOvertimeApproved: 'تمت الموافقة على الوقت الإضافي',
    hrInboxApprovalWithdrawn: 'تم سحب الموافقة',
    hrInboxSubtitle:
      'كل طلبات الإجازات والوقت الإضافي في مكان واحد، بلا حاجة لفتح ملف كل موظف.',
    hrInboxCouldNotRequest: 'تعذّر تحديث الطلب',
    hrInboxCouldNotRecord: 'تعذّر تحديث السجل',
    hrInboxOverBalance:
      'الطلب يتجاوز الرصيد المتاح ({left} يوم). الموافقة تعني رصيداً بالسالب.',
    hrInboxOvertimeHint: 'الساعات المعتمدة فقط تدخل في الرواتب.',
    hrInboxUndoHint:
      'أُخطئت في قرار؟ افتح ملف الموظف — يمكن إعادة طلب الإجازة إلى قائمة الانتظار، وسحب الموافقة على الوقت الإضافي، دون حذف أي سجل.',
    hrInboxAttendanceHint:
      'الموافقة على الإجازة تُسجَّل تلقائياً في كشف الحضور، ويُلغى هذا التسجيل إذا رفضت الطلب لاحقاً.',
    hrInboxDay: 'يوم',
    hrInboxDaysPlural: 'أيام',

    // ── جدول الفريق ──────────────────────────────────────────────────────────
    hrTeamApprovals: 'الموافقات',
    hrTeamActive: 'مُطبَّق:',
    hrTeamClearAll: 'مسح الكل',
}
