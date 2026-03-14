/**
 * Clinic Plugin – Manifest
 */

export const clinicManifest = {
  id: 'clinic' as const,
  name: 'Clinic',
  nameAr: 'العيادة',
  description: 'Patient management, medical session records, prescription history and clinical statistics.',
  icon: '🏥',
  color: 'teal',
  status: 'active' as const,
  routePrefix: '/clinic',
  ipcPrefix: 'clinic',
  models: ['ClinicPatient', 'ClinicSession', 'ClinicPrescription'],
  defaultEnabled: true
}
