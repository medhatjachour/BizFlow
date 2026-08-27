import { Eye, Plus, Pencil, Trash2, PawPrint } from 'lucide-react'
import { VetOwnerWithPets } from '../types'
import { getOwnerInitials } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  owners: VetOwnerWithPets[]
  onViewProfile: (o: VetOwnerWithPets) => void
  onEdit: (o: VetOwnerWithPets) => void
  onDelete: (o: VetOwnerWithPets) => void
  onAddPet: (o: VetOwnerWithPets) => void
}

export function OwnerTableView({ owners, onViewProfile, onEdit, onDelete, onAddPet }: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left rtl:text-right">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 border-b border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">{isAr ? 'اسم المالك' : 'Owner Name'}</th>
              <th className="py-3 px-4">{isAr ? 'بيانات التواصل' : 'Contact'}</th>
              <th className="py-3 px-4">{isAr ? 'العنوان' : 'Address'}</th>
              <th className="py-3 px-4">{isAr ? 'عدد الحيوانات' : 'Registered Pets'}</th>
              <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {owners.map((owner) => {
              const initials = getOwnerInitials(owner.name)
              const count = owner._count?.patients ?? owner.patients.length

              return (
                <tr key={owner.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white truncate">{owner.name}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-700 dark:text-slate-300" dir="ltr">{owner.phone}</p>
                    {owner.email && <p className="text-[11px] text-slate-400 truncate max-w-[150px]">{owner.email}</p>}
                  </td>

                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                    {owner.address || '—'}
                  </td>

                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200/60">
                      <PawPrint size={11} /> {count} {isAr ? 'حيوانات' : count === 1 ? 'pet' : 'pets'}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onViewProfile(owner)}
                        className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg"
                        title={isAr ? 'الملف' : 'Profile'}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddPet(owner)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                        title={isAr ? 'إضافة حيوان' : 'Add Pet'}
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(owner)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                        title={isAr ? 'تعديل' : 'Edit'}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(owner)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        title={isAr ? 'حذف' : 'Delete'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}