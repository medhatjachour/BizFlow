import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Shift, ShiftSummary, Preset, StatusFilter, OpenForm, CloseForm } from '../types'
import {  EMPTY_OPEN_FORM, EMPTY_CLOSE_FORM, PAGE_SIZE } from '../constants'
import { applyPreset } from '../utils'

export function useShifts(toast: any, user: any) {
  // ── Data ──
  const [activeShift, setActiveShift] = useState<Shift | null>(null)
  const [summary,     setSummary]     = useState<ShiftSummary | null>(null)
  const [history,     setHistory]     = useState<Shift[]>([])
  const [total,       setTotal]       = useState(0)
  const [loading,     setLoading]     = useState(true)

  // ── Filters ──
  const [preset,       setPreset]       = useState<Preset>('month')
  const [from,         setFrom]         = useState('')
  const [to,           setTo]           = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page,         setPage]         = useState(1)

  // ── Detail drawer ──
  const [detailShift,   setDetailShift]   = useState<Shift | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // ── Open modal ──
  const [openModal, setOpenModal] = useState(false)
  const [openForm,  setOpenForm]  = useState<OpenForm>({ ...EMPTY_OPEN_FORM })
  const [opening,   setOpening]   = useState(false)

  // ── Close modal ──
  const [closeModal, setCloseModal] = useState(false)
  const [closeForm,  setCloseForm]  = useState<CloseForm>({ ...EMPTY_CLOSE_FORM })
  const [closing,    setClosing]    = useState(false)

  // ── Apply preset ──
  const applyPresetRange = useCallback((p: Preset) => {
    const range = applyPreset(p)
    setPreset(p)
    setFrom(range.from)
    setTo(range.to)
  }, [])

  // Initialize with month preset
  useEffect(() => {
    applyPresetRange('month')
  }, [applyPresetRange])

  // ── API filters ──
  const apiFilters = useMemo(() => ({
    startDate: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    endDate:   to   ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
  }), [from, to])

  // ── Load ──
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [active, hist, sum] = await Promise.all([
        window.api.coffee.shifts.getActive(),
        window.api.coffee.shifts.getHistory({
          ...apiFilters,
          status: statusFilter,
          page,
          pageSize: PAGE_SIZE,
        }),
        window.api.coffee.shifts.getSummary(apiFilters),
      ])
      setActiveShift(active)
      setHistory(hist?.items ?? [])
      setTotal(hist?.total ?? 0)
      setSummary(sum)
    } catch {
      toast.error('Failed to load shifts')
    } finally {
      setLoading(false)
    }
  }, [apiFilters, statusFilter, page, toast])

  useEffect(() => { setPage(1) }, [from, to, statusFilter])
  useEffect(() => { load() }, [load])

  // ── Detail ──
  const openDetail = useCallback(async (shiftId: string) => {
    setLoadingDetail(true)
    try {
      setDetailShift(await window.api.coffee.shifts.getDetails(shiftId))
    } catch {
      toast.error('Failed to load shift details')
    } finally {
      setLoadingDetail(false)
    }
  }, [toast])

  const closeDetail = useCallback(() => setDetailShift(null), [])

  // ── Open shift ──
  const openOpenModal = useCallback(() => {
    setOpenForm({ ...EMPTY_OPEN_FORM })
    setOpenModal(true)
  }, [])

  const closeOpenModal = useCallback(() => setOpenModal(false), [])

  const patchOpenForm = useCallback((patch: Partial<OpenForm>) => {
    setOpenForm(prev => ({ ...prev, ...patch }))
  }, [])

  const submitOpen = useCallback(async () => {
    if (!user?.id) { toast.error('You must be logged in'); return }
    setOpening(true)
    try {
      await window.api.coffee.shifts.open({
        cashierId: user.id,
        openingCash: Number(openForm.openingCash) || 0,
        notes: openForm.notes || undefined,
      })
      toast.success('Shift opened successfully')
      setOpenModal(false)
      load()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to open shift')
    } finally {
      setOpening(false)
    }
  }, [user, openForm, load, toast])

  // ── Close shift ──
  const openCloseModal = useCallback(() => {
    if (!activeShift) return
    const expected = activeShift.openingCash + activeShift.cashTotal
    setCloseForm({ closingCash: String(expected), notes: '' })
    setCloseModal(true)
  }, [activeShift])

  const closeCloseModal = useCallback(() => setCloseModal(false), [])

  const patchCloseForm = useCallback((patch: Partial<CloseForm>) => {
    setCloseForm(prev => ({ ...prev, ...patch }))
  }, [])

  const submitClose = useCallback(async () => {
    if (!activeShift) return
    setClosing(true)
    try {
      await window.api.coffee.shifts.close({
        shiftId: activeShift.id,
        closingCash: Number(closeForm.closingCash) || 0,
        notes: closeForm.notes || undefined,
      })
      toast.success('Shift closed successfully')
      setCloseModal(false)
      load()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to close shift')
    } finally {
      setClosing(false)
    }
  }, [activeShift, closeForm, load, toast])

  // ── Derived ──
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const activeExpectedDrawer = activeShift
    ? activeShift.openingCash + activeShift.cashTotal
    : 0

  const activeVariance = activeShift
    ? Number(closeForm.closingCash || activeExpectedDrawer) - activeExpectedDrawer
    : 0

  return {
    // data
    activeShift, summary, history, total, loading, totalPages, page,
    // filters
    preset, from, to, statusFilter,
    setPreset: applyPresetRange, setFrom, setTo, setStatusFilter, setPage,
    // detail
    detailShift, loadingDetail, openDetail, closeDetail,
    // open modal
    openModal, openForm, patchOpenForm, opening,
    openOpenModal, closeOpenModal, submitOpen,
    // close modal
    closeModal, closeForm, patchCloseForm, closing,
    openCloseModal, closeCloseModal, submitClose,
    // derived
    activeExpectedDrawer, activeVariance,
    // reload
    load,
  }
}
