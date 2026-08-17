import React from 'react'
import { Heart } from 'lucide-react'
import { usePrescriptions } from '../hooks/usePrescriptions'
import type { Prescription } from '../types'

interface Props {
  prescriptions: Prescription[]
  onReload: () => Promise<void>
}

export const PrescriptionsTable: React.FC<Props> = ({ prescriptions, onReload }) => {
  const {
    editingRxId,
    savingRxId,
    rxDraft,
    setRxDraft,
    startEdit,
    cancelEdit,
    updatePrescription,
    togglePrescriptionStatus
  } = usePrescriptions(onReload)

  if (prescriptions.length === 0) return null

  const activeCount = prescriptions.filter((r) => r.isActive ?? true).length
  const stoppedCount = prescriptions.length - activeCount

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/60 bg-pink-50/40 dark:bg-pink-950/10">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-pink-500" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Prescriptions History</span>
          {activeCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold">
              {activeCount} active
            </span>
          )}
          {stoppedCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 font-semibold">
              {stoppedCount} stopped
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto [scrollbar-width:thin]">
        <table className="w-full min-w-[850px] text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
            <tr>
              {['Medicine', 'Dosage', 'Frequency', 'Duration', 'Diagnosis', 'Date / Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {prescriptions.map((rx) => {
              const isEditing = editingRxId === rx.id
              const isSaving = savingRxId === rx.id
              const isActive = rx.isActive ?? true

              return (
                <tr key={rx.id} className={`hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors ${isActive ? '' : 'opacity-60'}`}>
                  {/* Medicine Name */}
                  <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {isEditing ? (
                        <input
                          value={rxDraft.medicineName}
                          onChange={(e) => setRxDraft((d) => ({ ...d, medicineName: e.target.value }))}
                          className="w-40 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                        />
                      ) : (
                        <span>{rx.medicineName}</span>
                      )}
                    </div>
                  </td>

                  {/* Dosage */}
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {isEditing ? (
                      <input
                        value={rxDraft.dosage}
                        onChange={(e) => setRxDraft((d) => ({ ...d, dosage: e.target.value }))}
                        className="w-24 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                      />
                    ) : (
                      rx.dosage || '–'
                    )}
                  </td>

                  {/* Frequency */}
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {isEditing ? (
                      <input
                        value={rxDraft.frequency}
                        onChange={(e) => setRxDraft((d) => ({ ...d, frequency: e.target.value }))}
                        className="w-28 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                      />
                    ) : (
                      rx.frequency || '–'
                    )}
                  </td>

                  {/* Duration */}
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {isEditing ? (
                      <input
                        value={rxDraft.duration}
                        onChange={(e) => setRxDraft((d) => ({ ...d, duration: e.target.value }))}
                        className="w-24 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                      />
                    ) : (
                      rx.duration || '–'
                    )}
                  </td>

                  {/* Diagnosis */}
                  <td className="px-4 py-2.5 text-slate-500 max-w-[130px] truncate">{rx.diagnosis || '–'}</td>

                  {/* Date / Status */}
                  <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                    {rx.sessionDate
                      ? new Date(rx.sessionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                      : '–'}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {isEditing ? (
                        <>
                          <input
                            value={rxDraft.quantity}
                            onChange={(e) => setRxDraft((d) => ({ ...d, quantity: e.target.value }))}
                            placeholder="Qty"
                            className="w-14 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                          />
                          <button
                            onClick={() => updatePrescription(rx.id??'')}
                            disabled={isSaving}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                          >
                            {isSaving ? '...' : 'Save'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={isSaving}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => togglePrescriptionStatus(rx)}
                            disabled={isSaving}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                              isActive
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200'
                            }`}
                          >
                            {isActive ? 'Disable' : 'Enable'}
                          </button>
                          {isActive && (
                            <button
                              onClick={() => startEdit(rx)}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 transition-colors"
                            >
                              Update
                            </button>
                          )}
                        </>
                      )}
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