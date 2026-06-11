import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import {
  DEFAULT_SOCKETABLE_STAT,
  findSocketableStat,
  isSocketableStat,
  type LogicSetHelmetAffix,
  type LogicSetSetBonus,
  type LogicSetSetEntry
} from '../../shared/types'

const DEFAULT_STAT = DEFAULT_SOCKETABLE_STAT

const SET_DEFINITIONS = [
  ['ghastly', 'Ghastly', 5, [2, 3]],
  ['grell', 'Grell', 10, [2, 3]],
  ['runemaster', 'Runemaster', 10, [2, 3, 4, 7]],
  ['clovenhoof', 'Clovenhoof', 15, [2, 3, 4, 7]],
  ['falcon', 'Falcon', 15, [2]],
  ['oles_tools', "Ole's Tools", 15, [2]],
  ['two_stroke', 'Two Stroke', 15, [2]],
  ['twinferno', 'Twinferno', 15, [2, 3]],
  ['pioneer', 'Pioneer', 18, [2, 3, 4, 7]],
  ['cabalist', 'Cabalist', 19, [2, 3, 4]],
  ['railforged', 'RailForged', 19, [2, 3, 4]],
  ['true_north', 'True North', 19, [2, 3, 4]],
  ['wanderlust', 'Wanderlust', 19, [2, 3, 4]],
  [
    'occultist_apprentice',
    'Occultist Apprentice',
    20,
    [2, 3, 4, 7]
  ],
  ['argonaut', 'Argonaut', 22, [2, 3, 4, 7]],
  ['estheria', 'Estheria', 23, [2, 3, 4, 7]],
  ['blood_leather', 'Blood Leather', 25, [2, 3]],
  ['grundigs_bastion', "Grundig's Bastion", 25, [2, 3]],
  ['outlaw', 'Outlaw', 25, [2]],
  ['twisted_tools', 'Twisted Tools', 25, [2, 3]],
  ['regent', 'Regent', 26, [2, 3, 4, 7]],
  ['necros', 'Necros', 27, [2, 3, 4]],
  ['badlands', 'Badlands', 31, [2, 3, 4, 7]],
  ['wazir', 'Wazir', 34, [2, 3, 4, 7]]
] as const

export const DEFAULT_LOGICSET_SETS: readonly LogicSetSetEntry[] =
  SET_DEFINITIONS.map(([id, name, level, pieces]) => ({
    id,
    name,
    level,
    rarity: 'rare',
    helmet: {
      affixes: []
    },
    bonuses: pieces.map((pieceCount) => ({
      pieces: pieceCount,
      stat: DEFAULT_STAT
    }))
  }))

export class JsonSetsService {
  constructor(private readonly filePath: string) {}

  async load(): Promise<readonly LogicSetSetEntry[]> {
    try {
      const contents = await readFile(this.filePath, 'utf8')
      const sets = normalizeSetEntries(JSON.parse(contents))

      if (sets === null) {
        throw new Error('Invalid sets data.')
      }

      return cloneAndSortSets(sets)
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return cloneAndSortSets(DEFAULT_LOGICSET_SETS)
      }

      throw error
    }
  }

  async save(
    sets: readonly LogicSetSetEntry[]
  ): Promise<readonly LogicSetSetEntry[]> {
    if (!isLogicSetSetEntries(sets)) {
      throw new Error('Invalid sets data.')
    }

    const savedSets = cloneAndSortSets(sets)
    await mkdir(dirname(this.filePath), { recursive: true })

    const temporaryPath = `${this.filePath}.tmp`
    await writeFile(
      temporaryPath,
      `${JSON.stringify(savedSets, null, 2)}\n`,
      'utf8'
    )
    await rename(temporaryPath, this.filePath)

    return savedSets
  }

  reset(): Promise<readonly LogicSetSetEntry[]> {
    return this.save(DEFAULT_LOGICSET_SETS)
  }
}

export const isLogicSetSetEntries = (
  value: unknown
): value is readonly LogicSetSetEntry[] =>
  Array.isArray(value) && value.every(isLogicSetSetEntry)

const isLogicSetSetEntry = (value: unknown): value is LogicSetSetEntry => {
  if (!isRecord(value) || !isRecord(value.helmet)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    value.id.trim() !== '' &&
    typeof value.name === 'string' &&
    isFiniteNumber(value.level) &&
    (value.rarity === 'rare' ||
      value.rarity === 'unique' ||
      value.rarity === 'legendary') &&
    (value.helmet.iconPath === undefined ||
      typeof value.helmet.iconPath === 'string') &&
    Array.isArray(value.helmet.affixes) &&
    value.helmet.affixes.every(isHelmetAffix) &&
    Array.isArray(value.bonuses) &&
    value.bonuses.every(isSetBonus)
  )
}

const isHelmetAffix = (value: unknown): value is LogicSetHelmetAffix =>
  isRecord(value) &&
  isKnownStat(value.stat) &&
  typeof value.value === 'string'

const isSetBonus = (value: unknown): value is LogicSetSetBonus =>
  isRecord(value) && isFiniteNumber(value.pieces) && isKnownStat(value.stat)

const isKnownStat = (
  value: unknown
): value is string => isSocketableStat(value)

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const cloneAndSortSets = (
  sets: readonly LogicSetSetEntry[]
): readonly LogicSetSetEntry[] =>
  sets
    .map((set) => ({
      ...set,
      helmet: {
        ...set.helmet,
        affixes: set.helmet.affixes.map((affix) => ({ ...affix }))
      },
      bonuses: set.bonuses.map((bonus) => ({ ...bonus }))
    }))
    .sort(
      (left, right) =>
        left.level - right.level || left.name.localeCompare(right.name)
    )

const normalizeSetEntries = (
  value: unknown
): readonly LogicSetSetEntry[] | null => {
  if (!Array.isArray(value)) {
    return null
  }

  const normalized = value.map((set) => {
    if (!isRecord(set) || !isRecord(set.helmet)) {
      return set
    }

    const affixes = Array.isArray(set.helmet.affixes)
      ? set.helmet.affixes.map(normalizeStatRecord)
      : set.helmet.affixes
    const bonuses = Array.isArray(set.bonuses)
      ? set.bonuses.map(normalizeStatRecord)
      : set.bonuses

    return {
      ...set,
      helmet: { ...set.helmet, affixes },
      bonuses
    }
  })

  return isLogicSetSetEntries(normalized) ? normalized : null
}

const normalizeStatRecord = (value: unknown): unknown => {
  if (!isRecord(value) || typeof value.stat !== 'string') {
    return value
  }

  const option = findSocketableStat(value.stat)
  return option === undefined ? value : { ...value, stat: option.id }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error
