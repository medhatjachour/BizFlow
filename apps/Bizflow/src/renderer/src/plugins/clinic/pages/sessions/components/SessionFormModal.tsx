import { useState, useEffect, useMemo } from 'react'
import { X, Loader2, Stethoscope, Printer, Check, Activity, Pill, Package, CreditCard } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import { useCustomSuggestions } from '../../../hooks/useCustomSuggestions'
import { CHIEF_COMPLAINTS, MEDICINE_SUGGESTIONS, LAB_CHECKS } from '../../../data/clinic-suggestions'
import ManageSuggestionsModal from '../../../components/ManageSuggestionsModal'
import PrescriptionPrintModal from '../../../components/PrescriptionPrintModal'
import { SessionFormProps, PrescriptionItem, LabOrderItem, SessionMaterialItem, VisitType, SessionStatus, VitalsData } from '../types'
import { APPT_TO_VISIT_TYPE } from '../constants'
import { toDatetimeLocal, parseVitals, computePaymentStatus } from '../utils'
import { isSingleDoctorMode, resolveDefaultDoctorId } from '../../doctors/utils'
import PatientSelector from './PatientSelector'
import ClinicalSection from './ClinicalSection'
import PrescriptionsSection from './PrescriptionsSection'
import InventorySection from './InventorySection'
import BillingSection from './BillingSection'
import LabOrdersSection from './LabOrdersSection'

type ModalSection = 'clinical' | 'treatment' | 'inventory' | 'billing'

export default function SessionFormModal({
  existingSession,
  defaultPatient,
  defaultAppointment,
  onClose,
  onSaved
}: SessionFormProps) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<ModalSection>('clinical')
  const [showRxPrint, setShowRxPrint] = useState(false)

  // Suggestion Modals
  const [manageComplaints, setManageComplaints] = useState(false)
  const [manageMedicines, setManageMedicines] = useState(false)
  const [manageLabs, setManageLabs] = useState(false)

  const customComplaints = useCustomSuggestions('clinic:custom:complaints')
  const customMedicines = useCustomSuggestions('clinic:custom:medicines')
  const customLabs = useCustomSuggestions('clinic:custom:labs')

  const allComplaints = useMemo(() => [...CHIEF_COMPLAINTS.filter(c => !customComplaints.hiddenDefaults.includes(c)), ...customComplaints.items], [customComplaints])
  const allMedicines = useMemo(() => [...MEDICINE_SUGGESTIONS.filter(m => !customMedicines.hiddenDefaults.includes(m)), ...customMedicines.items], [customMedicines])
  const allLabs = useMemo(() => [...LAB_CHECKS.filter(l => !customLabs.hiddenDefaults.includes(l)), ...customLabs.items], [customLabs])

  // Doctors
  const [doctors, setDoctors] = useState<any[]>([])
  const singleDoctor = isSingleDoctorMode()
  useEffect(() => {
    window.api.clinic.doctors.list().then((rows: any[]) => {
      const list = rows ?? []
      setDoctors(list)

      if (singleDoctor && !existingSession?.doctorId && !defaultAppointment?.doctorId) {
        const defaultId = resolveDefaultDoctorId(list)
        if (defaultId) {
          const selected = list.find((d: any) => d.id === defaultId)
          setDoctorId(defaultId)
          setDoctorName(selected?.name ?? '')
        }
      }
    }).catch(() => {})
  }, [singleDoctor, existingSession?.doctorId, defaultAppointment?.doctorId])

  // Form State
  const [patientId, setPatientId] = useState(existingSession?.patientId ?? defaultPatient?.id ?? defaultAppointment?.patient?.id ?? '')
  const [patientName, setPatientName] = useState(existingSession?.patient?.name ?? defaultPatient?.name ?? defaultAppointment?.patient?.name ?? '')
  const [patientPhone, setPatientPhone] = useState(existingSession?.patient?.phone ?? defaultPatient?.phone ?? defaultAppointment?.patient?.phone ?? '')
  const [patientBlood, setPatientBlood] = useState(existingSession?.patient?.bloodType ?? defaultPatient?.bloodType ?? '')

  const [visitDate, setVisitDate] = useState(toDatetimeLocal(existingSession?.visitDate) || (defaultAppointment ? toDatetimeLocal(defaultAppointment.appointmentDate) : '') || toDatetimeLocal(new Date().toISOString()))
  const [visitType, setVisitType] = useState<VisitType>((existingSession?.visitType as VisitType) ?? (defaultAppointment ? APPT_TO_VISIT_TYPE[defaultAppointment.type] ?? 'routine' : 'routine'))
  const [doctorName, setDoctorName] = useState(existingSession?.doctorName ?? defaultAppointment?.doctorName ?? '')
  const [doctorId, setDoctorId] = useState(existingSession?.doctorId ?? defaultAppointment?.doctorId ?? '')
  const [chiefComplaint, setChiefComplaint] = useState(existingSession?.chiefComplaint ?? '')
  const [vitals, setVitals] = useState<VitalsData>(parseVitals(existingSession?.vitals))
  const [showVitals, setShowVitals] = useState(() => Object.values(parseVitals(existingSession?.vitals)).some(Boolean))
  const [diagnosis, setDiagnosis] = useState(existingSession?.diagnosis ?? '')
  const [notes, setNotes] = useState(existingSession?.notes ?? '')
  const [followUpDate, setFollowUpDate] = useState(toDatetimeLocal(existingSession?.followUpDate))
  const [status, setStatus] = useState<SessionStatus>(existingSession?.status ?? 'completed')

  const [isDentistMode] = useState(() => localStorage.getItem('clinicDentistMode') === 'true')
  const [showDentalChart, setShowDentalChart] = useState(true)
  const [dentalChart, setDentalChart] = useState(() => {
    try { return existingSession?.dentalChart ? JSON.parse(existingSession.dentalChart) : {} } catch { return {} }
  })

  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>(() => existingSession?.prescriptions?.map(rx => ({ ...rx, quantity: rx.quantity?.toString() ?? '', isActive: rx.isActive ?? true })) ?? [])
  const [labOrders, setLabOrders] = useState<LabOrderItem[]>(() => {
    try { return existingSession?.labOrders ? JSON.parse(existingSession.labOrders) : [] } catch { return [] }
  })

  const [sessionMaterials, setSessionMaterials] = useState<SessionMaterialItem[]>(
    existingSession?.sessionMaterials?.map(sm => ({
      materialId: sm.materialId,
      materialName: sm.material?.name || (sm as any).materialName,
      unit: sm.material?.unit || (sm as any).unit,
      quantityUsed: sm.quantityUsed.toString(),
      notes: sm.notes ?? '',
      batchId: sm.batchId ?? undefined
    })) ?? []
  )
  const [availableMaterials, setAvailableMaterials] = useState<any[]>([])
  useEffect(() => {
    window.api.clinic.materials.getAll({ isActive: true, take: 500 }).then((res: any) => setAvailableMaterials(res?.data ?? [])).catch(() => {})
  }, [])

  async function handleAddMaterial(mat: any) {
    if (sessionMaterials.some(m => m.materialId === mat.id)) return
    let batches: any[] = []
    try {
      const rawBatches = await window.api.clinic.materialBatches.getByMaterial(mat.id)
      batches = (rawBatches ?? []).filter((b: any) => b.isActive && b.quantity > 0)
    } catch {}
    setSessionMaterials(prev => [...prev, { materialId: mat.id, materialName: mat.name, unit: mat.unit, quantityUsed: '1', notes: '', batchId: batches?.[0]?.id, batches }])
  }

  const [amountCharged, setAmountCharged] = useState(existingSession?.amountCharged?.toString() ?? defaultAppointment?.amountCharged?.toString() ?? '')
  const [amountPaid, setAmountPaid] = useState(existingSession?.amountPaid?.toString() ?? defaultAppointment?.amountPaid?.toString() ?? '')
  const [paymentMethod, setPaymentMethod] = useState(existingSession?.paymentMethod ?? defaultAppointment?.paymentMethod ?? 'cash')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!patientId) { showToast('error', t('patientRequired') || 'Patient is required'); setActiveSection('clinical'); return }
    if (!chiefComplaint.trim()) { showToast('error', t('chiefComplaintRequired') || 'Chief complaint is required'); setActiveSection('clinical'); return }

    setSaving(true)
    try {
      const vitalsClean = Object.fromEntries(Object.entries(vitals).filter(([, v]) => v && String(v).trim() !== ''))
      const payload = {
        patientId,
        visitDate: visitDate ? new Date(visitDate).toISOString() : new Date().toISOString(),
        visitType,
        doctorName: doctorName || null,
        doctorId: doctorId || null,
        chiefComplaint: chiefComplaint.trim(),
        vitals: Object.keys(vitalsClean).length > 0 ? JSON.stringify(vitalsClean) : null,
        diagnosis: diagnosis.trim() || null,
        notes: notes.trim() || null,
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : null,
        status: followUpDate ? 'active' : existingSession ? status : 'completed',
        amountCharged: amountCharged ? parseFloat(amountCharged) : null,
        amountPaid: amountPaid ? parseFloat(amountPaid) : null,
        paymentStatus: computePaymentStatus(amountCharged, amountPaid),
        paymentMethod: paymentMethod || null,
        dentalChart: Object.keys(dentalChart).length > 0 ? JSON.stringify(dentalChart) : null,
        labOrders: labOrders.filter(l => l.testName.trim()).length > 0 ? JSON.stringify(labOrders.filter(l => l.testName.trim())) : null,
        prescriptions: prescriptions.filter(rx => rx.medicineName.trim()).map(rx => ({
          medicineName: rx.medicineName.trim(),
          dosage: rx.dosage || null,
          frequency: rx.frequency || null,
          duration: rx.duration || null,
          quantity: rx.quantity ? parseInt(String(rx.quantity)) : null,
          instructions: rx.instructions || null,
          isActive: rx.isActive ?? true
        }))
      }

      const materialItems = sessionMaterials.filter(m => m.materialId && parseFloat(String(m.quantityUsed)) > 0).map(m => ({
        materialId: m.materialId,
        quantityUsed: parseFloat(String(m.quantityUsed)),
        notes: m.notes || undefined,
        batchId: m.batchId || undefined
      }))

      if (existingSession) {
        await window.api.clinic.sessions.update(existingSession.id, payload)
        await window.api.clinic.materials.setSessionMaterials(existingSession.id, materialItems)
        showToast('success', t('savedSuccessfully') || 'Session updated')
      } else {
        const created = await window.api.clinic.sessions.create(payload)
        if (materialItems.length > 0) await window.api.clinic.materials.setSessionMaterials(created.id, materialItems)
        if (defaultAppointment) {
          try { await window.api.clinic.appointments.update(defaultAppointment.id, { status: 'completed' }) } catch {}
        }
        showToast('success', t('createdSuccessfully') || 'Session created')
      }
      onSaved()
    } catch {
      showToast('error', t('errorSavingRecord') || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {existingSession ? 'Edit Clinical Session' : 'Clinical Consultation & Visit'}
              </h2>
              <p className="text-xs text-slate-400">{patientName ? `Patient: ${patientName}` : 'Examination, Rx, and Billing'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(prescriptions.length > 0 || labOrders.length > 0) && (
              <button type="button" onClick={() => setShowRxPrint(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 text-xs font-semibold">
                <Printer className="h-3.5 w-3.5" /> Rx Slip
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 gap-2 text-xs font-bold bg-white dark:bg-slate-900 flex-shrink-0 overflow-x-auto">
          {[
            { id: 'clinical', label: '1. Examination & Vitals', icon: Activity },
            { id: 'treatment', label: '2. Prescriptions & Labs', icon: Pill },
            { id: 'inventory', label: '3. Inventory Used', icon: Package },
            { id: 'billing', label: '4. Invoicing & Follow-up', icon: CreditCard }
          ].map(tab => {
            const Icon = tab.icon
            const active = activeSection === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id as ModalSection)}
                className={`py-3 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
                  active ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          <PatientSelector
            isLocked={Boolean(existingSession)}
            patientName={patientName}
            patientPhone={patientPhone}
            patientBlood={patientBlood}
            onSelectPatient={p => {
              setPatientId(p.id)
              setPatientName(p.name)
              setPatientPhone(p.phone)
              setPatientBlood(p.bloodType??'')
            }}
          />

          {activeSection === 'clinical' && (
            <ClinicalSection
              visitDate={visitDate}
              onVisitDateChange={setVisitDate}
              visitType={visitType}
              onVisitTypeChange={setVisitType}
              doctorId={doctorId}
              doctorName={doctorName}
              onDoctorChange={(id, name) => { setDoctorId(id); setDoctorName(name) }}
              doctors={doctors}
              singleDoctor={singleDoctor}
              chiefComplaint={chiefComplaint}
              onChiefComplaintChange={setChiefComplaint}
              allComplaints={allComplaints}
              onManageComplaints={() => setManageComplaints(true)}
              vitals={vitals}
              onVitalChange={(k, v) => setVitals(prev => ({ ...prev, [k]: v }))}
              showVitals={showVitals}
              onToggleVitals={() => setShowVitals(v => !v)}
              diagnosis={diagnosis}
              onDiagnosisChange={setDiagnosis}
              notes={notes}
              onNotesChange={setNotes}
              isDentistMode={isDentistMode}
              dentalChart={dentalChart}
              onDentalChartChange={setDentalChart}
              showDentalChart={showDentalChart}
              onToggleDentalChart={() => setShowDentalChart(v => !v)}
            />
          )}

          {activeSection === 'treatment' && (
            <div className="space-y-6">
              <PrescriptionsSection
                prescriptions={prescriptions}
                onChange={setPrescriptions}
                allMedicines={allMedicines}
                onManageMedicines={() => setManageMedicines(true)}
              />
              <LabOrdersSection
                labOrders={labOrders}
                onChange={setLabOrders}
                allLabs={allLabs}
                onManageLabs={() => setManageLabs(true)}
              />
            </div>
          )}

          {activeSection === 'inventory' && (
            <InventorySection
              sessionMaterials={sessionMaterials}
              onChange={setSessionMaterials}
              availableMaterials={availableMaterials}
              onAddMaterial={handleAddMaterial}
            />
          )}

          {activeSection === 'billing' && (
            <BillingSection
              amountCharged={amountCharged}
              onAmountChargedChange={setAmountCharged}
              amountPaid={amountPaid}
              onAmountPaidChange={setAmountPaid}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              followUpDate={followUpDate}
              onFollowUpDateChange={setFollowUpDate}
              status={status}
              onStatusChange={setStatus}
              isEditing={Boolean(existingSession)}
              isDefaultAppointment={Boolean(defaultAppointment)}
            />
          )}

          {/* Footer Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold shadow-md shadow-teal-600/20 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {existingSession ? 'Save Changes' : 'Complete Consultation'}
            </button>
          </div>
        </form>
      </div>

      {/* Suggestion Modals */}
      {manageComplaints && (
        <ManageSuggestionsModal
          title="Manage Complaints"
          items={customComplaints.items}
          onAdd={customComplaints.add}
          onRemove={customComplaints.remove}
          onClose={() => setManageComplaints(false)}
          placeholder="New preset..."
          defaultItems={CHIEF_COMPLAINTS}
          hiddenDefaults={customComplaints.hiddenDefaults}
          onHideDefault={customComplaints.hideDefault}
          onShowDefault={customComplaints.showDefault}
        />
      )}
      {manageMedicines && (
        <ManageSuggestionsModal
          title="Manage Medicines"
          items={customMedicines.items}
          onAdd={customMedicines.add}
          onRemove={customMedicines.remove}
          onClose={() => setManageMedicines(false)}
          placeholder="New medicine..."
          defaultItems={MEDICINE_SUGGESTIONS}
          hiddenDefaults={customMedicines.hiddenDefaults}
          onHideDefault={customMedicines.hideDefault}
          onShowDefault={customMedicines.showDefault}
        />
      )}
      {manageLabs && (
        <ManageSuggestionsModal
          title="Manage Lab Tests"
          items={customLabs.items}
          onAdd={customLabs.add}
          onRemove={customLabs.remove}
          onClose={() => setManageLabs(false)}
          placeholder="New lab test..."
          defaultItems={LAB_CHECKS}
          hiddenDefaults={customLabs.hiddenDefaults}
          onHideDefault={customLabs.hideDefault}
          onShowDefault={customLabs.showDefault}
        />
      )}

      {showRxPrint && (
        <PrescriptionPrintModal
          session={{
            id: existingSession?.id || 'new',
            visitDate: visitDate || new Date().toISOString(),
            doctorName: doctorName || null,
            chiefComplaint,
            diagnosis: diagnosis || null,
            notes: notes || null,
            labOrders: labOrders.filter(l => l.testName.trim()),
            prescriptions: prescriptions.filter(rx => rx.medicineName.trim()).map((rx, i) => ({ id: String(i), ...rx, quantity: rx.quantity ? parseInt(String(rx.quantity)) : null }))
          }}
          patient={{ name: patientName, phone: patientPhone, bloodType: patientBlood }}
          onClose={() => setShowRxPrint(false)}
        />
      )}
    </div>
  )
}