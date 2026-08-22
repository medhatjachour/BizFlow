import {
  Dumbbell,
  Flame,
  Droplets,
  Waves,
  Star,
  Thermometer,
  Lock,
  Shirt,
  Apple,
  BarChart2,
  ClipboardList,
  Users
} from 'lucide-react'
import { PlanCategoryKey, PlanColorKey, AmenityKey } from './types'

export const CATEGORIES: {
  value: PlanCategoryKey
  label: string
  icon: any
  desc: string
}[] = [
  { value: 'general', label: 'General Fitness', icon: Dumbbell, desc: 'All-around gym & workout access' },
  { value: 'weight-loss', label: 'Weight Loss', icon: Flame, desc: 'Cardio & fat-burning focus' },
  { value: 'muscle-gain', label: 'Muscle Gain', icon: Dumbbell, desc: 'Hypertrophy & progressive strength' },
  { value: 'athletic', label: 'Athletic Training', icon: Droplets, desc: 'Sport performance, agility & speed' },
  { value: 'wellness', label: 'Wellness & Spa', icon: Waves, desc: 'Recovery, jacuzzi, sauna & massage' },
  { value: 'vip', label: 'VIP / Premium', icon: Star, desc: 'All-inclusive VIP privileges & priority' }
]

export const COLORS: {
  value: PlanColorKey
  label: string
  from: string
  to: string
  text: string
  badge: string
  border: string
  btn: string
}[] = [
  {
    value: 'orange',
    label: 'Orange Accent',
    from: 'from-orange-500/10',
    to: 'to-amber-500/5',
    text: 'text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-500',
    border: 'border-orange-500/20',
    btn: 'bg-orange-500 hover:bg-orange-600'
  },
  {
    value: 'blue',
    label: 'Blue Ocean',
    from: 'from-blue-500/10',
    to: 'to-sky-500/5',
    text: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-500',
    border: 'border-blue-500/20',
    btn: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    value: 'purple',
    label: 'Purple Royal',
    from: 'from-purple-500/10',
    to: 'to-violet-500/5',
    text: 'text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-500',
    border: 'border-purple-500/20',
    btn: 'bg-purple-500 hover:bg-purple-600'
  },
  {
    value: 'emerald',
    label: 'Emerald Fresh',
    from: 'from-emerald-500/10',
    to: 'to-teal-500/5',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500',
    border: 'border-emerald-500/20',
    btn: 'bg-emerald-500 hover:bg-emerald-600'
  },
  {
    value: 'teal',
    label: 'Teal Modern',
    from: 'from-teal-500/10',
    to: 'to-cyan-500/5',
    text: 'text-teal-600 dark:text-teal-400',
    badge: 'bg-teal-500',
    border: 'border-teal-500/20',
    btn: 'bg-teal-500 hover:bg-teal-600'
  },
  {
    value: 'rose',
    label: 'Rose Punch',
    from: 'from-rose-500/10',
    to: 'to-pink-500/5',
    text: 'text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-500',
    border: 'border-rose-500/20',
    btn: 'bg-rose-500 hover:bg-rose-600'
  }
]

export const AMENITIES: {
  key: AmenityKey
  label: string
  icon: any
  color: string
}[] = [
  { key: 'hasSauna', label: 'Sauna Access', icon: Thermometer, color: 'text-orange-500' },
  { key: 'hasJacuzzi', label: 'Hot Jacuzzi', icon: Waves, color: 'text-blue-500' },
  { key: 'hasPool', label: 'Swimming Pool', icon: Droplets, color: 'text-cyan-500' },
  { key: 'hasLocker', label: 'Dedicated Locker', icon: Lock, color: 'text-slate-500' },
  { key: 'hasTowel', label: 'Towel Service', icon: Shirt, color: 'text-slate-400' },
  { key: 'hasNutritionPlan', label: 'Nutrition & Diet Plan', icon: Apple, color: 'text-emerald-500' },
  { key: 'hasBodyAnalysis', label: 'InBody / Composition Analysis', icon: BarChart2, color: 'text-violet-500' },
  { key: 'hasFitnessTest', label: 'Fitness & Mobility Assessment', icon: ClipboardList, color: 'text-amber-500' },
  { key: 'hasGroupClass', label: 'Unlimited Group Classes', icon: Users, color: 'text-indigo-500' }
]

export const DURATION_PRESETS = [
  { label: '1 Week', days: 7 },
  { label: '2 Weeks', days: 14 },
  { label: '1 Month', days: 30 },
  { label: '3 Months', days: 90 },
  { label: '6 Months', days: 180 },
  { label: '1 Year', days: 365 }
]