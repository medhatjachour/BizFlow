import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { useShiftsManagement } from './hooks/useShiftsManagement'
import { ShiftMetricCards } from './components/ShiftMetricCards'
import { ActiveShiftBanner } from './components/ActiveShiftBanner'
import { OpenShiftModal } from './components/OpenShiftModal'
import { CloseShiftModal } from './components/CloseShiftModal'
import { ZReportModal } from './components/ZReportModal'

export default function StaffShiftsPage() {
  const {
    activeShift,
    zReport,
    setZReport,
    error,
    openShift,
    closeShift,
    fetchZReport
  } = useShiftsManagement()

  const [showOpenModal, setShowOpenModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showZReportModal, setShowZReportModal] = useState(false)

  const handleOpenReport = () => {
    if (activeShift) {
      fetchZReport(activeShift.id)
      setShowZReportModal(true)
    }
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Top Shift Metrics */}
      <ShiftMetricCards activeShift={activeShift} />

      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Active Drawer Banner / Call to Action */}
      <ActiveShiftBanner
        activeShift={activeShift}
        onOpenShiftModal={() => setShowOpenModal(true)}
        onCloseShiftModal={() => setShowCloseModal(true)}
        onViewReportModal={handleOpenReport}
      />

      {/* Modals */}
      <OpenShiftModal
        isOpen={showOpenModal}
        onClose={() => setShowOpenModal(false)}
        onOpen={openShift}
      />

      <CloseShiftModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        shift={activeShift}
        onCloseShift={closeShift}
      />

      <ZReportModal
        isOpen={showZReportModal || Boolean(zReport)}
        onClose={() => {
          setShowZReportModal(false)
          setZReport(null)
        }}
        report={zReport}
      />
    </div>
  )
}