import { Check, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

export interface StepperStep {
  id: string
  label: ReactNode
  done?: boolean
  /** The step being worked on; renders as the accent state. */
  current?: boolean
  /** Payment-gated steps read as locked until the milestone clears. */
  locked?: boolean
}

interface StepperProps {
  steps: StepperStep[]
  className?: string
  /** Wraps instead of scrolling when the stage names are long. */
  compact?: boolean
}

/**
 * The stage-gated pipeline: where a project sits between brief and handover.
 * Rendered as progress rather than a status word, because the value of the
 * gate is seeing what is still locked ahead of you.
 */
export default function Stepper({ steps, className = '', compact = false }: StepperProps) {
  return (
    <ol
      className={`flex items-center gap-1.5 ${compact ? 'flex-wrap' : 'overflow-x-auto no-scrollbar'} ${className}`}
    >
      {steps.map((step, index) => {
        const state = step.current
          ? 'current'
          : step.done
            ? 'done'
            : step.locked
              ? 'locked'
              : 'todo'
        return (
          <li key={step.id} className="flex shrink-0 items-center gap-1.5">
            <span
              className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${
                state === 'current'
                  ? 'border-[color:var(--accent-line)] bg-[color:var(--accent-tint)] text-[color:var(--accent-text)]'
                  : state === 'done'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-500'
              }`}
            >
              {state === 'done' ? (
                <Check className="h-3 w-3 shrink-0" />
              ) : (
                <span className="tabular-nums">{index + 1}</span>
              )}
              <span className="whitespace-nowrap">{step.label}</span>
            </span>
            {index < steps.length - 1 && (
              <ChevronRight className="h-3 w-3 shrink-0 text-slate-300 dark:text-slate-600" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
