import { useRef } from 'react'
import { Search, Loader2, CheckCircle2, Footprints, Zap } from 'lucide-react'
import { Trainee, PaymentMethod } from '../types'
import { STATUS_CONFIG } from '../constants'
import { getSubscriptionStatus, getRemainingDays } from '../utils'
import { FeeCheckInForm } from './FeeCheckInForm'
import { AnonWalkInForm } from './AnonWalkInForm'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface QuickCheckInCardProps {
  searchQuery: string
  searchResults: Trainee[]
  isSearching: boolean
  checkingInId: string | null
  flashSuccessId: string | null
  onSearchChange: (q: string) => void
  onCheckInClick: (trainee: Trainee) => void
  // Fee inline
  feeTarget: Trainee | null
  feeAmount: string
  feePayMethod: PaymentMethod
  checkingInFee: boolean
  onFeeAmountChange: (amount: string) => void
  onFeeMethodChange: (method: PaymentMethod) => void
  onFeeSubmit: (e: React.FormEvent) => void
  onFeeCancel: () => void
  // Anon
  showAnonForm: boolean
  anonName: string
  anonAmount: string
  anonPayMethod: PaymentMethod
  savingAnon: boolean
  onAnonToggle: (show: boolean) => void
  onAnonNameChange: (v: string) => void
  onAnonAmountChange: (v: string) => void
  onAnonMethodChange: (v: PaymentMethod) => void
  onAnonSubmit: (e: React.FormEvent) => void
}

export function QuickCheckInCard(props: QuickCheckInCardProps) {
  const { t } = useLanguage()
  const searchInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="bg-gradient-to-br from-amber-500/[0.04] via-orange-500/[0.02] to-transparent rounded-2xl border border-orange-500/20 dark:border-orange-500/10 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Zap size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('gymQuickCheckIn') || 'Express Check-In'}
            </h2>
            <p className="text-[11px] text-slate-400">
              {t('gymQuickCheckInDescription') || 'Search members or register quick paid visits'}</p>
          </div>
        </div>
      </div>

      {/* Search Field */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        {props.isSearching && (
          <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-orange-500 pointer-events-none" />
        )}
        <input
          ref={searchInputRef}
          value={props.searchQuery}
          onChange={e => props.onSearchChange(e.target.value)}
          placeholder={t('gymSearchMember') || 'Search active members by name or phone...'}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all shadow-inner"
        />
      </div>

      {/* Member Results List */}
      {props.searchResults.length > 0 && (
        <div className="space-y-2 mb-3 max-h-72 overflow-y-auto pr-1">
          {props.searchResults.map(trainee => {
            const status = getSubscriptionStatus(trainee)
            const isCheckingIn = props.checkingInId === trainee.id
            const isFlashed = props.flashSuccessId === trainee.id
            const isFeeOpen = props.feeTarget?.id === trainee.id
            const daysLeft = getRemainingDays(trainee)
            const config = STATUS_CONFIG[status]

            return (
              <div
                key={trainee.id}
                className={`rounded-xl border bg-white dark:bg-slate-800 transition-all duration-200 overflow-hidden ${
                  isFlashed
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : config.borderCls
                }`}
              >
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${config.avatarCls}`}
                    >
                      {trainee.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {trainee.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {trainee.phone && (
                          <span className="text-[11px] text-slate-400 font-mono">{trainee.phone}</span>
                        )}
                        {daysLeft !== null && daysLeft >= 0 && (
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">
                            {daysLeft}d remaining
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full hidden sm:inline-block ${config.badgeCls}`}>
                      {t(config.labelKey) || config.fallbackLabel}
                    </span>

                    <button
                      onClick={() => props.onCheckInClick(trainee)}
                      disabled={!!props.checkingInId || isFeeOpen}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-sm ${
                        isFlashed
                          ? 'bg-emerald-600 text-white'
                          : status !== 'none'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                          : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                      }`}
                    >
                      {isCheckingIn ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : isFlashed ? (
                        <CheckCircle2 size={12} />
                      ) : null}
                      <span>
                        {isCheckingIn
                          ? t('gymLoggingIn') || 'Checking in...'
                          : isFlashed
                          ? t('gymDone') || 'Checked In'
                          : status !== 'none'
                          ? t('gymCheckIn') || 'Check In'
                          : 'Paid Visit'}
                      </span>
                    </button>
                  </div>
                </div>

                {isFeeOpen && (
                  <FeeCheckInForm
                    trainee={trainee}
                    feeAmount={props.feeAmount}
                    feePayMethod={props.feePayMethod}
                    checkingInFee={props.checkingInFee}
                    onAmountChange={props.onFeeAmountChange}
                    onMethodChange={props.onFeeMethodChange}
                    onSubmit={props.onFeeSubmit}
                    onCancel={props.onFeeCancel}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Not Found */}
      {props.searchQuery.trim().length > 1 && !props.isSearching && props.searchResults.length === 0 && (
        <p className="text-xs text-slate-400 mb-3 px-1">
          {t('gymNoMembersFound') || 'No members match your search.'}
        </p>
      )}

      {/* Anonymous Walk-in trigger & form */}
      {!props.showAnonForm ? (
        <button
          onClick={() => {
            props.onAnonToggle(true)
            props.onSearchChange('')
          }}
          className="flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-800 transition-colors py-1 px-2 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/20"
        >
          <Footprints size={14} />
          <span>{t('gymLogAnon') || '+ Log Non-Member / Guest Walk-in'}</span>
        </button>
      ) : (
        <AnonWalkInForm
          name={props.anonName}
          amount={props.anonAmount}
          payMethod={props.anonPayMethod}
          saving={props.savingAnon}
          onNameChange={props.onAnonNameChange}
          onAmountChange={props.onAnonAmountChange}
          onMethodChange={props.onAnonMethodChange}
          onSubmit={props.onAnonSubmit}
          onCancel={() => props.onAnonToggle(false)}
        />
      )}
    </div>
  )
}