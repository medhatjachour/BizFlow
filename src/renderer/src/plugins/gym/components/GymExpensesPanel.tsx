/**
 * GymExpensesPanel
 * Shown in the kernel Expenses page when the Gym plugin is active.
 * Re-uses the GymExpensesTab content directly.
 */
import GymExpensesTab from '../pages/components/GymExpensesTab'

export default function GymExpensesPanel() {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🏋️</span>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Gym Expenses</h2>
      </div>
      <GymExpensesTab />
    </div>
  )
}
