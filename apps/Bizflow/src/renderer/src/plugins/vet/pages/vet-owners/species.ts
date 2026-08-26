/**
 * Shared species catalogue for the vet plugin.
 *
 * `species` is a free-text String in the schema (no migration needed), so this
 * list is purely a UI convenience: known options get a nice emoji + label, and
 * anything else (custom-entered) is title-cased and shown with a generic paw.
 */
export interface SpeciesOption {
  value: string
  labelEn: string
  labelAr: string
  emoji: string
}

export const SPECIES_OPTIONS: SpeciesOption[] = [
  { value: 'dog',     labelEn: 'Dog',     labelAr: 'كلب',          emoji: '🐕' },
  { value: 'cat',     labelEn: 'Cat',     labelAr: 'قط',           emoji: '🐈' },
  { value: 'cow',     labelEn: 'Cow',     labelAr: 'بقر / مواشي',  emoji: '🐄' },
  { value: 'buffalo', labelEn: 'Buffalo', labelAr: 'جاموس',        emoji: '🐃' },
  { value: 'horse',   labelEn: 'Horse',   labelAr: 'خيل / حصان',   emoji: '🐎' },
  { value: 'donkey',  labelEn: 'Donkey',  labelAr: 'حمار',         emoji: '🫏' },
  { value: 'sheep',   labelEn: 'Sheep',   labelAr: 'خروف / أغنام', emoji: '🐑' },
  { value: 'goat',    labelEn: 'Goat',    labelAr: 'ماعز',         emoji: '🐐' },
  { value: 'camel',   labelEn: 'Camel',   labelAr: 'جمل',          emoji: '🐪' },
  { value: 'rabbit',  labelEn: 'Rabbit',  labelAr: 'أرنب',         emoji: '🐇' },
  { value: 'rat',     labelEn: 'Rat',     labelAr: 'جرذ / فأر',    emoji: '🐀' },
  { value: 'bird',    labelEn: 'Bird',    labelAr: 'طائر',         emoji: '🦜' },
  { value: 'falcon',  labelEn: 'Falcon',  labelAr: 'صقر',          emoji: '🦅' },
  { value: 'poultry', labelEn: 'Poultry', labelAr: 'دواجن',        emoji: '🐓' },
  { value: 'duck',    labelEn: 'Duck',    labelAr: 'بطة',          emoji: '🦆' },
  { value: 'turkey',  labelEn: 'Turkey',  labelAr: 'ديك رومي',     emoji: '🦃' },
  { value: 'parrot',  labelEn: 'Parrot',  labelAr: 'ببغاء',        emoji: '🦜' },
  { value: 'canary',  labelEn: 'Canary',  labelAr: 'كناري',        emoji: '🐤' },
  { value: 'pigeon',  labelEn: 'Pigeon',  labelAr: 'حمام',         emoji: '🕊️' },
  { value: 'snake',   labelEn: 'Snake',   labelAr: 'ثعبان',        emoji: '🐍' },
  { value: 'reptile', labelEn: 'Reptile', labelAr: 'زواحف',        emoji: '🦎' },
  { value: 'fish',    labelEn: 'Fish',    labelAr: 'أسماك',        emoji: '🐠' },
  { value: 'other',   labelEn: 'Other',   labelAr: 'حيوان آخر',    emoji: '🐾' }
]


export const KNOWN_SPECIES = SPECIES_OPTIONS.map((o) => o.value)

const BY_VALUE: Record<string, SpeciesOption> = Object.fromEntries(
  SPECIES_OPTIONS.map((o) => [o.value, o])
)

export function speciesEmoji(species: string): string {
  return BY_VALUE[species]?.emoji ?? '🐾'
}

export function speciesLabel(species: string, locale = 'en'): string {
  const item = BY_VALUE[species]
  if (item) return locale === 'ar' ? item.labelAr : item.labelEn
  return species.charAt(0).toUpperCase() + species.slice(1)
}

export function translatedSpeciesLabel(species: string, t: (k: string) => string): string {
  const key = `vetSpecies_${species}`
  const tr = t(key)
  return tr && tr !== key ? tr : speciesLabel(species)
}