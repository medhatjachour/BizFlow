export const gymManifest = {
  id: 'gym' as const,
  name: 'Gym',
  nameAr: 'الجيم',
  description: 'Gym management — coaches, trainees, subscription plans, walk-in sessions and financial tracking.',
  icon: '🏋️',
  color: 'orange',
  status: 'active' as const,
  routePrefix: '/gym',
  ipcPrefix: 'gym',
  models: ['GymCoach','GymTrainee','GymPlan','GymSubscription','GymFreeze','GymWalkSession','GymExpense','GymMeasurement','GymGoal','GymLocker','GymLockerAssignment','GymProgram','GymProgramDay','GymProgramExercise','GymProgramAssignment','GymShift'],
  defaultEnabled: true
}
