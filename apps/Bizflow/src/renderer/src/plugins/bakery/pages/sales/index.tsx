import React from 'react'
import { ShoppingBag, Calendar } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useBakerySales } from './hooks/useBakerySales'
import { SalesKpiStrip } from './components/SalesKpiStrip'
import { TopRevenueBreakdown } from './components/TopRevenueBreakdown'
import { SalesProductGrid } from './components/SalesProductGrid'
import { SellConfirmModal } from './components/SellConfirmModal'
import { CustomSaleModal } from './components/CustomSaleModal'
import { SalesHistoryTable } from './components/SalesHistoryTable'
import { DeleteSaleConfirmModal } from './components/DeleteSaleConfirmModal'

export default function SalesTab() {
  const { t } = useLanguage()
  const {
    recipes,
    pagedSales,
    summary,
    loading,
    recipeGroups,
    filteredGroups,
    activeSubTab,
    setActiveSubTab,
    posFilter,
    setPosFilter,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    pageSize,
    setPageSize,
    filterRecipe,
    setFilterRecipe,
    filterStart,
    setFilterStart,
    filterEnd,
    setFilterEnd,
    showHistoryFilters,
    setShowHistoryFilters,
    clearHistoryFilters,
    selectedGroup,
    setSelectedGroup,
    showCustomModal,
    setShowCustomModal,
    deletingSaleId,
    setDeletingSaleId,
    handleRecordBatchSale,
    handleRecordCustomSale,
    handleSaveRecipePrice,
    handleDeleteSale,
  } = useBakerySales()

  const subTabs = [
    {
      key: 'sell' as const,
      label: t('bakerySaleTabSell') || 'POS Sell',
      icon: <ShoppingBag className="h-4 w-4" />,
    },
    {
      key: 'history' as const,
      label: t('bakerySaleTabHistory') || 'Sales History',
      icon: <Calendar className="h-4 w-4" />,
    },
  ]

  return (
    <div className="space-y-6 pb-6">
      {/* 1. Global KPI Financial Cards */}
      <SalesKpiStrip summary={summary} />

      {/* 2. Top-level POS vs History Navigation Switcher */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 w-fit">
        {subTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === tab.key
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 3. POS Selling Mode */}
      {activeSubTab === 'sell' && (
        <SalesProductGrid
          groups={filteredGroups}
          allGroups={recipeGroups}
          totalGroupsCount={recipeGroups.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          posFilter={posFilter}
          onPosFilterChange={setPosFilter}
          onSelectGroup={setSelectedGroup}
          onOpenCustomSale={() => setShowCustomModal(true)}
          onSavePrice={handleSaveRecipePrice}
        />
      )}

      {/* 4. Sales History Mode */}
      {activeSubTab === 'history' && (
        <div className="space-y-6">
          <TopRevenueBreakdown summary={summary} />
          <SalesHistoryTable
            paged={pagedSales}
            recipes={recipes}
            loading={loading}
            filterRecipe={filterRecipe}
            onFilterRecipeChange={setFilterRecipe}
            filterStart={filterStart}
            onFilterStartChange={setFilterStart}
            filterEnd={filterEnd}
            onFilterEndChange={setFilterEnd}
            showFilters={showHistoryFilters}
            onToggleFilters={() => setShowHistoryFilters(f => !f)}
            onClearFilters={clearHistoryFilters}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={ps => {
              setPageSize(ps)
              setPage(1)
            }}
            onDeleteClick={id => setDeletingSaleId(id)}
          />
        </div>
      )}

      {/* 5. Sell Confirmation Modal */}
      {selectedGroup && (
        <SellConfirmModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          onSell={handleRecordBatchSale}
        />
      )}

      {/* 6. Custom Sale Modal */}
      <CustomSaleModal
        isOpen={showCustomModal}
        recipes={recipes}
        onClose={() => setShowCustomModal(false)}
        onSave={handleRecordCustomSale}
      />

      {/* 7. Delete Sale Confirmation Dialog */}
      <DeleteSaleConfirmModal
        isOpen={Boolean(deletingSaleId)}
        onClose={() => setDeletingSaleId(null)}
        onConfirm={() => deletingSaleId && handleDeleteSale(deletingSaleId)}
      />
    </div>
  )
}