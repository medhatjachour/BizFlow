import { useAttendance } from './hooks/useAttendance'
import { AtRiskBanner } from './components/AtRiskBanner'
import { QuickCheckInCard } from './components/QuickCheckInCard'
import { DateNavigator } from './components/DateNavigator'
import { DayStatsStrip } from './components/DayStatsStrip'
import { SessionList } from './components/SessionList'
import { MiniCalendar } from './components/MiniCalendar'
import { DeleteConfirmModal } from './components/DeleteConfirmModal'
import { getTodayString } from './utils'

export default function AttendanceTab() {
  const {
    selectedDate,
    setSelectedDate,
    calMonth,
    navigateMonth,
    sessions,
    calData,
    atRisk,
    loadingDay,
    searchQuery,
    searchResults,
    isSearching,
    checkingInId,
    flashSuccessId,
    handleSearchChange,
    performSubscriptionCheckIn,
    feeTarget,
    feeAmount,
    setFeeAmount,
    feePayMethod,
    setFeePayMethod,
    checkingInFee,
    performPaidMemberCheckIn,
    showAnonForm,
    setShowAnonForm,
    anonName,
    setAnonName,
    anonAmount,
    setAnonAmount,
    anonPayMethod,
    setAnonPayMethod,
    savingAnon,
    performAnonymousCheckIn,
    deleteTarget,
    setDeleteTarget,
    isDeleting,
    performDeleteSession
  } = useAttendance()

  const isToday = selectedDate === getTodayString()

  return (
    <div className="space-y-5">
      {/* Retention / Inactive Alert Banner */}
      <AtRiskBanner members={atRisk} />

      {/* Express Check-In & Walk-In Box */}
      <QuickCheckInCard
        searchQuery={searchQuery}
        searchResults={searchResults}
        isSearching={isSearching}
        checkingInId={checkingInId}
        flashSuccessId={flashSuccessId}
        onSearchChange={handleSearchChange}
        onCheckInClick={performSubscriptionCheckIn}
        feeTarget={feeTarget}
        feeAmount={feeAmount}
        feePayMethod={feePayMethod}
        checkingInFee={checkingInFee}
        onFeeAmountChange={setFeeAmount}
        onFeeMethodChange={setFeePayMethod}
        onFeeSubmit={performPaidMemberCheckIn}
        onFeeCancel={() => setFeeAmount('')}
        showAnonForm={showAnonForm}
        anonName={anonName}
        anonAmount={anonAmount}
        anonPayMethod={anonPayMethod}
        savingAnon={savingAnon}
        onAnonToggle={setShowAnonForm}
        onAnonNameChange={setAnonName}
        onAnonAmountChange={setAnonAmount}
        onAnonMethodChange={setAnonPayMethod}
        onAnonSubmit={performAnonymousCheckIn}
      />

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Date Nav + Daily KPIs + Check-in Log */}
        <div className="lg:col-span-2 space-y-4">
          <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
          <DayStatsStrip sessions={sessions} />
          <SessionList
            sessions={sessions}
            loading={loadingDay}
            isToday={isToday}
            onDeleteSession={setDeleteTarget}
          />
        </div>

        {/* Right 1 Col: Mini Month Calendar Grid */}
        <div className="lg:col-span-1">
          <MiniCalendar
            calMonth={calMonth}
            selectedDate={selectedDate}
            calData={calData}
            onMonthChange={navigateMonth}
            onDateSelect={setSelectedDate}
          />
        </div>
      </div>

      {/* Deletion Dialog */}
      <DeleteConfirmModal
        target={deleteTarget}
        deleting={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={performDeleteSession}
      />
    </div>
  )
}