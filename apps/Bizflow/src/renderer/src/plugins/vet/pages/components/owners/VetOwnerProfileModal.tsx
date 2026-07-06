import { useState, useEffect, useCallback } from 'react'
import { X, Pencil, PawPrint, Phone, Mail, MapPin, FileText, Plus, Eye, Calendar, Activity, DollarSign, Wallet, Loader2 } from 'lucide-react'
import type { VetOwner, VetOwnerWithPets } from '../../index'
import { useToast } from '@renderer/contexts/ToastContext'

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
  const [finance, setFinance] = useState<any | null>(null)
  const [settleKind, setSettleKind] = useState<'session' | 'sales' | null>(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [settling, setSettling] = useState(false)
  const toast = useToast()

  const loadFinance = useCallback(() => {
    window.api.vet?.owners.getFinance(owner.id)
      .then((f: any) => setFinance(f))
      .catch(() => {})
  }, [owner.id])

  useEffect(() => { loadFinance() }, [loadFinance])

  const settleOutstanding = settleKind === 'sales'
    ? (finance?.sales?.outstanding ?? 0)
    : (finance?.outstanding ?? 0)

  async function doSettle(payAll: boolean) {
    if (!settleKind || !finance) return
    const amt = payAll ? undefined : parseFloat(settleAmount)
    if (!payAll && (isNaN(amt as number) || (amt as number) <= 0)) { toast.error('Enter a valid amount'); return }
    setSettling(true)
    try {
      const res = settleKind === 'sales'
        ? await window.api.vet?.medicines.settleOwnerSales(owner.id, payAll ? {} : { amount: amt })
        : await window.api.vet?.sessions.settleOwner(owner.id, payAll ? {} : { amount: amt })
      toast.success(`Settled $${(res?.applied ?? 0).toFixed(2)} across ${res?.settledCount ?? 0} ${settleKind === 'sales' ? 'sale' : 'session'}(s)`)
      setSettleKind(null); setSettleAmount('')
      loadFinance()
    } catch (e: any) { toast.error(e?.message ?? 'Failed to settle') }
    finally { setSettling(false) }
  }

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

        {/* ── Finance strip (sessions + pharmacy, separate) ─────── */}
        {finance && (
          <div className="border-b border-slate-100 dark:border-slate-700 flex-shrink-0 divide-y divide-slate-100 dark:divide-slate-700">
            {([
              { key: 'session' as const, label: 'Clinical Sessions', icon: Activity, charged: finance.sessions?.charged ?? finance.totalCharged ?? 0, paid: finance.sessions?.paid ?? finance.totalPaid ?? 0, outstanding: finance.sessions?.outstanding ?? finance.outstanding ?? 0 },
              { key: 'sales' as const,   label: 'Pharmacy / Sales',  icon: DollarSign, charged: finance.sales?.charged ?? 0, paid: finance.sales?.paid ?? 0, outstanding: finance.sales?.outstanding ?? 0 },
            ]).map(row => (
              <div key={row.key} className="flex items-center gap-3 px-5 py-2.5">
                <div className="flex items-center gap-1.5 w-36 shrink-0">
                  <row.icon className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{row.label}</span>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Charged</p>
                    <p className="text-sm font-bold tabular-nums text-slate-800 dark:text-white">{fmtMoney(row.charged)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-emerald-500">Paid</p>
                    <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmtMoney(row.paid)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-red-400">Outstanding</p>
                    <p className={`text-sm font-bold tabular-nums ${row.outstanding > 0.005 ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>{fmtMoney(row.outstanding)}</p>
                  </div>
                </div>
                <div className="w-20 shrink-0 flex justify-end">
                  {row.outstanding > 0.005 && (
                    <button onClick={() => { setSettleKind(row.key); setSettleAmount(row.outstanding.toFixed(2)) }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors">
                      <Wallet className="h-3 w-3" /> Settle
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Settle outstanding dialog ─────────────────────────── */}
        {settleKind && finance && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4" onClick={() => setSettleKind(null)}>
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0"><Wallet className="h-5 w-5 text-violet-600 dark:text-violet-400" /></div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Settle {settleKind === 'sales' ? 'pharmacy' : 'session'} balance</h3>
                  <p className="text-xs text-slate-400">{owner.name}</p>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 mb-4 flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">Outstanding</span>
                <span className="font-black text-red-600 dark:text-red-400">${settleOutstanding.toFixed(2)}</span>
              </div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Amount to pay</label>
              <div className="relative mb-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" min="0" max={settleOutstanding} step="any" value={settleAmount}
                  onChange={e => {
                    const n = parseFloat(e.target.value)
                    if (!isNaN(n) && n > settleOutstanding) setSettleAmount(settleOutstanding.toFixed(2))
                    else setSettleAmount(e.target.value)
                  }}
                  className="w-full pl-6 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]" />
              </div>
              <p className="text-[11px] text-slate-400 mb-4">Applied to the oldest unpaid {settleKind === 'sales' ? 'sales' : 'sessions'} first.</p>
              <div className="flex gap-3">
                <button onClick={() => doSettle(false)} disabled={settling}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30 hover:bg-violet-200 rounded-lg disabled:opacity-50 transition-colors">
                  {settling ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Pay amount'}
                </button>
                <button onClick={() => doSettle(true)} disabled={settling}
                  className="flex-1 px-4 py-2 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50 transition-colors">
                  {settling ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Pay all'}
                </button>
              </div>
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
