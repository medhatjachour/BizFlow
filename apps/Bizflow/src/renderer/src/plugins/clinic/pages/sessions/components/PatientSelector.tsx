import { useState, useEffect, useRef } from 'react'
import { Search, UserCircle, Loader2 } from 'lucide-react'

interface Props {
  isLocked: boolean
  patientName: string
  patientPhone?: string
  patientBlood?: string | null
  onSelectPatient: (patient: { id: string; name: string; phone: string; bloodType?: string | null }) => void
}

export default function PatientSelector({ isLocked, patientName, patientPhone, patientBlood, onSelectPatient }: Props) {
  const [searchQuery, setSearchQuery] = useState(patientName)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!searchQuery.trim() || isLocked) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await window.api.clinic.patients.searchLite(searchQuery)
        setSearchResults(results ?? [])
        setShowDropdown((results ?? []).length > 0)
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 280)
    return () => clearTimeout(timer)
  }, [searchQuery, isLocked])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (isLocked) {
    return (
      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCircle className="h-6 w-6 text-teal-600" />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{patientName}</p>
            <p className="text-xs text-slate-400">{patientPhone}</p>
          </div>
        </div>
        {patientBlood && (
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {patientBlood}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="relative" ref={searchRef}>
      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
        Patient *
      </label>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search patient by name, folder number, or phone..."
        />
        {isSearching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-teal-600" />}

        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1.5">
            {searchResults.map(p => (
              <button
                key={p.id}
                type="button"
                onMouseDown={() => {
                  onSelectPatient(p)
                  setSearchQuery(p.name)
                  setShowDropdown(false)
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-xl flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <UserCircle className="h-5 w-5 text-teal-600" />
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.phone}</p>
                  </div>
                </div>
                {p.bloodType && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                    {p.bloodType}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}