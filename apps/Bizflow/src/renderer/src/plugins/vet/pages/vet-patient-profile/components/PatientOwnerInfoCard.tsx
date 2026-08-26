import { User, Phone, Mail, MapPin, MessageCircle } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function PatientOwnerInfoCard({ owner }: { owner: any }) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  if (!owner) return null

  const handleWhatsApp = () => {
    const cleanPhone = owner.phone?.replace(/[^0-9]/g, '')
    if (cleanPhone) window.open(`https://wa.me/${cleanPhone}`, '_blank')
  }

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <User size={14} className="text-violet-500" />
          {isAr ? 'المالك المسؤول' : 'Owner Information'}
        </h3>
        <button
          type="button"
          onClick={handleWhatsApp}
          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
        >
          <MessageCircle size={13} />
          <span>WhatsApp</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
        <span className="font-bold text-slate-900 dark:text-white text-sm">{owner.name}</span>
        <a
          href={`tel:${owner.phone}`}
          className="font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
          dir="ltr"
        >
          <Phone size={12} /> {owner.phone}
        </a>
        {owner.email && (
          <a
            href={`mailto:${owner.email}`}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 flex items-center gap-1 truncate max-w-[200px]"
          >
            <Mail size={12} /> {owner.email}
          </a>
        )}
        {owner.address && (
          <span className="text-slate-400 flex items-center gap-1">
            <MapPin size={12} /> {owner.address}
          </span>
        )}
      </div>
    </div>
  )
}