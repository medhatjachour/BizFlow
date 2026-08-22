import { Info, Users, Activity, Clock } from 'lucide-react'
import { Coach, CoachProfileTab } from '../../types'
import { useCoachProfile } from '../../hooks/useCoachProfile'
import { ProfileHeader } from './ProfileHeader'
import { ProfileStatsHeader } from './ProfileStatsHeader'
import { TabInfo } from './TabInfo'
import { TabTrainees } from './TabTrainees'
import { TabActivity } from './TabActivity'
import { TabShifts } from './TabShifts'
import { CoachFormModal } from '../CoachFormModal'
import QRModal from '@renderer/plugins/gym/components/QRModal'

interface CoachProfileModalProps {
  coach: Coach
  onClose: () => void
  onEdited: (c: Coach) => void
}

export function CoachProfileModal({ coach: initial, onClose, onEdited }: CoachProfileModalProps) {
  const {
    coach,
    tab,
    setTab,
    stats,
    loadingStats,
    editOpen,
    setEditOpen,
    qrOpen,
    setQrOpen,
    handleEdited
  } = useCoachProfile(initial, onEdited)

  const tabButtons: { id: CoachProfileTab; label: string; icon: any; count?: number }[] = [
    { id: 'info', label: 'Overview', icon: Info },
    {
      id: 'trainees',
      label: 'Clients',
      icon: Users,
      count: stats?.uniqueTrainees
    },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'shifts', label: 'Duty Shifts', icon: Clock }
  ]

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <ProfileHeader
            coach={coach}
            onEdit={() => setEditOpen(true)}
            onShowQr={() => setQrOpen(true)}
            onClose={onClose}
          />

          {/* Stats Bar */}
          <ProfileStatsHeader stats={stats} loading={loadingStats} />

          {/* Tab Navigation */}
          <div className="flex gap-1 px-4 py-2 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 overflow-x-auto">
            {tabButtons.map(t => {
              const Icon = t.icon
              const isSelected = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Icon size={13} />
                  <span>{t.label}</span>
                  {t.count !== undefined && t.count > 0 && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Content Pane */}
          <div className="flex-1 overflow-y-auto p-6">
            {tab === 'info' && <TabInfo coach={coach} stats={stats} />}
            {tab === 'trainees' && <TabTrainees stats={stats} loading={loadingStats} />}
            {tab === 'activity' && <TabActivity stats={stats} />}
            {tab === 'shifts' && <TabShifts coachId={coach.id} />}
          </div>
        </div>
      </div>

      {/* Sub Modals */}
      {editOpen && (
        <CoachFormModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={handleEdited}
          initial={coach}
        />
      )}

      {qrOpen && (
        <QRModal
          isOpen={qrOpen}
          onClose={() => setQrOpen(false)}
          type="gym_coach"
          id={coach.id}
          name={coach.name}
        />
      )}
    </>
  )
}