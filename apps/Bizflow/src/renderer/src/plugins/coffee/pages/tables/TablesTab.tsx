import { useState, useEffect } from 'react'
import { Plus, Coffee } from 'lucide-react'
import { useTables } from './hooks/useTables'
import TableCard from './components/TableCard'
import NewOrderModal from './components/NewOrderModal'
import OrderPanelModal from './components/OrderPanelModal'
import TableFormModal from './components/TableFormModal'
import HistoryDrawer from './components/HistoryDrawer'
import { CoffeeTable, ActiveOrder } from './types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export default function TablesTab() {
  const { tables, loading, activeShift, setStatus, saveTable ,toggleTableActive} = useTables()
  const [filter, setFilter] = useState<'all' | 'available' | 'occupied' | 'cleaning'>('all')
  // Modal States
  const [newOrderTable, setNewOrderTable] = useState<CoffeeTable | null>(null)
  const [orderPanelState, setOrderPanelState] = useState<{
    table: CoffeeTable
    order: ActiveOrder
  } | null>(null)
  const [tableModalState, setTableModalState] = useState<{
    show: boolean
    editTarget: CoffeeTable | null
  }>({ show: false, editTarget: null })
  const [histTable, setHistTable] = useState<CoffeeTable | null>(null)
  const {t} = useLanguage()
  const counts = tables.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
  const visible = filter === 'all' ? tables : tables.filter((t) => t.status === filter)

  // OS Level: Keyboard shortcut to close modals globally if needed, or handle inside modal
  // OS Level: Auto-refresh tables every 30 seconds to sync elapsed times
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update elapsed times on cards
      // This is a simple trick if you don't have a global state manager
      setFilter((f) => f)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Coffee size={20} className="text-amber-500" /> {t('cfTable')||'Table'}
          </h1>
          <div className="flex gap-1.5 ml-4">
            {(['all', 'available', 'occupied', 'cleaning'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 mx-1 rounded-xl text-xs font-medium capitalize transition-all ${filter === s ? 'bg-amber-500 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-amber-300'}`}
              >
                {s} ({s === 'all' ? tables.length : (counts[s] ?? 0)})
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setTableModalState({ show: true, editTarget: null })}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 shadow-sm transition-colors"
        >
          <Plus size={16} /> {t('cfAddTable')||'Add Table'}
        </button>
      </div>

      {/* Grid Layout */}
      <div className="flex-grow overflow-y-auto pr-2 -mr-2">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
            <Coffee size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-medium">{loading ? 'Loading...' : 'No tables found'}</p>
            {!loading && <p className="text-sm">{t('cfNoTables')||'Click "Add Table" to create one.'}</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visible.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onNewOrder={() => setNewOrderTable(table)}
                onManageOrder={() => setOrderPanelState({ table, order: table.orders[0] })}
                onSetStatus={(status) => setStatus(table.id, status)}
                onOpenHistory={() => setHistTable(table)}
                onEdit={() => setTableModalState({ show: true, editTarget: table })}
                onToggleActive={() => toggleTableActive(table)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals & Drawers */}
      {newOrderTable && (
        <NewOrderModal
          table={newOrderTable}
          activeShift={activeShift}
          onClose={() => setNewOrderTable(null)}
          onSuccess={() => setNewOrderTable(null)}
        />
      )}

      {orderPanelState && (
        <OrderPanelModal
          table={orderPanelState.table}
          order={orderPanelState.order}
          onClose={() => setOrderPanelState(null)}
          onSuccess={() => setOrderPanelState(null)}
        />
      )}

      {tableModalState.show && (
        <TableFormModal
          editTarget={tableModalState.editTarget}
          nextNumber={tables.length + 1}
          onClose={() => setTableModalState({ show: false, editTarget: null })}
          onSave={saveTable}
        />
      )}

      {histTable && <HistoryDrawer table={histTable} onClose={() => setHistTable(null)} />}
    </div>
  )
}
