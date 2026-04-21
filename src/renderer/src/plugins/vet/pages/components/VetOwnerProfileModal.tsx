import { useState, useEffect } from 'react'
import { X, Pencil, PawPrint, Phone, Mail, MapPin, FileText, Plus, Eye, Calendar, Activity, DollarSign, TrendingUp, CreditCard } from 'lucide-react'
import type { VetOwner, VetOwnerWithPets } from '../index'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🦜', rabbit: '🐇',
  reptile: '🦎', fish: '🐠', other: '🐾',
}

const SPECIES_BG: Record<string, { card: string; emoji: string }> = {
  dog:     { card: 'bg-amber-50  dark:bg-amber-900/15  border-amber-200  dark:border-amber-700',  emoji: 'bg-amber-100  dark:bg-amber-900/40' },
  cat:     { card: 'bg-slate-50  dark:bg-slate-800/60  border-slate-200  dark:border-slate-600',  emoji: 'bg-slate-100  dark:bg-slate-700' },
  bird:    { card: 'bg-sky-50    dark:bg-sky-900/15    border-sky-200    dark:border-sky-700',    emoji: 'bg-sky-100    dark:bg-sky-900/40' },
  rabbit:  { card: 'bg-pink-50   dark:bg-pink-900/15   border-pink-200   dark:border-pink-700',   emoji: 'bg-pink-100   dark:bg-pink-900/40' },
  reptile: { card: 'bg-green-50  dark:bg-green-900/15  border-green-200  dark:border-green-700',  emoji: 'bg-green-100  dark:bg-green-900/40' },
  fish:    { card: 'bg-blue-50   dark:bg-blue-900/15   border-blue-200   dark:border-blue-700',   emoji: 'bg-blue-100   dark:bg-blue-900/40' },
  other:   { card: 'bg-violet-50 dark:bg-violet-900/15 border-violet-200 dark:border-violet-700', emoji: 'bg-violet-100 dark:bg-violet-900/40' },
}

function ownerInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

interface Props {
  owner:      VetOwnerWithPets
  onClose:    () => void
  onEdit:     () => void
  onAddPet:   () => void
  onViewPet:  (petId: string) => void
  onBook:     (p: { id: string; name: string; species: string; ownerId: string; owner: VetOwner }) => void
  onWalkIn:   (p: { id: string; name: string; species: string; ownerId: string; owner: VetOwner }) => void
}

export default function VetOwnerProfileModal({
  owner, onClose, onEdit, onAddPet, onViewPet, onBook, onWalkIn
}: Props) {
  const [finance, setFinance] = useState<{ totalCharged: number; totalPaid: number; outstanding: number } | null>(null)

  useEffect(() => {
    window.api.vet?.owners.getFinance(owner.id)
      .then((f: any) => setFinance(f))
      .catch(() => {})
  }, [owner.id])

  const fmtMoney = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Gradient header ──────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600 px-6 pt-5 pb-16 flex-shrink-0">
          {/* Buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white/20 hover:bg-white/35 text-white transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/20 hover:bg-white/35 text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0">
              {ownerInitials(owner.name)}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{owner.name}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1">
                <span className="flex items-center gap-1 text-sm text-violet-100">
                  <Phone className="h-3.5 w-3.5" /> {owner.phone}
                </span>
                {owner.email && (
                  <span className="flex items-center gap-1 text-sm text-violet-100 truncate max-w-[200px]">
                    <Mail className="h-3.5 w-3.5" /> {owner.email}
                  </span>
                )}
              </div>
              {owner.address && (
                <span className="flex items-center gap-1 text-sm text-violet-200 mt-0.5">
                  <MapPin className="h-3.5 w-3.5" /> {owner.address}
                </span>
              )}
            </div>
          </div>

          {/* Pet count pill bottom-right */}
          <span className="absolute bottom-4 right-6 inline-flex items-center gap-1.5 text-xs font-semibold bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full border border-white/30">
            <PawPrint className="h-3.5 w-3.5" />
            {owner._count.patients} {owner._count.patients === 1 ? 'pet' : 'pets'}
          </span>
        </div>

        {/* ── Notes banner (if any) ─────────────────────────────── */}
        {owner.notes && (
          <div className="px-6 py-3 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-800/50 flex-shrink-0">
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
              <FileText className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              {owner.notes}
            </p>
          </div>
        )}

        {/* ── Finance strip ─────────────────────────────────── */}
        {finance && (
          <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-700 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
            <div className="flex flex-col items-center py-3 px-4 gap-0.5">
              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <DollarSign className="h-3 w-3" /> Total Charged
              </span>
              <span className="text-base font-bold tabular-nums text-slate-800 dark:text-white">{fmtMoney(finance.totalCharged)}</span>
            </div>
            <div className="flex flex-col items-center py-3 px-4 gap-0.5">
              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                <CreditCard className="h-3 w-3" /> Paid
              </span>
              <span className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmtMoney(finance.totalPaid)}</span>
            </div>
            <div className="flex flex-col items-center py-3 px-4 gap-0.5">
              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-red-400">
                <TrendingUp className="h-3 w-3" /> Outstanding
              </span>
              <span className={`text-base font-bold tabular-nums ${finance.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {fmtMoney(finance.outstanding)}
              </span>
            </div>
          </div>
        )}

        {/* ── Pets body ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {/* Section header */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <PawPrint className="h-4 w-4 text-violet-500" />
              Registered Pets
            </h3>
            <button
              onClick={onAddPet}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-xl shadow-sm transition-all"
            >
              <Plus className="h-3.5 w-3.5" /> Add Pet
            </button>
          </div>

          {/* Empty state */}
          {owner.patients.length === 0 ? (
            <div className="text-center py-14 flex flex-col items-center">
              <div className="text-5xl mb-4">🐾</div>
              <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">No pets registered yet</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">Add this owner's first pet to start tracking visits.</p>
              <button
                onClick={onAddPet}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Plus className="h-4 w-4" /> Add First Pet
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {owner.patients.map(pet => {
                const emoji = SPECIES_EMOJI[pet.species] ?? '🐾'
                const style = SPECIES_BG[pet.species] ?? SPECIES_BG.other

                return (
                  <div
                    key={pet.id}
                    className={`rounded-2xl border-2 ${style.card} overflow-hidden transition-shadow hover:shadow-md`}
                  >
                    {/* Pet header */}
                    <div className="flex items-center gap-3 p-4 pb-3">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 ${style.emoji}`}>
                        {emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{pet.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-0.5">
                          {pet.species.replace('_', ' ')}
                          {pet.breed ? ` · ${pet.breed}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Pet actions */}
                    <div className="grid grid-cols-3 gap-0 border-t border-black/5 dark:border-white/5">
                      <button
                        onClick={() => onViewPet(pet.id)}
                        className="flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-100/60 dark:hover:bg-violet-900/30 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                      <button
                        onClick={() => onBook({ id: pet.id, name: pet.name, species: pet.species, ownerId: owner.id, owner })}
                        className="flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-700/50 border-x border-black/5 dark:border-white/5 transition-colors"
                      >
                        <Calendar className="h-4 w-4" />
                        Book
                      </button>
                      <button
                        onClick={() => onWalkIn({ id: pet.id, name: pet.name, species: pet.species, ownerId: owner.id, owner })}
                        className="flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium text-teal-700 dark:text-teal-300 hover:bg-teal-100/60 dark:hover:bg-teal-900/30 transition-colors"
                      >
                        <Activity className="h-4 w-4" />
                        Walk-in
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
