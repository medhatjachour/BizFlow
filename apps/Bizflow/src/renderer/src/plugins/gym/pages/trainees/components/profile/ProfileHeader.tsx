import { Pencil, X, QrCode } from 'lucide-react'
import { Trainee } from '../../types'
import { getTraineeSubBadge } from '../../utils'

interface ProfileHeaderProps {
  trainee: Trainee
  onEdit: () => void
  onShowQr: () => void
  onClose: () => void
}

export function ProfileHeader({ trainee, onEdit, onShowQr, onClose }: ProfileHeaderProps) {
  const badge = getTraineeSubBadge(trainee)

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
      <div className="flex items-center gap-3.5">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black shadow-xs ${badge.avatarCls}`}
        >
          {trainee.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
              {trainee.name}
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.badgeCls}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {trainee.phone || trainee.email || 'No primary contact info'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onShowQr}
          className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-xl transition-colors"
          title="QR Card"
        >
          <QrCode size={16} />
        </button>
        <button
          onClick={onEdit}
          className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-xl transition-colors"
          title="Edit Profile"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}