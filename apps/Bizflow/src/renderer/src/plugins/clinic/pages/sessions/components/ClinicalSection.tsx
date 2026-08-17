import { useMemo } from 'react'
import { ChevronDown, Settings2 } from 'lucide-react'
import { VisitType, VitalsData } from '../types'
import DentalChart, { DentalChartData } from '@renderer/plugins/clinic/components/DentalChart'
import SuggestInput from '@renderer/plugins/clinic/components/SuggestInput'
import { VITAL_LABELS } from '../constants'
import { displayName } from '../../doctors/doctors.shared'

interface Props {
  visitDate: string
  onVisitDateChange: (val: string) => void
  visitType: VisitType
  onVisitTypeChange: (val: VisitType) => void
  doctorId: string
  onDoctorChange: (id: string, name: string) => void
  doctors: any[]
  singleDoctor: boolean
  chiefComplaint: string
  onChiefComplaintChange: (val: string) => void
  allComplaints: string[]
  onManageComplaints: () => void
  vitals: VitalsData
  onVitalChange: (key: string, val: string) => void
  showVitals: boolean
  onToggleVitals: () => void
  diagnosis: string
  onDiagnosisChange: (val: string) => void
  notes: string
  onNotesChange: (val: string) => void
  isDentistMode: boolean
  dentalChart: DentalChartData
  onDentalChartChange: (chart: DentalChartData) => void
  showDentalChart: boolean
  onToggleDentalChart: () => void
}

export default function ClinicalSection({
  visitDate,
  onVisitDateChange,
  visitType,
  onVisitTypeChange,
  doctorId,
  onDoctorChange,
  doctors,
  singleDoctor,
  chiefComplaint,
  onChiefComplaintChange,
  allComplaints,
  onManageComplaints,
  vitals,
  onVitalChange,
  showVitals,
  onToggleVitals,
  diagnosis,
  onDiagnosisChange,
  notes,
  onNotesChange,
  isDentistMode,
  dentalChart,
  onDentalChartChange,
  showDentalChart,
  onToggleDentalChart
}: Props) {
  const calculatedBMI = useMemo(() => {
    const h = parseFloat(vitals.height || '0') / 100
    const w = parseFloat(vitals.weight || '0')
    if (h > 0.5 && w > 10) return (w / (h * h)).toFixed(1)
    return null
  }, [vitals.height, vitals.weight])

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500'
  const labelCls = 'block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Visit Date & Time</label>
          <input type="datetime-local" className={inputCls} value={visitDate} onChange={e => onVisitDateChange(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Visit Type</label>
          <select className={inputCls} value={visitType} onChange={e => onVisitTypeChange(e.target.value as VisitType)}>
            <option value="first_visit">🔵 First Visit</option>
            <option value="follow_up">🔄 Follow-up</option>
            <option value="routine">🩺 Routine</option>
            <option value="emergency">🚨 Emergency</option>
          </select>
        </div>
        {!singleDoctor && (
          <div>
            <label className={labelCls}>Attending Doctor</label>
            <select
              className={inputCls}
              value={doctorId}
              onChange={e => {
                const d = doctors.find(x => x.id === e.target.value)
                onDoctorChange(e.target.value, d ? d.name : '')
              }}
            >
              <option value="">— Unassigned —</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{displayName(d)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className={labelCls}>Chief Complaint / Symptoms *</label>
          <button type="button" onClick={onManageComplaints} className="text-xs text-teal-600 hover:underline flex items-center gap-1 font-semibold">
            <Settings2 className="h-3 w-3" /> Presets
          </button>
        </div>
        <SuggestInput
          className={inputCls}
          suggestions={allComplaints}
          value={chiefComplaint}
          onChange={onChiefComplaintChange}
          placeholder="e.g. Severe headache, persistent cough..."
          required
        />
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={onToggleVitals}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
        >
          <div className="flex items-center gap-2">
            <span>🩺 Patient Vitals</span>
            {calculatedBMI && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold">
                BMI: {calculatedBMI}
              </span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${showVitals ? 'rotate-180' : ''}`} />
        </button>
        {showVitals && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900">
            {Object.entries(VITAL_LABELS).map(([key, cfg]) => (
              <div key={key}>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">{cfg.label} ({cfg.unit})</label>
                <input
                  className={inputCls}
                  placeholder={cfg.placeholder}
                  value={(vitals as any)[key] || ''}
                  onChange={e => onVitalChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Clinical Diagnosis</label>
          <textarea className={inputCls} rows={3} placeholder="Primary finding..." value={diagnosis} onChange={e => onDiagnosisChange(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Consultation Notes</label>
          <textarea className={inputCls} rows={3} placeholder="Observations..." value={notes} onChange={e => onNotesChange(e.target.value)} />
        </div>
      </div>

      {isDentistMode && (
        <div className="border border-teal-200 dark:border-teal-900 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={onToggleDentalChart}
            className="w-full flex items-center justify-between px-4 py-3 bg-teal-50 dark:bg-teal-950/40 text-xs font-bold text-teal-800 dark:text-teal-300"
          >
            <span>🦷 Dental Odontogram Chart</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showDentalChart ? 'rotate-180' : ''}`} />
          </button>
          {showDentalChart && (
            <div className="p-4 bg-white dark:bg-slate-900">
              <DentalChart value={dentalChart} onChange={onDentalChartChange} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}