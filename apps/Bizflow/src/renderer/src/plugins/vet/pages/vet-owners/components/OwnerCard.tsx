import { useState } from 'react'
import {
  PawPrint, Phone, Mail, MapPin, Eye, Plus, Pencil, Trash2,
  ChevronDown, ChevronUp, Calendar, Activity, MessageCircle
} from 'lucide-react'
import { VetOwnerWithPets, VetOwner } from '../types'
import { getOwnerInitials } from '../utils'
import { speciesEmoji, speciesLabel } from '../species'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  owner: VetOwnerWithPets
  onEdit: () => void
  onDelete: () => void
  onAddPet: () => void
  onViewProfile: () => void
  onWalkIn: (p: { id: string; name: string; species: string; ownerId: string; owner: VetOwner }) => void
  onBook: (p: { id: string; name: string; species: string; ownerId: string; owner: VetOwner }) => void
  onViewPet: (petId: string) => void
}

export function OwnerCard({
  owner,
  onEdit,
  onDelete,
  onAddPet,
  onViewProfile,
  onWalkIn,
  onBook,
  onViewPet
}: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [expanded, setExpanded] = useState(false)
  const petCount = owner._count?.patients ?? owner.patients.length
  const initials = getOwnerInitials(owner.name)

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation()
    const cleanPhone = owner.phone.replace(/[^0-9]/g, '')
    if (cleanPhone) window.open(`https://wa.me/${cleanPhone}`, '_blank')
  }

  return (
    <div className="group relative bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-600 transition-all flex flex-col justify-between">
      <div className="p-4">
        <div className="flex items-start gap-3.5">
          {/* Avatar */}
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-violet-500/20 shrink-0">
            {initials}
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{owner.name}</h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full border border-violet-200/60 dark:border-violet-800 shrink-0">
                <PawPrint size={11} /> {petCount} {isAr ? 'حيوان' : petCount === 1 ? 'pet' : 'pets'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Phone size={12} className="text-slate-400" />
                <span dir="ltr">{owner.phone}</span>
              </span>
              <button
                type="button"
                onClick={handleWhatsApp}
                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
              >
                <MessageCircle size={11} /> WhatsApp
              </button>
            </div>

            {(owner.email || owner.address) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-400">
                {owner.email && (
                  <span className="flex items-center gap-1 truncate max-w-[170px]" title={owner.email}>
                    <Mail size={11} /> {owner.email}
                  </span>
                )}
                {owner.address && (
                  <span className="flex items-center gap-1 truncate max-w-[170px]" title={owner.address}>
                    <MapPin size={11} /> {owner.address}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
          <button
            type="button"
            onClick={onViewProfile}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 hover:bg-violet-100 rounded-xl transition-all"
          >
            <Eye size={13} /> {isAr ? 'الملف الشامل' : 'Profile'}
          </button>
          <button
            type="button"
            onClick={onAddPet}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 rounded-xl transition-all"
          >
            <Plus size={13} /> {isAr ? 'إضافة حيوان' : 'Add Pet'}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            title={isAr ? 'تعديل' : 'Edit'}
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg ml-auto rtl:ml-0 rtl:mr-auto"
            title={isAr ? 'حذف المالك' : 'Delete Owner'}
          >
            <Trash2 size={13} />
          </button>
          {petCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((p) => !p)}
              className="flex items-center gap-0.5 text-xs font-bold text-violet-600 dark:text-violet-400 px-2 py-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/40"
            >
              <span>{expanded ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'الحيوانات' : 'Pets')}</span>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Pet Drawer */}
      {expanded && petCount > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-900/50 p-3 space-y-2">
          {owner.patients.map((pet) => (
            <div
              key={pet.id}
              className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-sm"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl shrink-0">{speciesEmoji(pet.species)}</span>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white text-xs truncate">{pet.name}</p>
                  <p className="text-[10px] text-slate-400 capitalize truncate">
                    {speciesLabel(pet.species, language)} {pet.breed ? `• ${pet.breed}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onViewPet(pet.id)}
                  className="p-1 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-lg"
                  title={isAr ? 'الملف الطبي' : 'Patient File'}
                >
                  <Eye size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => onBook({ id: pet.id, name: pet.name, species: pet.species, ownerId: owner.id, owner })}
                  className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  title={isAr ? 'حجز موعد' : 'Book Appt'}
                >
                  <Calendar size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => onWalkIn({ id: pet.id, name: pet.name, species: pet.species, ownerId: owner.id, owner })}
                  className="p-1 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-lg"
                  title={isAr ? 'بدء زيارة مباشرة' : 'Walk-in Session'}
                >
                  <Activity size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}