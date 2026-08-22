import { Info, Ruler, Target, History, Loader2 } from 'lucide-react'
import { Trainee, ProfileTab } from '../../types'
import { useTraineeProfile } from '../../hooks/useTraineeProfile'
import { ProfileHeader } from './ProfileHeader'
import { TabInfo } from './TabInfo'
import { TabMeasurements } from './TabMeasurements'
import { TabGoals } from './TabGoals'
import { TabHistory } from './TabHistory'
import { TraineeFormModal } from '../TraineeFormModal'
import QRModal from '@renderer/plugins/gym/components/QRModal'

interface TraineeProfileModalProps {
  trainee: Trainee
  onClose: () => void
  onEdited: (t: Trainee) => void
}

export function TraineeProfileModal({ trainee: initial, onClose, onEdited }: TraineeProfileModalProps) {
  const {
    tab,
    setTab,
    trainee,
    fullData,
    loadingFull,
    editOpen,
    setEditOpen,
    qrOpen,
    setQrOpen,
    handleEdited,
    measurements,
    showMeasForm,
    setShowMeasForm,
    measForm,
    setMeasForm,
    savingMeas,
    saveMeasurement,
    deleteMeasurement,
    goals,
    showGoalForm,
    setShowGoalForm,
    goalForm,
    setGoalForm,
    savingGoal,
    saveGoal,
    markGoalAchieved,
    deleteGoal
  } = useTraineeProfile(initial, onEdited)

  const d = fullData || trainee

  const tabButtons: { id: ProfileTab; label: string; icon: any; count?: number }[] = [
    { id: 'info', label: 'Overview', icon: Info },
    { id: 'measurements', label: 'Body Metrics', icon: Ruler, count: measurements.length },
    {
      id: 'goals',
      label: 'Goals',
      icon: Target,
      count: goals.filter(g => g.status === 'active').length
    },
    { id: 'history', label: 'History', icon: History }
  ]

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <ProfileHeader
            trainee={d}
            onEdit={() => setEditOpen(true)}
            onShowQr={() => setQrOpen(true)}
            onClose={onClose}
          />

          {/* Navigation Tab Bar */}
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
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Tab Content Pane */}
          <div className="flex-1 overflow-y-auto p-6">
            {loadingFull && !fullData ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            ) : (
              <>
                {tab === 'info' && <TabInfo trainee={d} />}
                {tab === 'measurements' && (
                  <TabMeasurements
                    measurements={measurements}
                    showForm={showMeasForm}
                    form={measForm}
                    saving={savingMeas}
                    onToggleForm={() => setShowMeasForm(v => !v)}
                    onFormChange={setMeasForm}
                    onSave={saveMeasurement}
                    onDelete={deleteMeasurement}
                  />
                )}
                {tab === 'goals' && (
                  <TabGoals
                    goals={goals}
                    showForm={showGoalForm}
                    form={goalForm}
                    saving={savingGoal}
                    onToggleForm={() => setShowGoalForm(v => !v)}
                    onFormChange={setGoalForm}
                    onSave={saveGoal}
                    onAchieve={markGoalAchieved}
                    onDelete={deleteGoal}
                  />
                )}
                {tab === 'history' && <TabHistory trainee={d} />}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Modals */}
      {editOpen && (
        <TraineeFormModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={handleEdited}
          initial={d}
        />
      )}

      {qrOpen && (
        <QRModal
          isOpen={qrOpen}
          onClose={() => setQrOpen(false)}
          type="gym_trainee"
          id={d.id}
          name={d.name}
        />
      )}
    </>
  )
}