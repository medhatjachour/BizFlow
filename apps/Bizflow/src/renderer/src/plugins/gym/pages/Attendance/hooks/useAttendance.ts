import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Trainee, Session, CalendarData, AtRiskMember, PaymentMethod } from '../types'
import { getTodayString, getSubscriptionStatus } from '../utils'

export function useAttendance() {
  const toast = useToast()

  // Selection & Cal
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString())
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })

  // Data states
  const [sessions, setSessions] = useState<Session[]>([])
  const [calData, setCalData] = useState<CalendarData>({})
  const [atRisk, setAtRisk] = useState<AtRiskMember[]>([])
  const [loadingDay, setLoadingDay] = useState(false)

  // Quick Search & Check-in
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Trainee[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [checkingInId, setCheckingInId] = useState<string | null>(null)
  const [flashSuccessId, setFlashSuccessId] = useState<string | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Paid Trainee Walk-in Inline State
  const [feeTarget, setFeeTarget] = useState<Trainee | null>(null)
  const [feeAmount, setFeeAmount] = useState<string>('')
  const [feePayMethod, setFeePayMethod] = useState<PaymentMethod>('cash')
  const [checkingInFee, setCheckingInFee] = useState(false)

  // Anonymous Walk-in Form State
  const [showAnonForm, setShowAnonForm] = useState(false)
  const [anonName, setAnonName] = useState('')
  const [anonAmount, setAnonAmount] = useState('')
  const [anonPayMethod, setAnonPayMethod] = useState<PaymentMethod>('cash')
  const [savingAnon, setSavingAnon] = useState(false)

  // Deletion State
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Loaders ──
  const loadDaySessions = useCallback(async (date: string) => {
    setLoadingDay(true)
    try {
      const res = await (window.api as any).gym?.sessions?.getAll({ date, take: 500 })
      setSessions(Array.isArray(res) ? res : res?.data ?? [])
    } catch {
      setSessions([])
    } finally {
      setLoadingDay(false)
    }
  }, [])

  const loadCalendarStats = useCallback(async (year: number, month: number) => {
    try {
      const data = await (window.api as any).gym?.sessions?.getCalendar({ year, month })
      setCalData(data ?? {})
    } catch {
      setCalData({})
    }
  }, [])

  useEffect(() => {
    loadDaySessions(selectedDate)
  }, [selectedDate, loadDaySessions])

  useEffect(() => {
    loadCalendarStats(calMonth.year, calMonth.month)
  }, [calMonth, loadCalendarStats])

  useEffect(() => {
    ;(window.api as any).gym?.alerts?.atRisk(14)
      .then((res: AtRiskMember[]) => setAtRisk(res ?? []))
      .catch(() => setAtRisk([]))
  }, [])

  // ── Member Search ──
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    debounceTimer.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await (window.api as any).gym?.trainees?.getAll({ search: query, take: 8 })
        setSearchResults(Array.isArray(res) ? res : res?.data ?? [])
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 250)
  }

  // ── Subscription Check-in ──
  const performSubscriptionCheckIn = async (trainee: Trainee) => {
    const status = getSubscriptionStatus(trainee)
    if (status === 'none') {
      setFeeTarget(trainee)
      return
    }
    setCheckingInId(trainee.id)
    try {
      await (window.api as any).gym?.sessions?.create({
        traineeId: trainee.id,
        type: 'subscription_visit',
        date: selectedDate,
        amount: 0
      })
      setFlashSuccessId(trainee.id)
      setTimeout(() => setFlashSuccessId(null), 1800)
      toast.success(`${trainee.name} checked in!`)
      setSearchQuery('')
      setSearchResults([])
      loadDaySessions(selectedDate)
      loadCalendarStats(calMonth.year, calMonth.month)
    } catch (err: any) {
      toast.error(err.message ?? 'Check-in failed')
    } finally {
      setCheckingInId(null)
    }
  }

  // ── Paid Member Check-in ──
  const performPaidMemberCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feeTarget) return
    const amt = parseFloat(feeAmount)
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid visit fee')
      return
    }
    setCheckingInFee(true)
    try {
      await (window.api as any).gym?.sessions?.create({
        traineeId: feeTarget.id,
        type: 'walkin',
        date: selectedDate,
        amount: amt,
        paymentMethod: feePayMethod
      })
      setFlashSuccessId(feeTarget.id)
      setTimeout(() => setFlashSuccessId(null), 1800)
      toast.success(`${feeTarget.name} checked in!`)
      setFeeTarget(null)
      setFeeAmount('')
      setSearchQuery('')
      setSearchResults([])
      loadDaySessions(selectedDate)
      loadCalendarStats(calMonth.year, calMonth.month)
    } catch (err: any) {
      toast.error(err.message ?? 'Check-in failed')
    } finally {
      setCheckingInFee(false)
    }
  }

  // ── Anonymous Walk-In ──
  const performAnonymousCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(anonAmount)
    if (!amt || amt <= 0) {
      toast.error('Payment is required for anonymous walk-ins')
      return
    }
    setSavingAnon(true)
    try {
      await (window.api as any).gym?.sessions?.create({
        type: 'walkin',
        date: selectedDate,
        amount: amt,
        paymentMethod: anonPayMethod,
        notes: anonName.trim() ? `Walk-in: ${anonName.trim()}` : undefined
      })
      toast.success('Walk-in registered!')
      setShowAnonForm(false)
      setAnonName('')
      setAnonAmount('')
      loadDaySessions(selectedDate)
      loadCalendarStats(calMonth.year, calMonth.month)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to register walk-in')
    } finally {
      setSavingAnon(false)
    }
  }

  // ── Session Deletion ──
  const performDeleteSession = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await (window.api as any).gym?.sessions?.delete(deleteTarget.id)
      toast.success('Check-in deleted')
      setDeleteTarget(null)
      loadDaySessions(selectedDate)
      loadCalendarStats(calMonth.year, calMonth.month)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete check-in')
    } finally {
      setIsDeleting(false)
    }
  }

  const navigateMonth = (delta: number) => {
    setCalMonth(prev => {
      let m = prev.month + delta
      let y = prev.year
      if (m > 12) {
        m = 1
        y++
      }
      if (m < 1) {
        m = 12
        y--
      }
      return { year: y, month: m }
    })
  }

  const selectDate = (dateStr: string) => {
    if (dateStr > getTodayString()) return
    setSelectedDate(dateStr)
    const [y, m] = dateStr.split('-').map(Number)
    if (y !== calMonth.year || m !== calMonth.month) {
      setCalMonth({ year: y, month: m })
    }
  }

  return {
    selectedDate,
    setSelectedDate: selectDate,
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
    // Paid walk-in inline
    feeTarget,
    setFeeTarget,
    feeAmount,
    setFeeAmount,
    feePayMethod,
    setFeePayMethod,
    checkingInFee,
    performPaidMemberCheckIn,
    // Anon
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
    // Delete
    deleteTarget,
    setDeleteTarget,
    isDeleting,
    performDeleteSession
  }
}