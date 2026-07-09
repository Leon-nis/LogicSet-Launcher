import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import defaultBosses from '../../../data/bosses.json'
import type {
  LogicSetBossArmorKind,
  LogicSetBossEntry,
  LogicSetBossRatingKind
} from '../../shared/types'

const armorKinds: readonly LogicSetBossArmorKind[] = [
  'Physical',
  'Ice',
  'Fire',
  'Electric',
  'Poison'
]

const ratingKinds: readonly LogicSetBossRatingKind[] = [
  'Fatality',
  'Brutality',
  'Agility',
  'Hostility'
]

export class JsonBossesService {
  constructor(
    private readonly filePath: string,
    private readonly projectDefaultsPath: string
  ) {}

  async load(): Promise<readonly LogicSetBossEntry[]> {
    try {
      const contents = await readFile(this.filePath, 'utf8')
      const bosses = normalizeBossEntries(JSON.parse(contents))

      if (bosses === null) {
        throw new Error('Invalid bosses data.')
      }

      return mergeMissingDefaultBosses(bosses)
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return cloneBosses(DEFAULT_LOGICSET_BOSSES)
      }

      throw error
    }
  }

  async save(
    bosses: readonly LogicSetBossEntry[]
  ): Promise<readonly LogicSetBossEntry[]> {
    if (!isLogicSetBossEntries(bosses)) {
      throw new Error('Invalid bosses data.')
    }

    const savedBosses = cloneBosses(bosses)
    await writeBossesFile(this.filePath, savedBosses)

    return savedBosses
  }

  async exportToProject(
    bosses: readonly LogicSetBossEntry[]
  ): Promise<readonly LogicSetBossEntry[]> {
    if (!isLogicSetBossEntries(bosses)) {
      throw new Error('Invalid bosses data.')
    }

    const exportedBosses = cloneBosses(bosses)
    await writeBossesFile(this.projectDefaultsPath, exportedBosses)

    return exportedBosses
  }

  reset(): Promise<readonly LogicSetBossEntry[]> {
    return this.save(DEFAULT_LOGICSET_BOSSES)
  }
}

export const isLogicSetBossEntries = (
  value: unknown
): value is readonly LogicSetBossEntry[] =>
  Array.isArray(value) && value.every(isLogicSetBossEntry)

const isLogicSetBossEntry = (value: unknown): value is LogicSetBossEntry => {
  if (!isRecord(value) || !isRecord(value.armor) || !isRecord(value.ratings)) {
    return false
  }

  const armor = value.armor
  const ratings = value.ratings

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.act === 'string' &&
    isFiniteNumber(value.speed) &&
    value.speed >= 0 &&
    isFiniteNumber(value.criticalChance) &&
    value.criticalChance >= 0 &&
    value.criticalChance <= 100 &&
    (
      value.imageOffsetX === undefined ||
      (
        isFiniteNumber(value.imageOffsetX) &&
        value.imageOffsetX >= 0 &&
        value.imageOffsetX <= 100
      )
    ) &&
    isFiniteNumber(value.hp) &&
    value.hp >= 0 &&
    armorKinds.every((kind) => isFiniteNumber(armor[kind])) &&
    ratingKinds.every((kind) => isRatingValue(ratings[kind]))
  )
}

const normalizeBossEntries = (
  value: unknown
): readonly LogicSetBossEntry[] | null =>
  isLogicSetBossEntries(value) ? value : null

const cloneBosses = (
  bosses: readonly LogicSetBossEntry[]
): readonly LogicSetBossEntry[] =>
  bosses.map((boss) => ({
    ...boss,
    imageOffsetX: boss.imageOffsetX ?? 50,
    armor: { ...boss.armor },
    ratings: { ...boss.ratings }
  }))

const mergeMissingDefaultBosses = (
  bosses: readonly LogicSetBossEntry[]
): readonly LogicSetBossEntry[] => {
  const bossIds = new Set(bosses.map((boss) => boss.id))
  return cloneBosses([
    ...bosses,
    ...DEFAULT_LOGICSET_BOSSES.filter((boss) => !bossIds.has(boss.id))
  ])
}

const parseDefaultBosses = (): readonly LogicSetBossEntry[] => {
  const bosses = normalizeBossEntries(defaultBosses)

  if (bosses === null) {
    throw new Error('Invalid versioned bosses data.')
  }

  return cloneBosses(bosses)
}

const writeBossesFile = async (
  filePath: string,
  bosses: readonly LogicSetBossEntry[]
): Promise<void> => {
  await mkdir(dirname(filePath), { recursive: true })

  const temporaryPath = `${filePath}.tmp`
  await writeFile(
    temporaryPath,
    `${JSON.stringify(bosses, null, 2)}\n`,
    'utf8'
  )
  await rename(temporaryPath, filePath)
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isRatingValue = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 5

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNodeError = (
  error: unknown
): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error

export const DEFAULT_LOGICSET_BOSSES = parseDefaultBosses()
