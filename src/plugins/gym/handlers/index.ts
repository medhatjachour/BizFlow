import { registerGymCoachHandlers } from './coaches'
import { registerGymTraineeHandlers } from './trainees'
import { registerGymPlanHandlers } from './plans'
import { registerGymSubscriptionHandlers } from './subscriptions'
import { registerGymSessionHandlers } from './sessions'
import { registerGymExpenseHandlers } from './expenses'
import { registerGymStatsHandlers } from './stats'
import { registerGymAlertHandlers } from './alerts'
import { registerGymMeasurementHandlers } from './measurements'
import { registerGymGoalHandlers } from './goals'
import { registerGymShiftHandlers } from './shifts'
import { registerGymLockerHandlers } from './lockers'
import { registerGymProgramHandlers } from './programs'

export function registerGymHandlers(prisma: any) {
  registerGymCoachHandlers(prisma)
  registerGymTraineeHandlers(prisma)
  registerGymPlanHandlers(prisma)
  registerGymSubscriptionHandlers(prisma)
  registerGymSessionHandlers(prisma)
  registerGymExpenseHandlers(prisma)
  registerGymStatsHandlers(prisma)
  registerGymAlertHandlers(prisma)
  registerGymMeasurementHandlers(prisma)
  registerGymGoalHandlers(prisma)
  registerGymShiftHandlers(prisma)
  registerGymLockerHandlers(prisma)
  registerGymProgramHandlers(prisma)
}

