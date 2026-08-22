import { Flame, Dumbbell, Activity, Sparkles, Zap } from 'lucide-react'
import { ProgramGoal } from './types'

export const GOAL_OPTIONS: {
  value: ProgramGoal
  labelKey: string
  fallbackLabel: string
  icon: any
}[] = [
  { value: 'weight loss', labelKey: 'gymGoalWeightLoss', fallbackLabel: 'Weight Loss', icon: Flame },
  { value: 'muscle gain', labelKey: 'gymGoalMuscleGain', fallbackLabel: 'Muscle & Hypertrophy', icon: Dumbbell },
  { value: 'endurance', labelKey: 'gymGoalEndurance', fallbackLabel: 'Endurance & Stamina', icon: Activity },
  { value: 'flexibility', labelKey: 'gymGoalFlexibility', fallbackLabel: 'Mobility & Flexibility', icon: Sparkles },
  { value: 'general fitness', labelKey: 'gymGoalGeneralFitness', fallbackLabel: 'General Conditioning', icon: Zap }
]

export const GOAL_STYLES: Record<
  string,
  { label: string; badgeCls: string; borderCls: string; iconCls: string }
> = {
  'weight loss': {
    label: 'Weight Loss',
    badgeCls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    borderCls: 'hover:border-rose-300 dark:hover:border-rose-800',
    iconCls: 'text-rose-500'
  },
  'muscle gain': {
    label: 'Muscle Gain',
    badgeCls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    borderCls: 'hover:border-blue-300 dark:hover:border-blue-800',
    iconCls: 'text-blue-500'
  },
  endurance: {
    label: 'Endurance',
    badgeCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    borderCls: 'hover:border-emerald-300 dark:hover:border-emerald-800',
    iconCls: 'text-emerald-500'
  },
  flexibility: {
    label: 'Mobility',
    badgeCls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
    borderCls: 'hover:border-purple-300 dark:hover:border-purple-800',
    iconCls: 'text-purple-500'
  },
  'general fitness': {
    label: 'General Fitness',
    badgeCls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20',
    borderCls: 'hover:border-orange-300 dark:hover:border-orange-800',
    iconCls: 'text-orange-500'
  }
}