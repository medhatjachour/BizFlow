export const EMP_TYPES = [
  { value: 'full_time', labelKey: 'vetEmpFullTime', fallback: 'Full-time', ar: 'دوام كامل' },
  { value: 'part_time', labelKey: 'vetEmpPartTime', fallback: 'Part-time', ar: 'دوام جزئي' },
  { value: 'contract', labelKey: 'vetEmpContract', fallback: 'Contract', ar: 'عقد مؤقت' }
]

export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; labelEn: string; labelAr: string }> = {
  active: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    labelEn: 'Active',
    labelAr: 'نشط'
  },
  inactive: {
    bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    text: 'text-slate-600 dark:text-slate-400',
    dot: 'bg-slate-400',
    labelEn: 'Inactive',
    labelAr: 'غير نشط'
  }
}

export const SESSION_STATUS_CONFIG: Record<string, { badge: string; labelEn: string; labelAr: string }> = {
  completed: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', labelEn: 'Completed', labelAr: 'مكتمل' },
  active: { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', labelEn: 'In Progress', labelAr: 'قيد الإجراء' },
  cancelled: { badge: 'bg-rose-100 text-rose-700 dark:text-rose-400 dark:bg-rose-900/30', labelEn: 'Cancelled', labelAr: 'ملغي' },
  scheduled: { badge: 'bg-violet-100 text-violet-700 dark:text-violet-400 dark:bg-violet-900/30', labelEn: 'Scheduled', labelAr: 'مجدول' },
  confirmed: { badge: 'bg-teal-100 text-teal-700 dark:text-teal-400 dark:bg-teal-900/30', labelEn: 'Confirmed', labelAr: 'مؤكد' },
  no_show: { badge: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400', labelEn: 'No Show', labelAr: 'لم يحضر' }
}

export const VISIT_TYPE_TRANSLATIONS: Record<string, { en: string; ar: string }> = {
  wellness_exam: { en: 'Wellness Exam', ar: 'فحص دوري' },
  vaccination: { en: 'Vaccination', ar: 'تطعيم ولقاحات' },
  surgery: { en: 'Surgery', ar: 'عملية جراحية' },
  emergency: { en: 'Emergency', ar: 'حالة طوارئ' },
  follow_up: { en: 'Follow-up', ar: 'متابعة وفحص' },
  grooming: { en: 'Grooming', ar: 'عناية ونظافة' }
}