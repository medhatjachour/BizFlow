/**
 * Packaging units are stored in their English form (they are persisted data),
 * so the stored value stays stable while the UI renders the localised label.
 */
export const UNIT_LABEL_KEYS: Record<string, string> = {
  box: 'phUnitBox',
  bottle: 'phUnitBottle',
  strip: 'phUnitStrip',
  pack: 'phUnitPack',
  tablet: 'phUnitTablet',
  capsule: 'phUnitCapsule',
  vial: 'phUnitVial',
  ampoule: 'phUnitAmpoule',
  sachet: 'phUnitSachet',
  tube: 'phUnitTube',
  piece: 'phUnitPiece',
  unit: 'phUnitUnit',
  ml: 'phUnitMl',
  g: 'phUnitG',
  mg: 'phUnitMg',
  kg: 'phUnitKg',
  L: 'phUnitL',
  drop: 'phUnitDrop',
  dose: 'phUnitDose',
}

/** Dictionary key for a stored unit value; unknown values fall back to raw. */
export function unitLabelKey(unit?: string | null): string {
  if (!unit) return ''
  return UNIT_LABEL_KEYS[unit] ?? UNIT_LABEL_KEYS[unit.toLowerCase()] ?? unit
}
