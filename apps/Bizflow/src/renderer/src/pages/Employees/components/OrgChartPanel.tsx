import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { GitBranch, Users } from 'lucide-react'
import type { Employee } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'
import { buildOrgForest, getInitials, avatarColor, type OrgNode } from '../utils'

interface Props {
  employees: Employee[]
}

function TreeNode({ node, depth }: { node: OrgNode; depth: number }) {
  const navigate = useNavigate()
  const hasChildren = node.children.length > 0

  return (
    <div>
      <div
        className={`relative flex items-center gap-2.5 rounded-lg border bg-slate-50/60 dark:bg-slate-700/30 ${
          node.status === 'terminated' ? 'border-red-200 dark:border-red-900/50 opacity-60' : 'border-slate-200 dark:border-slate-700'
        } px-3 py-2 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer`}
        style={{ marginLeft: depth * 22 }}
        onClick={() => navigate(`/employees/${node.id}`)}
      >
        <span className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColor(node.name)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
          {getInitials(node.name)}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{node.name}</div>
          <div className="text-[11px] text-slate-400 truncate">{node.role || '—'}</div>
        </div>
        {hasChildren && (
          <span className="ml-auto text-[10px] text-slate-400 tabular-nums shrink-0">{node.children.length}</span>
        )}
      </div>
      {node.children.map(child => <TreeNode key={child.id} node={child} depth={depth + 1} />)}
    </div>
  )
}

/**
 * OrgChartPanel — interactive hierarchy built from the manager self-relation.
 * Click any node to open that employee's profile.
 */
export default function OrgChartPanel({ employees }: Props) {
  const { t } = useLanguage()
  const forest = useMemo(() => buildOrgForest(employees), [employees])

  const totalNodes = useMemo(() => {
    const count = (nodes: OrgNode[]): number => nodes.reduce((s, n) => s + 1 + count(n.children), 0)
    return count(forest)
  }, [forest])

  if (forest.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 text-center">
        <GitBranch size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('empNoOrgData') ?? 'No employees yet to build an org chart'}</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center gap-2 px-5 pt-5">
        <GitBranch size={15} className="text-primary" />
        <h3 className="font-semibold text-slate-900 dark:text-white">{t('empOrgChart') ?? 'Org chart'}</h3>
        <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
          <Users size={12} /> {totalNodes}
        </span>
      </div>
      <div className="p-5 space-y-1.5 max-h-[360px] overflow-y-auto">
        {forest.map(root => <TreeNode key={root.id} node={root} depth={0} />)}
      </div>
    </div>
  )
}
