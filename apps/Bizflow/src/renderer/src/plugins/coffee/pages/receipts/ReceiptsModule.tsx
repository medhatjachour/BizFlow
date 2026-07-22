import React, { useState, useEffect } from 'react'
import { ArrowDownToLine, Truck } from 'lucide-react'
import { IncomingView } from './components/incoming/IncomingView'
import { TransitView } from './components/transit/TransitView'

import { Product, Category } from './types' // Import types
export default function ReceiptsModule() {
  const [activeTab, setActiveTab] = useState<'incoming' | 'transit'>('incoming')
  const [products, setProducts] = useState<Product[]>([]) // Explicitly type as Product[]
  const [categories, setCategories] = useState<Category[]>([]) // Explicitly type as Category[]


  useEffect(() => {
    // Fetch metadata required for Incoming Forms
    const loadMeta = async () => {
      try {
        const [prods, cats] = await Promise.all([
          window.api.coffee.products.getAll(),
          window.api.coffee.categories.getAll()
        ])
        setProducts(prods ?? [])
        setCategories(cats ?? [])
      } catch (err) {
        console.error('Failed to load metadata', err)
      }
    }
    loadMeta()
  }, [])

  return (
    <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'incoming'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <ArrowDownToLine size={16} /> Incoming
        </button>
        <button
          onClick={() => setActiveTab('transit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'transit'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Truck size={16} /> Transit
        </button>
      </div>

      {activeTab === 'incoming' && <IncomingView products={products} categories={categories} />}
      {activeTab === 'transit' && <TransitView />}
    </div>
  )
}
