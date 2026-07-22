import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ExpenseRow, Summary, Filters, ExpenseForm } from '../types'
import { EMPTY_FORM } from '../constants'
import { dateRange, fmtDate } from '../utils'

export function useExpenses(toast: any) {
  // ── Filters (grouped) ──
  const [filters, setFilters] = useState<Filters>({
    period: 'month',
    category: 'all',
    paymentMethod: 'all',
    shiftId: 'all',
    search: '',
    page: 1,
  })

  const patchFilters = useCallback((patch: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...patch, page: 1 }))
  }, [])

  // ── Data ──
  const [rows,        setRows]        = useState<ExpenseRow[]>([])
  const [summary,     setSummary]     = useState<Summary | null>(null)
  const [activeShift, setActiveShift] = useState<any>(null)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)

  // ── Modal / form ──
  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState<ExpenseRow | null>(null)
  const [form,      setForm]      = useState<ExpenseForm>({ ...EMPTY_FORM })

  const patchForm = useCallback((patch: Partial<ExpenseForm>) => {
    setForm(prev => ({ ...prev, ...patch }))
  }, [])

  // ── API params ──
  const apiParams = useMemo(() => ({
    ...dateRange(filters.period),
    category:       filters.category === 'all' ? undefined : filters.category,
    paymentMethod:  filters.paymentMethod === 'all' ? undefined : filters.paymentMethod,
    shiftId:        filters.shiftId === 'all' ? undefined : filters.shiftId,
    search:         filters.search.trim() || undefined,
    page:           filters.page,
    pageSize:       20,
  }), [filters])

  // ── Load ──
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, sum, shift] = await Promise.all([
        window.api.coffee.expenses.getAll(apiParams),
        window.api.coffee.expenses.getSummary(apiParams),
        window.api.coffee.shifts.getActive().catch(() => null),
      ])
      setRows(list?.items ?? list?.data ?? [])
      setSummary(sum)
      setActiveShift(shift)
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [apiParams, toast])

  useEffect(() => { load() }, [load])

  // ── Modal helpers ──
  const openCreate = useCallback(() => {
    setEditing(null)
    setForm({
      ...EMPTY_FORM,
      date: fmtDate(new Date()),
      shiftId: activeShift?.id ?? '',
    })
    setModalOpen(true)
  }, [activeShift])

  const openEdit = useCallback((exp: ExpenseRow) => {
    setEditing(exp)
    setForm({
      date:          fmtDate(new Date(exp.date)),
      category:      exp.category,
      description:   exp.description,
      amount:        String(exp.amount),
      vendor:        exp.vendor ?? '',
      paymentMethod: exp.paymentMethod,
      recurrence:    exp.recurrence,
      shiftId:       exp.shiftId ?? '',
      notes:         exp.notes ?? '',
    })
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditing(null)
  }, [])

  // ── CRUD ──
  const save = useCallback(async () => {
    if (!form.description.trim()) { toast.error('Description is required'); return }
    if (!form.amount || isNaN(Number(form.amount))) { toast.error('Valid amount required'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        amount:        Number(form.amount),
        vendor:        form.vendor || null,
        notes:         form.notes || null,
        shiftId:       form.shiftId || null,
      }
      if (editing) await window.api.coffee.expenses.update(editing.id, payload)
      else         await window.api.coffee.expenses.create(payload)
      toast.success(editing ? 'Expense updated' : 'Expense added')
      closeModal()
      load()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save expense')
    } finally {
      setSaving(false)
    }
  }, [form, editing, closeModal, load, toast])

  const remove = useCallback(async (id: string) => {
    if (!confirm('Delete this expense?')) return
    try {
      await window.api.coffee.expenses.delete(id)
      toast.success('Expense deleted')
      load()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete expense')
    }
  }, [load, toast])

  return {
    // data
    rows, summary, activeShift, loading, saving,
    // filters
    filters, patchFilters, setPage: (p: number) => setFilters(prev => ({ ...prev, page: p })),
    // modal
    modalOpen, editing, form, patchForm,
    openCreate, openEdit, closeModal,
    // crud
    save, remove,
    // reload
    load,
  }
}
