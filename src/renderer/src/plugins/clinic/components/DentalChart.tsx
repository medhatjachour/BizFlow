/**
 * DentalChart - Interactive Odontogram
 *
 * Features:
 * - FDI/ISO 3950 anatomical tooth SVG shapes (incisor, canine, premolar, molar)
 * - Draggable popover - always stays inside viewport, grab the header to move it
 * - Gingiva and Tongue are clickable diagnostic areas
 * - Deciduous (milk teeth) toggle
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GripVertical, Info, X } from 'lucide-react'

// --- Types ---

export interface ToothData {
  conditions: string[]
  note: string
}
export type ConditionDef = { id: string; label: string; color: string; bg: string }
/** keyed by FDI number string OR "gingiva" | "tongue" */
export type DentalChartData = Record<string, ToothData>

// --- Tooth shape catalogue ---

type ToothShape = 'incisor' | 'canine' | 'premolar' | 'molar'

function toothShape(fdi: number): ToothShape {
  const n = fdi % 10
  if (n === 3) return 'canine'
  if (n === 4 || n === 5) return 'premolar'
  if (n === 6 || n === 7 || n === 8) return 'molar'
  return 'incisor'
}

/**
 * SVG paths. ViewBox 0 0 28 44.
 * Upper teeth: root points downward (natural orientation).
 * Lower teeth: SVG is y-flipped via transform so root points upward.
 */
const TOOTH_PATHS: Record<ToothShape, string> = {
  incisor:
    'M4,2 C4,1 5,0 14,0 C23,0 24,1 24,2 L24,22 C24,24 22,26 20,26 ' +
    'L17,26 C16,26 15.5,27 15,30 L14.5,42 C14.4,43.5 13.6,43.5 13.5,42 ' +
    'L13,30 C12.5,27 12,26 11,26 L8,26 C6,26 4,24 4,22 Z',

  canine:
    'M4,2 C4,1 6,0 14,0 C22,0 24,1 24,2 L24,18 ' +
    'C24,22 22,25 20,26 L16,26 C15,26 14.5,27 14,33 ' +
    'L13.8,43 C13.75,44 13.25,44 13.2,43 L13,33 ' +
    'C12.5,27 12,26 11,26 L9,26 C7,26 4,22 4,18 Z',

  premolar:
    'M3,2 C3,1 5,0 14,0 C23,0 25,1 25,2 L25,20 ' +
    'C25,24 22,26 20,26 L17.5,26 C17,26 16.8,27 16.5,30 ' +
    'L16,42 C15.9,43.5 15.1,43.8 15,43 L14.5,36 ' +
    'L13.5,36 L13,43 C12.9,43.8 12.1,43.5 12,42 ' +
    'L11.5,30 C11.2,27 11,26 10.5,26 L8,26 C6,26 3,24 3,20 Z',

  molar:
    'M2,3 C2,1 5,0 14,0 C23,0 26,1 26,3 L26,22 ' +
    'C26,25 23,27 20,27 L19,27 C18.5,27 18,28 18,30 ' +
    'L17.5,42 C17.4,43.5 16.6,43.8 16.5,43 L16,36 ' +
    'L14,36 L13.5,43 C13.4,43.8 12.6,43.5 12.5,42 ' +
    'L12,30 C12,28 11.5,27 11,27 L10,27 C7,27 2,25 2,22 Z',
}

// --- FDI name map ---

const TOOTH_FULL_NAMES: Record<number, string> = {
  11: 'UR Central Incisor',  12: 'UR Lateral Incisor',  13: 'UR Canine',
  14: 'UR 1st Premolar',     15: 'UR 2nd Premolar',     16: 'UR 1st Molar',
  17: 'UR 2nd Molar',        18: 'UR Wisdom Tooth',
  21: 'UL Central Incisor',  22: 'UL Lateral Incisor',  23: 'UL Canine',
  24: 'UL 1st Premolar',     25: 'UL 2nd Premolar',     26: 'UL 1st Molar',
  27: 'UL 2nd Molar',        28: 'UL Wisdom Tooth',
  31: 'LL Central Incisor',  32: 'LL Lateral Incisor',  33: 'LL Canine',
  34: 'LL 1st Premolar',     35: 'LL 2nd Premolar',     36: 'LL 1st Molar',
  37: 'LL 2nd Molar',        38: 'LL Wisdom Tooth',
  41: 'LR Central Incisor',  42: 'LR Lateral Incisor',  43: 'LR Canine',
  44: 'LR 1st Premolar',     45: 'LR 2nd Premolar',     46: 'LR 1st Molar',
  47: 'LR 2nd Molar',        48: 'LR Wisdom Tooth',
  51: 'UR d-Central', 52: 'UR d-Lateral', 53: 'UR d-Canine', 54: 'UR d-1st Molar', 55: 'UR d-2nd Molar',
  61: 'UL d-Central', 62: 'UL d-Lateral', 63: 'UL d-Canine', 64: 'UL d-1st Molar', 65: 'UL d-2nd Molar',
  71: 'LL d-Central', 72: 'LL d-Lateral', 73: 'LL d-Canine', 74: 'LL d-1st Molar', 75: 'LL d-2nd Molar',
  81: 'LR d-Central', 82: 'LR d-Lateral', 83: 'LR d-Canine', 84: 'LR d-1st Molar', 85: 'LR d-2nd Molar',
}

// --- Condition lists ---

const CONDITIONS: ConditionDef[] = [
  { id: 'healthy',    label: 'Healthy',         color: '#16a34a', bg: '#dcfce7' },
  { id: 'caries',     label: 'Caries',          color: '#92400e', bg: '#fef3c7' },
  { id: 'filling',    label: 'Filling',         color: '#2563eb', bg: '#dbeafe' },
  { id: 'crown',      label: 'Crown',           color: '#d97706', bg: '#fef9c3' },
  { id: 'root_canal', label: 'Root Canal',      color: '#7c3aed', bg: '#ede9fe' },
  { id: 'missing',    label: 'Missing',         color: '#9ca3af', bg: '#f3f4f6' },
  { id: 'extraction', label: 'Extraction Plan', color: '#dc2626', bg: '#fee2e2' },
  { id: 'implant',    label: 'Implant',         color: '#0891b2', bg: '#cffafe' },
  { id: 'bridge',     label: 'Bridge',          color: '#ea580c', bg: '#ffedd5' },
  { id: 'fracture',   label: 'Fracture',        color: '#be123c', bg: '#ffe4e6' },
  { id: 'abscess',    label: 'Abscess',         color: '#991b1b', bg: '#fecaca' },
  { id: 'impacted',   label: 'Impacted',        color: '#ca8a04', bg: '#fef9c3' },
]

const GINGIVA_CONDITIONS: ConditionDef[] = [
  { id: 'healthy',       label: 'Healthy',       color: '#16a34a', bg: '#dcfce7' },
  { id: 'gingivitis',    label: 'Gingivitis',    color: '#f97316', bg: '#ffedd5' },
  { id: 'periodontitis', label: 'Periodontitis', color: '#dc2626', bg: '#fee2e2' },
  { id: 'recession',     label: 'Recession',     color: '#b45309', bg: '#fef3c7' },
  { id: 'bleeding',      label: 'Bleeding',      color: '#be123c', bg: '#ffe4e6' },
  { id: 'swelling',      label: 'Swelling',      color: '#9333ea', bg: '#f3e8ff' },
  { id: 'plaque',        label: 'Plaque',        color: '#ca8a04', bg: '#fef9c3' },
  { id: 'abscess',       label: 'Abscess',       color: '#991b1b', bg: '#fecaca' },
]

const TONGUE_CONDITIONS: ConditionDef[] = [
  { id: 'healthy',     label: 'Healthy',     color: '#16a34a', bg: '#dcfce7' },
  { id: 'coated',      label: 'Coated',      color: '#ca8a04', bg: '#fef9c3' },
  { id: 'ulcer',       label: 'Ulcer',       color: '#dc2626', bg: '#fee2e2' },
  { id: 'geographic',  label: 'Geographic',  color: '#f97316', bg: '#ffedd5' },
  { id: 'candidiasis', label: 'Candidiasis', color: '#9333ea', bg: '#f3e8ff' },
  { id: 'swelling',    label: 'Swelling',    color: '#7c3aed', bg: '#ede9fe' },
  { id: 'fissured',    label: 'Fissured',    color: '#0891b2', bg: '#cffafe' },
]

function conditionDefsFor(key: string): { defs: ConditionDef[]; title: string; subtitle: string } {
  if (key === 'gingiva') return { defs: GINGIVA_CONDITIONS, title: 'Gingiva (Gum)', subtitle: 'Periodontal / gum tissue' }
  if (key === 'tongue')  return { defs: TONGUE_CONDITIONS,  title: 'Tongue',         subtitle: 'Tongue diagnosis' }
  const fdi = parseInt(key)
  return { defs: CONDITIONS, title: `Tooth ${fdi}`, subtitle: TOOTH_FULL_NAMES[fdi] ?? '' }
}

function findCondition(id: string): ConditionDef | undefined {
  return CONDITIONS.find(c => c.id === id)
    ?? GINGIVA_CONDITIONS.find(c => c.id === id)
    ?? TONGUE_CONDITIONS.find(c => c.id === id)
}

// --- SVG Tooth button ---

interface ToothSvgProps {
  fdi: number
  data?: ToothData
  isUpper: boolean
  readOnly: boolean
  onClick: (fdi: number, rect: DOMRect) => void
}

function ToothSvg({ fdi, data, isUpper, readOnly, onClick }: ToothSvgProps) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const shape  = toothShape(fdi)
  const path   = TOOTH_PATHS[shape]

  const hasData     = data && data.conditions.length > 0
  const isMissing   = data?.conditions.includes('missing')
  const primaryCond = hasData ? findCondition(data!.conditions[0]) : null

  // For lower teeth, flip the SVG vertically so roots point upward
  const svgTransform = isUpper ? undefined : 'scale(1,-1) translate(0,-44)'

  const fillColor   = isMissing ? '#e2e8f0' : (primaryCond?.bg  ?? '#f8fafc')
  const strokeColor = isMissing ? '#94a3b8' : (primaryCond?.color ?? '#cbd5e1')

  return (
    <button
      ref={btnRef}
      type="button"
      disabled={readOnly}
      onClick={() => btnRef.current && onClick(fdi, btnRef.current.getBoundingClientRect())}
      title={`${fdi} - ${TOOTH_FULL_NAMES[fdi] ?? ''}`}
      className={[
        'relative flex flex-col items-center gap-0 p-0 border-0 bg-transparent select-none',
        'transition-transform duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded',
        readOnly ? 'cursor-default' : 'hover:scale-110 hover:z-10 cursor-pointer',
      ].join(' ')}
    >
      {/* FDI number above crown for upper teeth */}
      {isUpper && (
        <span className="text-[8px] text-slate-400 dark:text-slate-500 leading-none mb-px font-mono tabular-nums">{fdi}</span>
      )}

      <svg viewBox="0 0 28 44" width={22} height={34} aria-hidden style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`gloss-${fdi}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="white" stopOpacity="0.85" />
            <stop offset="100%" stopColor="white" stopOpacity="0"    />
          </linearGradient>
          <clipPath id={`crown-clip-${fdi}`}>
            <rect x="0" y="0" width="28" height="26" />
          </clipPath>
        </defs>

        <g transform={svgTransform}>
          {/* soft shadow */}
          <path d={path} fill="rgba(0,0,0,0.07)" transform="translate(0.8,0.8)" />

          {/* main tooth body */}
          <path
            d={path}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={isMissing ? 1.5 : 1.8}
            strokeDasharray={isMissing ? '4 2' : undefined}
            strokeLinejoin="round"
          />

          {/* enamel gloss highlight (crown area only) */}
          {!isMissing && (
            <path
              d={path}
              fill={`url(#gloss-${fdi})`}
              clipPath={`url(#crown-clip-${fdi})`}
              opacity={0.4}
            />
          )}

          {/* missing X */}
          {isMissing && (
            <>
              <line x1="8"  y1="6"  x2="20" y2="22" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="20" y1="6"  x2="8"  y2="22" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
            </>
          )}

          {/* condition abbreviation badge on crown */}
          {primaryCond && !isMissing && (
            <text
              x="14"
              y={isUpper ? 16 : 28}
              textAnchor="middle"
              fontSize="7"
              fontWeight="bold"
              fill={primaryCond.color}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {data!.conditions.length > 1
                ? `+${data!.conditions.length}`
                : primaryCond.label.slice(0, 2).toUpperCase()}
            </text>
          )}
        </g>
      </svg>

      {/* note dot */}
      {data?.note && !isMissing && (
        <span className="absolute top-3 right-0 h-1.5 w-1.5 rounded-full bg-teal-500 ring-1 ring-white dark:ring-slate-800" />
      )}

      {/* FDI number below roots for lower teeth */}
      {!isUpper && (
        <span className="text-[8px] text-slate-400 dark:text-slate-500 leading-none mt-px font-mono tabular-nums">{fdi}</span>
      )}
    </button>
  )
}

// --- Draggable Popover ---

interface PopoverProps {
  itemKey: string
  title: string
  subtitle: string
  conditionDefs: ConditionDef[]
  data: ToothData
  initialX: number
  initialY: number
  onClose: () => void
  onChange: (data: ToothData) => void
  onClear: () => void
}

function DraggablePopover({
  itemKey: _k, title, subtitle, conditionDefs, data,
  initialX, initialY, onClose, onChange, onClear,
}: PopoverProps) {
  const W = 288

  const clampX = (x: number) => Math.max(8, Math.min(x, window.innerWidth  - W - 8))
  const clampY = (y: number) => Math.max(8, Math.min(y, window.innerHeight - 340))

  const [pos, setPos]         = useState({ x: clampX(initialX), y: clampY(initialY) })
  const [note, setNote]       = useState(data.note)
  const [conditions, setCond] = useState<string[]>(data.conditions)

  const dragging   = useRef(false)
  const dragOff    = useRef({ x: 0, y: 0 })
  const panelRef   = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h, true)
    return () => document.removeEventListener('mousedown', h, true)
  }, [onClose])

  // Drag: start
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    dragOff.current  = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.preventDefault()
  }, [pos])

  // Drag: move + end
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return
      setPos({
        x: clampX(e.clientX - dragOff.current.x),
        y: clampY(e.clientY - dragOff.current.y),
      })
    }
    function onUp() { dragging.current = false }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [])

  function toggle(id: string) {
    setCond(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  return (
    <div
      ref={panelRef}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999, width: W }}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      {/* Drag handle header */}
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-teal-50 dark:bg-teal-900/20 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="h-4 w-4 text-teal-400 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{title}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</div>
          </div>
        </div>
        <button
          type="button"
          onMouseDown={e => e.stopPropagation()}
          onClick={onClose}
          className="ml-2 flex-shrink-0 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Conditions + Note */}
      <div className="p-3 space-y-3 max-h-[52vh] overflow-y-auto">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Conditions</div>
        <div className="flex flex-wrap gap-1.5">
          {conditionDefs.map(c => (
            <button
              type="button"
              key={c.id}
              onClick={() => toggle(c.id)}
              className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                conditions.includes(c.id)
                  ? 'border-2'
                  : 'border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300'
              }`}
              style={conditions.includes(c.id)
                ? { backgroundColor: c.bg, borderColor: c.color, color: c.color }
                : undefined}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Note</div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Additional notes..."
            rows={2}
            className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-3 pb-3">
        <button
          type="button"
          onClick={onClear}
          className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => { onChange({ conditions, note }); onClose() }}
          className="flex-1 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  )
}

// --- Tooth row ---

function ToothRow({ teeth, data, isUpper, readOnly, onToothClick }: {
  teeth: number[]
  data: DentalChartData
  isUpper: boolean
  readOnly: boolean
  onToothClick: (fdi: number, rect: DOMRect) => void
}) {
  return (
    <div className="flex items-end gap-px">
      {teeth.map(fdi => (
        <ToothSvg
          key={fdi}
          fdi={fdi}
          data={data[String(fdi)]}
          isUpper={isUpper}
          readOnly={readOnly}
          onClick={onToothClick}
        />
      ))}
    </div>
  )
}

// --- Legend ---

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
      {CONDITIONS.map(c => (
        <span key={c.id} className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
          <span className="h-2.5 w-2.5 rounded-sm border" style={{ backgroundColor: c.bg, borderColor: c.color }} />
          {c.label}
        </span>
      ))}
    </div>
  )
}

// --- Main component ---

interface DentalChartProps {
  value: DentalChartData
  onChange?: (data: DentalChartData) => void
  readOnly?: boolean
}

export default function DentalChart({ value, onChange, readOnly = false }: DentalChartProps) {
  const [popover, setPopover] = useState<{ key: string; x: number; y: number } | null>(null)
  const [showDeciduous, setShowDeciduous] = useState(false)
  const deciduousInfoRef = useRef<HTMLSpanElement>(null)
  const [deciduousTipPos, setDeciduousTipPos] = useState<{ top: number; left: number } | null>(null)

  const upperAdult = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
  const lowerAdult = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
  const upperDecid = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65]
  const lowerDecid = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]

  function openFor(key: string, rect: DOMRect) {
    const x = Math.max(8, Math.min(rect.left, window.innerWidth  - 296))
    const y = Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 340))
    setPopover(prev => prev?.key === key ? null : { key, x, y })
  }

  function upsert(key: string, td: ToothData) {
    if (!onChange) return
    const next = { ...value }
    if (td.conditions.length === 0 && !td.note.trim()) delete next[key]
    else next[key] = td
    onChange(next)
  }

  function clear(key: string) {
    if (!onChange) return
    const next = { ...value }
    delete next[key]
    onChange(next)
    setPopover(null)
  }

  function showDeciduousInfo() {
    if (!deciduousInfoRef.current) return
    const r = deciduousInfoRef.current.getBoundingClientRect()
    setDeciduousTipPos({ top: r.top, left: r.left + (r.width / 2) })
  }

  const affected = Object.keys(value).length

  return (
    <div className="select-none">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Odontogram</span>
          {affected > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-semibold">
              {affected} area{affected !== 1 ? 's' : ''} noted
            </span>
          )}
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Deciduous</span>
          <span
            ref={deciduousInfoRef}
            className="inline-flex items-center"
            onMouseEnter={showDeciduousInfo}
            onMouseLeave={() => setDeciduousTipPos(null)}
          >
            <Info className="h-3 w-3 text-slate-400 hover:text-teal-500 cursor-default transition-colors" />
          </span>
          <div
            onClick={() => setShowDeciduous(v => !v)}
            className={`relative h-5 w-9 rounded-full transition-colors ${showDeciduous ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${showDeciduous ? 'translate-x-4' : ''}`} />
          </div>
        </label>
      </div>

      {deciduousTipPos && createPortal(
        <div
          style={{
            position: 'fixed',
            top: deciduousTipPos.top,
            left: deciduousTipPos.left,
            transform: 'translate(-50%, -100%) translateY(-8px)',
            zIndex: 99999,
          }}
          className="w-56 rounded-xl bg-slate-900 dark:bg-slate-800 text-[11px] text-white leading-relaxed px-3 py-2.5 shadow-2xl"
        >
          Deciduous (milk) teeth are the first set of 20 primary teeth that appear in childhood and are later replaced by permanent adult teeth.
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
        </div>,
        document.body
      )}

      {/* Chart board */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 overflow-x-auto">
        <div className="min-w-[540px]">

          <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 text-center">
            Maxilla (Upper)
          </div>

          {showDeciduous && (
            <div className="flex justify-center mb-1">
              <ToothRow teeth={upperDecid} data={value} isUpper readOnly={readOnly} onToothClick={(fdi, rect) => openFor(String(fdi), rect)} />
            </div>
          )}

          <div className="flex justify-center">
            <ToothRow teeth={upperAdult} data={value} isUpper readOnly={readOnly} onToothClick={(fdi, rect) => openFor(String(fdi), rect)} />
          </div>

          {/* Gingiva strip */}
          {(() => {
            const gd = value['gingiva']
            const gp = gd?.conditions[0] ? findCondition(gd.conditions[0]) : null
            return (
              <div className="relative flex items-center my-1.5 px-3">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={e => openFor('gingiva', e.currentTarget.getBoundingClientRect())}
                  title="Click to record gingival / gum diagnosis"
                  style={gp ? { backgroundColor: gp.bg, borderColor: gp.color } : undefined}
                  className={[
                    'flex-1 h-5 rounded-full border-2 flex items-center justify-center gap-1.5 transition-all',
                    gp ? 'border-2' : 'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700/40',
                    readOnly ? 'cursor-default' : 'hover:brightness-95 cursor-pointer',
                  ].join(' ')}
                >
                  <span
                    className="text-[8px] font-bold uppercase tracking-widest"
                    style={gp ? { color: gp.color } : { color: '#ec4899' }}
                  >
                    {gp
                      ? `Gingiva · ${gd!.conditions.map(id => findCondition(id)?.label ?? id).join(', ')}`
                      : 'Gingiva (Gum)'}
                  </span>
                  {gd?.note && <span className="h-1.5 w-1.5 rounded-full bg-teal-500 flex-shrink-0" />}
                </button>
                <span className="absolute left-1/2 -translate-x-px inset-y-0 w-px bg-slate-300/50 dark:bg-slate-600/50 pointer-events-none" />
              </div>
            )
          })()}

          <div className="flex justify-center">
            <ToothRow teeth={lowerAdult} data={value} isUpper={false} readOnly={readOnly} onToothClick={(fdi, rect) => openFor(String(fdi), rect)} />
          </div>

          {showDeciduous && (
            <div className="flex justify-center mt-1">
              <ToothRow teeth={lowerDecid} data={value} isUpper={false} readOnly={readOnly} onToothClick={(fdi, rect) => openFor(String(fdi), rect)} />
            </div>
          )}

          <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 text-center">
            Mandible (Lower)
          </div>

          {/* Tongue */}
          {(() => {
            const td = value['tongue']
            const tp = td?.conditions[0] ? findCondition(td.conditions[0]) : null
            return (
              <div className="flex justify-center mt-2">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={e => openFor('tongue', e.currentTarget.getBoundingClientRect())}
                  title="Click to record tongue diagnosis"
                  style={tp ? { backgroundColor: tp.bg, borderColor: tp.color } : undefined}
                  className={[
                    'px-10 py-1 rounded-full border-2 text-[9px] font-bold uppercase tracking-widest transition-all',
                    tp ? 'border-2' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30 text-red-400 dark:text-red-500',
                    readOnly ? 'cursor-default' : 'hover:brightness-95 cursor-pointer',
                  ].join(' ')}
                >
                  <span style={tp ? { color: tp.color } : undefined}>
                    {tp ? `Tongue · ${td!.conditions.map(id => findCondition(id)?.label ?? id).join(', ')}` : 'Tongue'}
                  </span>
                </button>
              </div>
            )
          })()}

          <div className="flex justify-between mt-3 px-2">
            <span className="text-[8px] text-slate-300 dark:text-slate-600 font-mono">Q1 (UR) · Q4 (LR)</span>
            <span className="text-[8px] text-slate-300 dark:text-slate-600 font-mono">Q2 (UL) · Q3 (LL)</span>
          </div>
        </div>
      </div>

      {!readOnly && <Legend />}

      {/* Summary chips */}
      {affected > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.entries(value).map(([key, tooth]) => {
            const primary = findCondition(tooth.conditions[0])
            const label   = key === 'gingiva' ? 'Gingiva' : key === 'tongue' ? 'Tongue' : key
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] border"
                style={primary ? { backgroundColor: primary.bg, borderColor: primary.color, color: primary.color } : undefined}
              >
                <strong>{label}</strong>
                <span className="opacity-80">
                  {tooth.conditions.map(c => findCondition(c)?.label ?? c).join(', ')}
                  {tooth.note ? ` · ${tooth.note.slice(0, 28)}` : ''}
                </span>
                {!readOnly && onChange && (
                  <button type="button" onClick={() => clear(key)} className="ml-0.5 opacity-60 hover:opacity-100">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            )
          })}
        </div>
      )}

      {/* Draggable popover */}
      {popover && !readOnly && (() => {
        const info = conditionDefsFor(popover.key)
        return (
          <DraggablePopover
            itemKey={popover.key}
            title={info.title}
            subtitle={info.subtitle}
            conditionDefs={info.defs}
            data={value[popover.key] ?? { conditions: [], note: '' }}
            initialX={popover.x}
            initialY={popover.y}
            onClose={() => setPopover(null)}
            onChange={d => { upsert(popover.key, d); setPopover(null) }}
            onClear={() => clear(popover.key)}
          />
        )
      })()}
    </div>
  )
}