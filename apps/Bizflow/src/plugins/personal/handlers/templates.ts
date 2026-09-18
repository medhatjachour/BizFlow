// ─── Personal Work: Static configuration & seed data ─────────────────────────
// Taxonomy consumed by the handlers and surfaced to the renderer through the
// `personal:meta:getConfig` channel, plus the shipped playbook scripts and
// pre-flight checklist templates.
// ─────────────────────────────────────────────────────────────────────────────

export type OptionItem = { id: string; label: string; labelAr: string }

export const TASK_STATUSES: OptionItem[] = [
  { id: 'backlog', label: 'Backlog', labelAr: 'قائمة الانتظار' },
  { id: 'today', label: 'Today', labelAr: 'اليوم' },
  { id: 'in_progress', label: 'In progress', labelAr: 'قيد التنفيذ' },
  { id: 'blocked', label: 'Blocked', labelAr: 'متوقف' },
  { id: 'done', label: 'Done', labelAr: 'منجز' },
  { id: 'cancelled', label: 'Cancelled', labelAr: 'ملغى' }
]

export const TASK_TYPES: OptionItem[] = [
  { id: 'deliverable', label: 'Deliverable', labelAr: 'مُخرَج تسليم' },
  { id: 'admin', label: 'Admin', labelAr: 'إداري' },
  { id: 'sales', label: 'Sales', labelAr: 'بيع وعروض' },
  { id: 'learning', label: 'Learning', labelAr: 'تعلّم' }
]

export const WAIT_REASONS: OptionItem[] = [
  { id: 'assets', label: 'Waiting for assets', labelAr: 'بانتظار الملفات' },
  { id: 'copy', label: 'Waiting for copy/content', labelAr: 'بانتظار المحتوى' },
  { id: 'credentials', label: 'Waiting for access/credentials', labelAr: 'بانتظار بيانات الدخول' },
  { id: 'review', label: 'Waiting for review/feedback', labelAr: 'بانتظار المراجعة' },
  { id: 'payment', label: 'Waiting for payment', labelAr: 'بانتظار الدفع' },
  { id: 'other', label: 'Other', labelAr: 'أخرى' }
]

export const PROJECT_STATUSES: OptionItem[] = [
  { id: 'lead', label: 'Lead', labelAr: 'عرض' },
  { id: 'active', label: 'Active', labelAr: 'نشط' },
  { id: 'paused', label: 'Paused', labelAr: 'متوقف مؤقتاً' },
  { id: 'delivered', label: 'Delivered', labelAr: 'تم التسليم' },
  { id: 'closed', label: 'Closed', labelAr: 'مغلق' }
]

export const PRICING_TYPES: OptionItem[] = [
  { id: 'fixed', label: 'Fixed price', labelAr: 'سعر ثابت' },
  { id: 'hourly', label: 'Hourly', labelAr: 'بالساعة' },
  { id: 'retainer', label: 'Retainer', labelAr: 'اشتراك شهري' }
]

export const INVOICE_KINDS: OptionItem[] = [
  { id: 'deposit', label: 'Deposit', labelAr: 'دفعة مقدمة' },
  { id: 'milestone', label: 'Milestone', labelAr: 'مرحلة' },
  { id: 'final', label: 'Final payment', labelAr: 'الدفعة النهائية' },
  { id: 'retainer', label: 'Retainer', labelAr: 'اشتراك شهري' },
  { id: 'change_request', label: 'Change request', labelAr: 'طلب إضافي' }
]

export const INVOICE_STATUSES: OptionItem[] = [
  { id: 'draft', label: 'Draft', labelAr: 'مسودة' },
  { id: 'sent', label: 'Sent', labelAr: 'مُرسلة' },
  { id: 'partial', label: 'Partially paid', labelAr: 'مدفوعة جزئياً' },
  { id: 'paid', label: 'Paid', labelAr: 'مدفوعة' },
  { id: 'overdue', label: 'Overdue', labelAr: 'متأخرة' },
  { id: 'void', label: 'Void', labelAr: 'ملغاة' }
]

export const CHANGE_REQUEST_STATUSES: OptionItem[] = [
  { id: 'draft', label: 'Draft', labelAr: 'مسودة' },
  { id: 'quoted', label: 'Quote sent', labelAr: 'تم إرسال العرض' },
  { id: 'approved', label: 'Approved', labelAr: 'موافق عليه' },
  { id: 'declined', label: 'Declined', labelAr: 'مرفوض' },
  { id: 'invoiced', label: 'Invoiced', labelAr: 'تمت الفاتورة' }
]

export const EXPENSE_CATEGORIES: OptionItem[] = [
  { id: 'software', label: 'Software', labelAr: 'برمجيات' },
  { id: 'equipment', label: 'Equipment', labelAr: 'معدات' },
  { id: 'hosting', label: 'Hosting & domains', labelAr: 'استضافة ونطاقات' },
  { id: 'marketing', label: 'Marketing', labelAr: 'تسويق' },
  { id: 'education', label: 'Education', labelAr: 'تعليم' },
  { id: 'travel', label: 'Travel', labelAr: 'سفر' },
  { id: 'fees', label: 'Bank & platform fees', labelAr: 'رسوم بنكية ومنصات' },
  { id: 'taxes', label: 'Taxes', labelAr: 'ضرائب' },
  { id: 'other', label: 'Other', labelAr: 'أخرى' }
]

export const SUBSCRIPTION_CATEGORIES: OptionItem[] = [
  { id: 'software', label: 'Design & dev tools', labelAr: 'أدوات التصميم والبرمجة' },
  { id: 'ai', label: 'AI tools', labelAr: 'أدوات الذكاء الاصطناعي' },
  { id: 'storage', label: 'Storage & backup', labelAr: 'تخزين ونسخ احتياطي' },
  { id: 'marketing', label: 'Marketing', labelAr: 'تسويق' },
  { id: 'learning', label: 'Learning', labelAr: 'تعلّم' },
  { id: 'other', label: 'Other', labelAr: 'أخرى' }
]

export const BILLING_CYCLES: OptionItem[] = [
  { id: 'weekly', label: 'Weekly', labelAr: 'أسبوعي' },
  { id: 'monthly', label: 'Monthly', labelAr: 'شهري' },
  { id: 'quarterly', label: 'Quarterly', labelAr: 'ربع سنوي' },
  { id: 'yearly', label: 'Yearly', labelAr: 'سنوي' }
]

export const USAGE_LEVELS: OptionItem[] = [
  { id: 'daily', label: 'Daily', labelAr: 'يومياً' },
  { id: 'weekly', label: 'Weekly', labelAr: 'أسبوعياً' },
  { id: 'monthly', label: 'Monthly', labelAr: 'شهرياً' },
  { id: 'rarely', label: 'Rarely / never', labelAr: 'نادراً أو لا أستخدمه' }
]

export const BLACKOUT_KINDS: OptionItem[] = [
  { id: 'vacation', label: 'Vacation', labelAr: 'إجازة' },
  { id: 'personal', label: 'Personal day', labelAr: 'يوم شخصي' },
  { id: 'study', label: 'Study day', labelAr: 'يوم دراسة' },
  { id: 'holiday', label: 'Public holiday', labelAr: 'عطلة رسمية' },
  { id: 'sick', label: 'Sick leave', labelAr: 'إجازة مرضية' }
]

export const FOCUS_KINDS: OptionItem[] = [
  { id: 'flow', label: 'Deep work (flow)', labelAr: 'عمل عميق' },
  { id: 'pomodoro', label: 'Pomodoro', labelAr: 'بومودورو' },
  { id: 'break', label: 'Break', labelAr: 'استراحة' },
  { id: 'manual', label: 'Manual entry', labelAr: 'إدخال يدوي' }
]

export const NOTE_KINDS: OptionItem[] = [
  { id: 'note', label: 'Note', labelAr: 'ملاحظة' },
  { id: 'credential', label: 'Credentials', labelAr: 'بيانات دخول' },
  { id: 'brand', label: 'Brand assets', labelAr: 'هوية العلامة' },
  { id: 'link', label: 'Links & drives', labelAr: 'روابط ومجلدات' }
]

export const SCRIPT_CATEGORIES: OptionItem[] = [
  { id: 'deposit_request', label: 'Deposit request', labelAr: 'طلب الدفعة المقدمة' },
  { id: 'scope_creep', label: 'Scope creep pushback', labelAr: 'الرد على الطلبات الإضافية' },
  { id: 'late_feedback', label: 'Late feedback notice', labelAr: 'إشعار تأخر الملاحظات' },
  { id: 'overdue_1', label: 'Overdue · Level 1 (gentle)', labelAr: 'فاتورة متأخرة · مستوى ١ (ودّي)' },
  { id: 'overdue_2', label: 'Overdue · Level 2 (formal)', labelAr: 'فاتورة متأخرة · مستوى ٢ (رسمي)' },
  { id: 'overdue_3', label: 'Overdue · Level 3 (work stopped)', labelAr: 'فاتورة متأخرة · مستوى ٣ (إيقاف العمل)' },
  { id: 'kickoff', label: 'Project kickoff', labelAr: 'بدء المشروع' },
  { id: 'delivery', label: 'Delivery & hand-over', labelAr: 'التسليم' },
  { id: 'handover', label: 'Final hand-over & testimonial', labelAr: 'التسليم النهائي والتوصية' },
  { id: 'general', label: 'General', labelAr: 'عام' }
]

export const PROFESSIONS: OptionItem[] = [
  { id: 'general', label: 'General', labelAr: 'عام' },
  { id: 'developer', label: 'Developer', labelAr: 'مطوّر' },
  { id: 'designer', label: 'Designer', labelAr: 'مصمم' },
  { id: 'photographer', label: 'Photographer / video', labelAr: 'مصور / فيديو' },
  { id: 'writer', label: 'Writer / content', labelAr: 'كاتب / محتوى' },
  { id: 'consultant', label: 'Consultant', labelAr: 'مستشار' },
  { id: 'marketer', label: 'Marketer', labelAr: 'مسوّق' }
]

// ─── Pre-flight delivery checklists (per profession) ─────────────────────────

export const DEFAULT_CHECKLIST_TEMPLATES: Array<{
  name: string
  profession: string
  isDefault: boolean
  items: string[]
}> = [
  {
    name: 'Developer — pre-flight release',
    profession: 'developer',
    isDefault: true,
    items: [
      'Environment variables removed or documented, no secrets committed',
      'README updated with setup, run and deploy steps',
      'Staging deployed and smoke-tested end to end',
      'License file attached and third-party notices listed',
      'Build artefacts tagged and changelog written',
      'Database migrations tested on a copy of production data',
      '.gitignore reviewed for local config and credentials',
      'Hand-over call booked or walkthrough recorded'
    ]
  },
  {
    name: 'Designer — pre-flight hand-over',
    profession: 'designer',
    isDefault: true,
    items: [
      'Fonts outlined or licences handed over with the files',
      'Export assets organised by folder (@2x, .svg, .pdf)',
      'Colour tokens and brand hex codes documented',
      'Source files cleaned of stray layers and hidden text',
      'Every screen the client approved is included',
      'Print-ready PDF checked for bleed, CMYK and flattening',
      'Naming convention applied to all files',
      'Delivery note with dimensions and usage rights attached'
    ]
  },
  {
    name: 'Photographer / video — pre-flight delivery',
    profession: 'photographer',
    isDefault: true,
    items: [
      'Raw files backed up to two locations',
      'EXIF/metadata stripped or tagged as contract requires',
      'sRGB export profile verified on a calibrated screen',
      'Delivery gallery/download link created and permission-tested',
      'Watermark removed from paid deliveries only',
      'Usage licence and model releases attached',
      'Selected frames match the approved shot list count',
      'Compressed preview set exported for social use'
    ]
  },
  {
    name: 'Writer / content — pre-flight delivery',
    profession: 'writer',
    isDefault: true,
    items: [
      'Word count and brief requirements verified',
      'Plagiarism and AI-detection check run',
      'References and citations formatted to the agreed style',
      'Headings and SEO metadata supplied if in scope',
      'Round count vs. agreed revision rounds confirmed',
      'Editable source file plus exported PDF/DOCX provided',
      'Brand tone and terminology guide followed',
      'Quotes and statistics dated and sourced'
    ]
  },
  {
    name: 'Consultant — pre-flight engagement close',
    profession: 'consultant',
    isDefault: true,
    items: [
      'Final deliverable reviewed against the signed scope',
      'Recommendations separated from optional extras',
      'All client data deleted from personal storage',
      'Action log with owners and dates handed over',
      'Follow-up and support window defined in writing',
      'Final invoice issued with the payment terms stated',
      'Case-study permission asked for',
      'Testimonial and referral request sent'
    ]
  },
  {
    name: 'General — before you send anything',
    profession: 'general',
    isDefault: true,
    items: [
      'Deliverables match the agreed baseline scope',
      'Outstanding balance settled or invoiced',
      'Client visible to-do list cleared',
      'Files named consistently and zipped if multiple',
      'Cover message written with what changed and next steps',
      'Backup copy archived locally'
    ]
  }
]

// ─── Shipped playbook scripts ────────────────────────────────────────────────

export type SeedScript = {
  title: string
  category: string
  tone: string
  level: number
  language: string
  body: string
}

export const DEFAULT_SCRIPTS: SeedScript[] = [
  {
    title: 'Deposit request before kickoff',
    category: 'deposit_request',
    tone: 'polite',
    level: 1,
    language: 'en',
    body: [
      'Hi {clientName},',
      '',
      'Thanks for approving the brief for {projectName}.',
      '',
      `To lock the schedule and start on {startDate}, I need the agreed {depositPercent}% deposit of {depositAmount}.`,
      `Payment details: {paymentDetails}`,
      '',
      'As soon as it lands I will confirm the slot and begin with {firstStep}.',
      '',
      'Thanks!'
    ].join('\n')
  },
  {
    title: 'Scope creep pushback',
    category: 'scope_creep',
    tone: 'professional',
    level: 1,
    language: 'en',
    body: [
      'Hi {clientName},',
      '',
      `Happy to take on {extraRequest}.`,
      '',
      `That request sits outside the agreed scope for {projectName}, so I have logged it as a change request:`,
      '• Extra effort: {extraHours} hours',
      '• Extra cost: {extraCost}',
      '• Timeline impact: {extraDays} working days',
      '',
      'If you approve the change I will schedule it immediately. Existing milestones stay on track either way.',
      '',
      'Thanks!'
    ].join('\n')
  },
  {
    title: 'Late feedback notice',
    category: 'late_feedback',
    tone: 'polite',
    level: 1,
    language: 'en',
    body: [
      'Hi {clientName},',
      '',
      `Quick status note on {projectName}: I have been waiting on {waitingFor} since {waitStartDate} — that is {waitDays} working days.`,
      '',
      'My delivery date moves day-for-day with client-side delays, so the current deadline shifts to {newDeadline}.',
      '',
      'If you can share {waitingFor} by {targetDate} we can hold the original date.',
      '',
      'Thanks!'
    ].join('\n')
  },
  {
    title: 'Overdue invoice · Level 1 (gentle)',
    category: 'overdue_1',
    tone: 'friendly',
    level: 1,
    language: 'en',
    body: [
      'Hi {clientName},',
      '',
      `Just a friendly nudge — invoice {invoiceNumber} for {amount} was due on {dueDate}.`,
      '',
      'If it has already been paid, please ignore this note. Otherwise, could you let me know the expected payment date?',
      '',
      'Happy to re-send the invoice if that helps.',
      '',
      'Thanks!'
    ].join('\n')
  },
  {
    title: 'Overdue invoice · Level 2 (formal)',
    category: 'overdue_2',
    tone: 'formal',
    level: 2,
    language: 'en',
    body: [
      'Dear {clientName},',
      '',
      `Invoice {invoiceNumber} for {amount}, issued on {issueDate}, remains unpaid and is now {daysOverdue} days overdue.`,
      '',
      `Please arrange payment by {newDueDate}. If there is an issue with the invoice or your internal process, tell me today and I will help resolve it.`,
      '',
      'Regards,',
      '{yourName}'
    ].join('\n')
  },
  {
    title: 'Overdue invoice · Level 3 (work stopped)',
    category: 'overdue_3',
    tone: 'formal',
    level: 3,
    language: 'en',
    body: [
      'Dear {clientName},',
      '',
      `Despite previous reminders, invoice {invoiceNumber} for {amount} is now {daysOverdue} days overdue.`,
      '',
      'As stated in our agreement, all work on your account is paused from today and {projectName} deadlines are suspended until the balance is settled.',
      `The outstanding amount is {amount}, payable to {paymentDetails}.`,
      '',
      'I am keen to complete the remaining scope as soon as this is resolved.',
      '',
      'Regards,',
      '{yourName}'
    ].join('\n')
  },
  {
    title: 'Project kickoff confirmation',
    category: 'kickoff',
    tone: 'polite',
    level: 1,
    language: 'en',
    body: [
      'Hi {clientName},',
      '',
      `Great news — {projectName} is confirmed and starts on {startDate}.`,
      '',
      'What is included:',
      '{deliverableList}',
      '',
      `Rounds of edits: {rounds}`,
      `Final delivery: {deliveryDate}`,
      `Total investment: {agreedAmount}`,
      '',
      `To keep us on schedule I will need {requiredInputs} by {inputDate}.`,
      '',
      'Thanks!'
    ].join('\n')
  },
  {
    title: 'Draft delivery & feedback request',
    category: 'delivery',
    tone: 'polite',
    level: 1,
    language: 'en',
    body: [
      'Hi {clientName},',
      '',
      `Here is the draft for {projectName}: {deliveryLink}`,
      '',
      `Please send all consolidated feedback in one message by {feedbackDeadline} so the schedule holds.`,
      `This is round {roundNumber} of {rounds}.`,
      '',
      'Once you confirm, I move to {nextStage}.',
      '',
      'Thanks!'
    ].join('\n')
  },
  {
    title: 'Final hand-over & testimonial request',
    category: 'handover',
    tone: 'warm',
    level: 1,
    language: 'en',
    body: [
      'Hi {clientName},',
      '',
      `All final files for {projectName} are attached and access is live: {handoverLink}`,
      '',
      'Everything on the pre-flight checklist has been completed and the balance is settled — thank you.',
      '',
      'If you have two minutes, a short testimonial would mean a lot, and I would be glad to help with {nextPhase} whenever you are ready.',
      '',
      'Thanks again for a great project!'
    ].join('\n')
  },
  {
    title: 'طلب الدفعة المقدمة',
    category: 'deposit_request',
    tone: 'polite',
    level: 1,
    language: 'ar',
    body: [
      'مرحباً {clientName}،',
      '',
      'شكراً لموافقتك على متطلبات مشروع {projectName}.',
      '',
      `لتثبيت الموعد والبدء في {startDate}، أحتاج الدفعة المقدمة المتفق عليها {depositPercent}% وقيمتها {depositAmount}.`,
      `تفاصيل الدفع: {paymentDetails}`,
      '',
      'بمجرد وصول الدفعة سأؤكد الموعد وأبدأ بـ {firstStep}.',
      '',
      'شكراً لك!'
    ].join('\n')
  },
  {
    title: 'الرد على الطلبات الإضافية',
    category: 'scope_creep',
    tone: 'professional',
    level: 1,
    language: 'ar',
    body: [
      'مرحباً {clientName}،',
      '',
      `يسعدني تنفيذ {extraRequest}.`,
      '',
      `هذا الطلب خارج النطاق المتفق عليه في مشروع {projectName}، لذلك سجّلته كطلب تغيير:`,
      '• الجهد الإضافي: {extraHours} ساعة',
      '• التكلفة الإضافية: {extraCost}',
      '• تأثير المدة: {extraDays} أيام عمل',
      '',
      'بمجرد الموافقة سأجدوله فوراً، وتبقى المراحل الحالية كما هي.',
      '',
      'شكراً لك!'
    ].join('\n')
  },
  {
    title: 'إشعار تأخر الملاحظات',
    category: 'late_feedback',
    tone: 'polite',
    level: 1,
    language: 'ar',
    body: [
      'مرحباً {clientName}،',
      '',
      `ملاحظة سريعة عن {projectName}: أنتظر {waitingFor} منذ {waitStartDate} أي {waitDays} أيام عمل.`,
      '',
      'موعد التسليم يتأخر يوماً مقابل كل يوم تأخير من جهة العميل، لذلك الموعد الحالي أصبح {newDeadline}.',
      '',
      `إذا وصلني {waitingFor} قبل {targetDate} سنحافظ على الموعد الأصلي.`,
      '',
      'شكراً لك!'
    ].join('\n')
  },
  {
    title: 'فاتورة متأخرة · المستوى الأول (ودّي)',
    category: 'overdue_1',
    tone: 'friendly',
    level: 1,
    language: 'ar',
    body: [
      'مرحباً {clientName}،',
      '',
      `تذكير ودّي — الفاتورة {invoiceNumber} بمبلغ {amount} كان موعدها {dueDate}.`,
      '',
      'إذا تم الدفع بالفعل فتجاهل هذه الرسالة، وإلا فأخبرني بالموعد المتوقع للدفع من فضلك.',
      '',
      'يمكنني إعادة إرسال الفاتورة إن كان ذلك مفيداً.',
      '',
      'شكراً لك!'
    ].join('\n')
  },
  {
    title: 'فاتورة متأخرة · المستوى الثاني (رسمي)',
    category: 'overdue_2',
    tone: 'formal',
    level: 2,
    language: 'ar',
    body: [
      'عزيزي {clientName}،',
      '',
      `الفاتورة {invoiceNumber} بمبلغ {amount} الصادرة بتاريخ {issueDate} لم تُسدَّد بعد، ومتأخرة الآن {daysOverdue} يوماً.`,
      '',
      `أرجو ترتيب الدفع قبل {newDueDate}. وإن كان هناك أي إشكال في الفاتورة أو في إجراءاتكم الداخلية فأخبرني اليوم وسأساعد في حله.`,
      '',
      'مع التقدير،',
      '{yourName}'
    ].join('\n')
  },
  {
    title: 'فاتورة متأخرة · المستوى الثالث (إيقاف العمل)',
    category: 'overdue_3',
    tone: 'formal',
    level: 3,
    language: 'ar',
    body: [
      'عزيزي {clientName}،',
      '',
      `رغم التذكيرات السابقة، الفاتورة {invoiceNumber} بمبلغ {amount} متأخرة الآن {daysOverdue} يوماً.`,
      '',
      `وفقاً لاتفاقنا، تم إيقاف جميع الأعمال على حسابكم اعتباراً من اليوم وتم تعليق مواعيد {projectName} حتى تسوية الرصيد.`,
      `المبلغ المستحق {amount} ويمكن دفعه عبر {paymentDetails}.`,
      '',
      'أتمنى إكمال ما تبقى من العمل فور تسوية الأمر.',
      '',
      'مع التقدير،',
      '{yourName}'
    ].join('\n')
  },
  {
    title: 'تأكيد بدء المشروع',
    category: 'kickoff',
    tone: 'polite',
    level: 1,
    language: 'ar',
    body: [
      'مرحباً {clientName}،',
      '',
      `خبر جيد — تم تأكيد مشروع {projectName} ويبدأ في {startDate}.`,
      '',
      'ما يشمله المشروع:',
      '{deliverableList}',
      '',
      `جولات التعديل: {rounds}`,
      `التسليم النهائي: {deliveryDate}`,
      `القيمة الإجمالية: {agreedAmount}`,
      '',
      `وللحفاظ على الجدول أحتاج {requiredInputs} قبل {inputDate}.`,
      '',
      'شكراً لك!'
    ].join('\n')
  },
  {
    title: 'تسليم المسودة وطلب الملاحظات',
    category: 'delivery',
    tone: 'polite',
    level: 1,
    language: 'ar',
    body: [
      'مرحباً {clientName}،',
      '',
      `هذه مسودة {projectName}: {deliveryLink}`,
      '',
      `أرجو إرسال كل الملاحظات في رسالة واحدة قبل {feedbackDeadline} للحفاظ على الجدول.`,
      `هذه الجولة {roundNumber} من {rounds}.`,
      '',
      'بعد موافقتك أنتقل إلى {nextStage}.',
      '',
      'شكراً لك!'
    ].join('\n')
  },
  {
    title: 'التسليم النهائي وطلب التوصية',
    category: 'handover',
    tone: 'warm',
    level: 1,
    language: 'ar',
    body: [
      'مرحباً {clientName}،',
      '',
      `جميع الملفات النهائية لمشروع {projectName} مرفقة والوصول متاح: {handoverLink}`,
      '',
      'تم إنجاز كل بنود قائمة ما قبل التسليم وتمت تسوية الرصيد — شكراً لك.',
      '',
      'إن سمح وقتك، سأقدّر كلمة توصية قصيرة، ويسعدني المساعدة في {nextPhase} متى أردت.',
      '',
      'شكراً جزيلاً على هذا المشروع الرائع!'
    ].join('\n')
  }
]
