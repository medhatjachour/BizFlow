import {
  Building2, Zap, Stethoscope, Pill, Wrench,
  Shield, Megaphone, Sparkles, Users, MoreHorizontal,
  Package, FlaskConical, CreditCard, Banknote, Building
} from 'lucide-react'

export const EXPENSE_CATEGORIES = [
  { id: 'rent', icon: Building2, labelEn: 'Rent & Lease', labelAr: 'الإيجار والمقر', tone: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' },
  { id: 'utilities', icon: Zap, labelEn: 'Utilities (Elec/Water)', labelAr: 'فواتير وخدمات', tone: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  { id: 'medical_supplies', icon: Stethoscope, labelEn: 'Medical Supplies', labelAr: 'مستلزمات طبية', tone: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800' },
  { id: 'medications', icon: Pill, labelEn: 'Medications Stock', labelAr: 'شراء أدوية', tone: 'text-violet-500 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800' },
  { id: 'equipment', icon: Package, labelEn: 'Equipment & Devices', labelAr: 'أجهزة ومعدات', tone: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800' },
  { id: 'maintenance', icon: Wrench, labelEn: 'Maintenance & Repairs', labelAr: 'صيانة وإصلاحات', tone: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800' },
  { id: 'lab_fees', icon: FlaskConical, labelEn: 'Lab Diagnostic Fees', labelAr: 'رسوم تحاليل ومختبر', tone: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800' },
  { id: 'insurance', icon: Shield, labelEn: 'Clinic Insurance', labelAr: 'تأمين ورخص', tone: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
  { id: 'marketing', icon: Megaphone, labelEn: 'Marketing & Ads', labelAr: 'تسويق وإعلانات', tone: 'text-pink-500 bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800' },
  { id: 'cleaning', icon: Sparkles, labelEn: 'Cleaning & Waste', labelAr: 'نظافة ونفايات طبية', tone: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800' },
  { id: 'salaries', icon: Users, labelEn: 'Staff Salaries', labelAr: 'رواتب وأجور', tone: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800' },
  { id: 'other', icon: MoreHorizontal, labelEn: 'Miscellaneous / Other', labelAr: 'مصاريف أخرى', tone: 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700' }
]

export const PAYMENT_METHODS = [
  { id: 'cash', icon: Banknote, labelEn: 'Cash', labelAr: 'نقدي (كاش)' },
  { id: 'card', icon: CreditCard, labelEn: 'Card / POS', labelAr: 'بطاقة بنكية' },
  { id: 'bank_transfer', icon: Building, labelEn: 'Bank Transfer', labelAr: 'تحويل بنكي' },
  { id: 'other', icon: MoreHorizontal, labelEn: 'Other Method', labelAr: 'طريقة أخرى' }
]