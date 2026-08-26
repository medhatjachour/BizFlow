export const APPT_TYPES = [
  { value: 'consultation', labelEn: 'Consultation', labelAr: 'استشارة طبية', tone: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
  { value: 'follow_up', labelEn: 'Follow-up', labelAr: 'فحص متابعة', tone: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800' },
  { value: 'vaccination', labelEn: 'Vaccination', labelAr: 'تطعيم ولقاحات', tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800' },
  { value: 'surgery', labelEn: 'Surgery', labelAr: 'عملية جراحية', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  { value: 'grooming', labelEn: 'Grooming', labelAr: 'نظافة وعناية', tone: 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200 dark:border-pink-800' },
  { value: 'checkup', labelEn: 'General Checkup', labelAr: 'فحص عام', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' }
]

export const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; labelEn: string; labelAr: string }> = {
  scheduled: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-900',
    text: 'text-blue-700 dark:text-blue-300',
    labelEn: 'Scheduled',
    labelAr: 'مجدول'
  },
  confirmed: {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    border: 'border-teal-200 dark:border-teal-900',
    text: 'text-teal-700 dark:text-teal-300',
    labelEn: 'Confirmed',
    labelAr: 'مؤكد'
  },
  completed: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-900',
    text: 'text-emerald-700 dark:text-emerald-300',
    labelEn: 'Completed',
    labelAr: 'مكتمل'
  },
  cancelled: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
    text: 'text-slate-500 dark:text-slate-400',
    labelEn: 'Cancelled',
    labelAr: 'ملغي'
  },
  no_show: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-900',
    text: 'text-rose-700 dark:text-rose-300',
    labelEn: 'No Show',
    labelAr: 'لم يحضر'
  }
}

export const DURATION_PRESETS = [15, 30, 45, 60]