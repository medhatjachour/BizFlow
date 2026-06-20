/**
 * Shared species catalogue for the vet plugin.
 *
 * `species` is a free-text String in the schema (no migration needed), so this
 * list is purely a UI convenience: known options get a nice emoji + label, and
 * anything else (custom-entered) is title-cased and shown with a generic paw.
 */

export interface SpeciesOption {
  value: string
  label: string
  emoji: string
}

export const SPECIES_OPTIONS: SpeciesOption[] = [
  { value: 'dog',     label: 'Dog',     emoji: '🐕' },
  { value: 'cat',     label: 'Cat',     emoji: '🐈' },
  { value: 'cow',     label: 'Cow',     emoji: '🐄' },
  { value: 'buffalo', label: 'Buffalo', emoji: '🐃' },
  { value: 'horse',   label: 'Horse',   emoji: '🐎' },
  { value: 'donkey',  label: 'Donkey',  emoji: '🫏' },
  { value: 'sheep',   label: 'Sheep',   emoji: '🐑' },
  { value: 'goat',    label: 'Goat',    emoji: '🐐' },
  { value: 'rabbit',  label: 'Rabbit',  emoji: '🐇' },
  { value: 'rat',     label: 'Rat',     emoji: '🐀' },
  { value: 'bird',    label: 'Bird',    emoji: '🦜' },
  { value: 'reptile', label: 'Reptile', emoji: '🦎' },
  { value: 'fish',    label: 'Fish',    emoji: '🐠' },
  { value: 'other',   label: 'Other',   emoji: '🐾' },
]

/** The known species keys (everything except the free-text "other"). */
export const KNOWN_SPECIES: string[] = SPECIES_OPTIONS.map((o) => o.value)

const BY_VALUE: Record<string, SpeciesOption> = Object.fromEntries(
  SPECIES_OPTIONS.map((o) => [o.value, o])
)

/** Emoji for a species value (falls back to a paw for custom/unknown values). */
export function speciesEmoji(species: string): string {
  return BY_VALUE[species]?.emoji ?? '🐾'
}

/** Human label for a species value (title-cases custom/unknown free text). */
export function speciesLabel(species: string): string {
  const known = BY_VALUE[species]
  if (known) return known.label
  if (!species) return 'Other'
  return species.charAt(0).toUpperCase() + species.slice(1)
}

/**
 * Translated species label: uses the i18n key `vetSpecies_<value>` when a
 * translation exists, otherwise falls back to the title-cased / custom label.
 * (Custom free-text species have no key, so they keep their typed value.)
 */
export function translatedSpeciesLabel(species: string, t: (key: string) => string): string {
  const key = `vetSpecies_${species}`
  const translated = t(key)
  return translated && translated !== key ? translated : speciesLabel(species)
}
