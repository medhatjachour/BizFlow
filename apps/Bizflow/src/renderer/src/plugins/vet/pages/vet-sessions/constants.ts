export const BUILTIN_VISIT_TYPES = [
  { value: 'wellness_exam', labelEn: 'Wellness Exam', labelAr: 'فحص دوري شامل' },
  { value: 'visit', labelEn: 'General Visit', labelAr: 'زيارة عامة' },
  { value: 'consultation', labelEn: 'Consultation', labelAr: 'استشارة طبية' },
  { value: 'vaccination', labelEn: 'Vaccination', labelAr: 'تطعيم ولقاحات' },
  { value: 'sonar', labelEn: 'Sonar / Ultrasound', labelAr: 'سونار وتصوير' },
  { value: 'lab_test', labelEn: 'Lab Diagnostic', labelAr: 'تحاليل مخبرية' },
  { value: 'dental', labelEn: 'Dental Care', labelAr: 'علاج ورعاية الأسنان' },
  { value: 'surgery', labelEn: 'Surgery Operation', labelAr: 'عملية جراحية' },
  { value: 'emergency', labelEn: 'Emergency', labelAr: 'حالة طوارئ عاجلة' },
  { value: 'follow_up', labelEn: 'Follow-up Check', labelAr: 'فحص متابعة' },
  { value: 'deworming', labelEn: 'Deworming & Parasites', labelAr: 'علاج ديدان وطفيليات' },
  { value: 'grooming', labelEn: 'Grooming & Care', labelAr: 'عناية وقص ونظافة' }
]

export const VISIT_TYPE_COLORS: Record<string, string> = {
  wellness_exam: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  visit: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  consultation: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  vaccination: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  sonar: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  lab_test: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
  dental: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  surgery: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  emergency: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  follow_up: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  deworming: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  grooming: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
}

export const PAYMENT_STATUS_CONFIG: Record<string, { bg: string; text: string; labelEn: string; labelAr: string }> = {
  paid: {
    bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    labelEn: 'Paid',
    labelAr: 'مدفوع بالكامل'
  },
  partial: {
    bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    labelEn: 'Partial',
    labelAr: 'دفع جزئي'
  },
  unpaid: {
    bg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    text: 'text-rose-700 dark:text-rose-300',
    labelEn: 'Unpaid',
    labelAr: 'غير مدفوع'
  },
  waived: {
    bg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    text: 'text-slate-500 dark:text-slate-400',
    labelEn: 'Waived',
    labelAr: 'معفى / مجاني'
  }
}

export const SESSION_PAYMENT_METHODS = [
  { id: 'cash', labelEn: 'Cash', labelAr: 'نقدي (كاش)' },
  { id: 'card', labelEn: 'Credit / POS Card', labelAr: 'بطاقة بنكية' },
  { id: 'insurance', labelEn: 'Pet Insurance', labelAr: 'تأمين طبي' },
  { id: 'other', labelEn: 'Other Transfer', labelAr: 'طريقة أخرى' }
]

export const SWATCH_COLORS = [
  '#6366f1', '#06b6d4', '#0ea5e9', '#3b82f6', '#14b8a6',
  '#84cc16', '#f59e0b', '#ef4444', '#f97316', '#a855f7',
  '#10b981', '#ec4899', '#64748b'
]