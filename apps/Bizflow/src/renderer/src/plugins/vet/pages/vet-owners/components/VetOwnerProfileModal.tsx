import { useState, useEffect, useCallback } from 'react'
import {
  X, Pencil, PawPrint, Phone, Mail, MapPin, Plus, Eye,
  Calendar, Activity, DollarSign, Wallet, 
} from 'lucide-react'
import { VetOwnerWithPets, VetOwner } from '../types'
import { formatOwnerMoney, getOwnerInitials } from '../utils'
import { speciesEmoji, speciesLabel } from '../species'
import { SPECIES_BG_STYLES } from '../constants'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  owner: VetOwnerWithPets
  onClose: () => void
  onEdit: () => void
  onAddPet: () => void
  onViewPet: (petId: string) => void
  onBook: (p: { id: string; name: string; species: string; ownerId: string; owner: VetOwner }) => void
  onWalkIn: (p: { id: string; name: string; species: string; ownerId: string; owner: VetOwner }) => void
}

export function VetOwnerProfileModal({
  owner,
  onClose,
  onEdit,
  onAddPet,
  onViewPet,
  onBook,
  onWalkIn
}: Props) {
  const toast = useToast()
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const initials = getOwnerInitials(owner.name)

  const [finance, setFinance] = useState<any | null>(null)
  const [settleKind, setSettleKind] = useState<'session' | 'sales' | null>(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [settling, setSettling] = useState(false)

  const loadFinance = useCallback(() => {
    window.api.vet?.owners.getFinance(owner.id)
      .then((f: any) => setFinance(f))
      .catch(() => {})
  }, [owner.id])

  useEffect(() => {
    loadFinance()
  }, [loadFinance])

  const settleOutstanding =
    settleKind === 'sales'
      ? (finance?.sales?.outstanding ?? 0)
      : (finance?.sessions?.outstanding ?? finance?.outstanding ?? 0)

  const doSettle = async (payAll: boolean) => {
    if (!settleKind || !finance) return
    const amt = payAll ? undefined : parseFloat(settleAmount)
    if (!payAll && (isNaN(amt as number) || (amt as number) <= 0)) {
      toast.error(isAr ? 'يرجى إدخال مبلغ صحيح' : 'Enter a valid amount')
      return
    }

    setSettling(true)
    try {
      const res =
        settleKind === 'sales'
          ? await window.api.vet?.medicines.settleOwnerSales(owner.id, payAll ? {} : { amount: amt })
          : await window.api.vet?.sessions.settleOwner(owner.id, payAll ? {} : { amount: amt })

      toast.success(
        isAr
          ? `تمت تسوية ${formatOwnerMoney(res?.applied)} بنجاح`
          : `Settled ${formatOwnerMoney(res?.applied)} across ${res?.settledCount ?? 0} record(s)`
      )
      setSettleKind(null)
      setSettleAmount('')
      loadFinance()
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to settle')
    } finally {
      setSettling(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200/80 dark:border-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Hero */}
        <div className="relative bg-gradient-to-r from-violet-700 via-purple-700 to-fuchsia-700 px-6 pt-6 pb-8 text-white shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-2xl font-black shadow-xl backdrop-blur-md shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-black truncate">{owner.name}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-violet-100">
                  <span className="flex items-center gap-1" dir="ltr">
                    <Phone size={12} /> {owner.phone}
                  </span>
                  {owner.email && (
                    <span className="flex items-center gap-1 truncate max-w-[200px]" title={owner.email}>
                      <Mail size={12} /> {owner.email}
                    </span>
                  )}
                </div>
                {owner.address && (
                  <p className="text-[11px] text-violet-200/80 flex items-center gap-1 mt-1">
                    <MapPin size={11} /> {owner.address}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onEdit}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-md"
              >
                <Pencil size={13} /> {isAr ? 'تعديل' : 'Edit'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-all backdrop-blur-md"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Finance Debt Split Rows */}
        {finance && (
          <div className="border-b border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-900/60 shrink-0 text-xs">
            {[
              {
                key: 'session' as const,
                label: isAr ? 'الجلسات والزيارات الطبية' : 'Clinical Sessions',
                icon: Activity,
                charged: finance.sessions?.charged ?? finance.totalCharged ?? 0,
                paid: finance.sessions?.paid ?? finance.totalPaid ?? 0,
                outstanding: finance.sessions?.outstanding ?? finance.outstanding ?? 0
              },
              {
                key: 'sales' as const,
                label: isAr ? 'مشتريات وأدوية الصيدلية' : 'Pharmacy / Sales',
                icon: DollarSign,
                charged: finance.sales?.charged ?? 0,
                paid: finance.sales?.paid ?? 0,
                outstanding: finance.sales?.outstanding ?? 0
              }
            ].map((row) => (
              <div key={row.key} className="flex items-center justify-between px-6 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <row.icon size={14} className="text-violet-500 shrink-0" />
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{row.label}</span>
                </div>

                <div className="flex items-center gap-4 text-right rtl:text-left">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'المطلوب' : 'Billed'}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatOwnerMoney(row.charged)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-500 block">{isAr ? 'المدفوع' : 'Paid'}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatOwnerMoney(row.paid)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-500 block">{isAr ? 'المتبقي' : 'Due'}</span>
                    <span className={`font-black ${row.outstanding > 0.005 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                      {formatOwnerMoney(row.outstanding)}
                    </span>
                  </div>

                  {row.outstanding > 0.005 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSettleKind(row.key)
                        setSettleAmount(row.outstanding.toFixed(2))
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg flex items-center gap-1 shadow-sm transition-all"
                    >
                      <Wallet size={12} />
                      <span>{isAr ? 'تسوية' : 'Settle'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pets Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <PawPrint size={14} className="text-violet-500" />
              {isAr ? 'الحيوانات الأليفة المسجلة' : 'Registered Pets'} ({owner.patients.length})
            </h3>
            <button
              type="button"
              onClick={onAddPet}
              className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
            >
              <Plus size={13} /> {isAr ? 'إضافة حيوان' : 'Add Pet'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {owner.patients.map((pet) => {
              const style = SPECIES_BG_STYLES[pet.species] ?? SPECIES_BG_STYLES.other
              return (
                <div
                  key={pet.id}
                  className={`p-3.5 rounded-2xl border ${style.card} shadow-sm flex flex-col justify-between`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl shrink-0">{speciesEmoji(pet.species)}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white text-xs truncate">{pet.name}</p>
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md mt-0.5 ${style.badge}`}>
                        {speciesLabel(pet.species, language)} {pet.breed ? `• ${pet.breed}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <button
                      type="button"
                      onClick={() => onViewPet(pet.id)}
                      className="py-1 text-violet-600 dark:text-violet-400 hover:bg-violet-100/50 rounded-lg font-bold flex items-center justify-center gap-1"
                    >
                      <Eye size={12} /> {isAr ? 'الملف' : 'View'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onBook({ id: pet.id, name: pet.name, species: pet.species, ownerId: owner.id, owner })}
                      className="py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 rounded-lg font-bold flex items-center justify-center gap-1"
                    >
                      <Calendar size={12} /> {isAr ? 'حجز' : 'Book'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onWalkIn({ id: pet.id, name: pet.name, species: pet.species, ownerId: owner.id, owner })}
                      className="py-1 text-teal-600 dark:text-teal-400 hover:bg-teal-100/50 rounded-lg font-bold flex items-center justify-center gap-1"
                    >
                      <Activity size={12} /> {isAr ? 'كشف' : 'Visit'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Settle Debt Sub-Modal */}
        {settleKind && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4" onClick={() => setSettleKind(null)}>
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 flex items-center justify-center">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isAr ? 'تسوية المستحقات المالية' : 'Settle Outstanding Debt'}
                  </h3>
                  <p className="text-xs text-slate-400">{owner.name}</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 flex justify-between items-center mb-3 text-xs">
                <span className="text-slate-500">{isAr ? 'المبلغ المستحق:' : 'Total Due:'}</span>
                <span className="font-black text-rose-600 dark:text-rose-400 text-sm">{formatOwnerMoney(settleOutstanding)}</span>
              </div>

              <div className="mb-4">
                <input
                  type="number"
                  min="0"
                  max={settleOutstanding}
                  step="any"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-bold"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => doSettle(false)}
                  disabled={settling}
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100"
                >
                  {isAr ? 'دفع جزء' : 'Pay Amount'}
                </button>
                <button
                  type="button"
                  onClick={() => doSettle(true)}
                  disabled={settling}
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-violet-600 text-white hover:bg-violet-700"
                >
                  {settling ? '…' : isAr ? 'تسوية الكل' : 'Pay All'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}