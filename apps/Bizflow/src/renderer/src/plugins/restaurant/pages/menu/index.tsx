import { useState } from 'react'
import { AlertCircle, BookOpen, RefreshCw } from 'lucide-react'
import { useMenuManagement } from './hooks/useMenuManagement'
import { MenuToolbar } from './components/MenuToolbar'
import { MenuItemRow } from './components/MenuItemRow'
import { MenuItemFormModal } from './components/MenuItemFormModal'
import { MenuItemData } from './types'

export default function MenuEngineeringPage() {
  const {
    groupedByCategory,
    categories,
    loading,
    error,
    stats,
    selectedCategory,
    setSelectedCategory,
    selectedStation,
    setSelectedStation,
    searchQuery,
    setSearchQuery,
    showOutOfStockOnly,
    setShowOutOfStockOnly,
    refreshMenu,
    toggleItem86,
    saveItem,
    deleteItem
  } = useMenuManagement()

  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null)

  const handleOpenAdd = () => {
    setEditingItem(null)
    setShowModal(true)
  }

  const handleOpenEdit = (item: MenuItemData) => {
    setEditingItem(item)
    setShowModal(true)
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Top Menu Toolbar & Telemetry */}
      <MenuToolbar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedStation={selectedStation}
        onSelectStation={setSelectedStation}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showOutOfStockOnly={showOutOfStockOnly}
        onToggleOutOfStockOnly={() => setShowOutOfStockOnly(!showOutOfStockOnly)}
        stats={stats}
        onOpenAddModal={handleOpenAdd}
        onRefresh={refreshMenu}
        loading={loading}
      />

      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Menu Catalog Grouped by Category */}
      {loading && Object.keys(groupedByCategory).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <RefreshCw className="animate-spin text-amber-500 w-8 h-8" />
          <p className="text-xs font-bold text-slate-400">Loading menu catalog...</p>
        </div>
      ) : Object.keys(groupedByCategory).length === 0 ? (
        <div className="py-20 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/20 space-y-2">
          <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Menu Dishes Found</h3>
          <p className="text-xs text-slate-400">Click "+ New Dish" to add your first menu item.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByCategory).map(([cat, catItems]) => (
            <div key={cat} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {cat} ({catItems.length})
                </h3>
              </div>
              <div className="space-y-2">
                {catItems.map((item) => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    onToggle86={toggleItem86}
                    onEdit={handleOpenEdit}
                    onDelete={deleteItem}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      <MenuItemFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        editingItem={editingItem}
        existingCategories={categories}
        onSave={saveItem}
      />
    </div>
  )
}