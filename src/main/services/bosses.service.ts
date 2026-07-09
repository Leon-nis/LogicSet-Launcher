import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
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

export const DEFAULT_LOGICSET_BOSSES: readonly LogicSetBossEntry[] = [
  {
    id: 'fallen-guardian',
    name: 'Fallen Guardian',
    act: 'Act 1',
    speed: 8.2,
    criticalChance: 5,
    hp: 2499,
    armor: {
      Physical: 27,
      Ice: 68,
      Fire: 0,
      Electric: 27,
      Poison: 54
    },
    ratings: {
      Fatality: 5,
      Brutality: 1,
      Agility: 3,
      Hostility: 3
    }
  },
  {
    id: 'willy',
    name: 'Willy',
    act: 'Act 1',
    speed: 6,
    criticalChance: 0,
    hp: 6219,
    armor: {
      Physical: 73,
      Ice: 8,
      Fire: 73,
      Electric: 73,
      Poison: 146
    },
    ratings: {
      Fatality: 2,
      Brutality: 4,
      Agility: 1,
      Hostility: 2
    }
  },
  {
    id: 'mordrox',
    name: 'Mordrox',
    act: 'Act 1',
    speed: 4,
    criticalChance: 5,
    hp: 15430,
    armor: {
      Physical: 7,
      Ice: 7,
      Fire: 7,
      Electric: 7,
      Poison: 96
    },
    ratings: {
      Fatality: 1,
      Brutality: 2,
      Agility: 1,
      Hostility: 3
    }
  },
  {
    id: 'general-grell',
    name: 'General Grell',
    act: 'Act 1',
    speed: 8,
    criticalChance: 5,
    hp: 11037,
    armor: {
      Physical: 123,
      Ice: 21,
      Fire: 82,
      Electric: 82,
      Poison: 21
    },
    ratings: {
      Fatality: 4,
      Brutality: 3,
      Agility: 1,
      Hostility: 2
    }
  },
  {
    id: 'widow',
    name: 'Widow',
    act: 'Act 1',
    speed: 10,
    criticalChance: 5,
    hp: 12807,
    armor: {
      Physical: 102,
      Ice: 102,
      Fire: 28,
      Electric: 102,
      Poison: 153
    },
    ratings: {
      Fatality: 5,
      Brutality: 1,
      Agility: 4,
      Hostility: 1
    }
  },
  {
    id: 'king-pogg',
    name: 'King Pogg',
    act: 'Act 1',
    speed: 10,
    criticalChance: 5,
    hp: 23401,
    armor: {
      Physical: 172,
      Ice: 172,
      Fire: 35,
      Electric: 103,
      Poison: 35
    },
    ratings: {
      Fatality: 2,
      Brutality: 5,
      Agility: 4,
      Hostility: 2
    }
  },
  {
    id: 'kidrik',
    name: 'Kidrik',
    act: 'Act 1',
    speed: 11,
    criticalChance: 5,
    hp: 8820,
    armor: {
      Physical: 149,
      Ice: 149,
      Fire: 149,
      Electric: 149,
      Poison: 149
    },
    ratings: {
      Fatality: 3,
      Brutality: 1,
      Agility: 5,
      Hostility: 2
    }
  },
  {
    id: 'chillhoof',
    name: 'Chillhoof',
    act: 'Act 1',
    speed: 8,
    criticalChance: 5,
    hp: 20212,
    armor: {
      Physical: 164,
      Ice: 187,
      Fire: 112,
      Electric: 149,
      Poison: 38
    },
    ratings: {
      Fatality: 3,
      Brutality: 3,
      Agility: 1,
      Hostility: 4
    }
  },
  {
    id: 'eldrayn',
    name: 'Eldrayn',
    act: 'Act 1',
    speed: 5,
    criticalChance: 5,
    hp: 34995,
    armor: {
      Physical: 176,
      Ice: 176,
      Fire: 176,
      Electric: 176,
      Poison: 176
    },
    ratings: {
      Fatality: 3,
      Brutality: 4,
      Agility: 2,
      Hostility: 4
    }
  },
  {
    id: 'manticore',
    name: 'Manticore',
    act: 'Act 2',
    speed: 10,
    criticalChance: 5,
    hp: 29879,
    armor: {
      Physical: 219,
      Ice: 219,
      Fire: 219,
      Electric: 55,
      Poison: 219
    },
    ratings: {
      Fatality: 2,
      Brutality: 2,
      Agility: 2,
      Hostility: 4
    }
  },
  {
    id: 'juthama-kasam',
    name: 'Juthama Kasam',
    act: 'Act 2',
    speed: 6,
    criticalChance: 5,
    hp: 27535,
    armor: {
      Physical: 102,
      Ice: 266,
      Fire: 266,
      Electric: 266,
      Poison: 266
    },
    ratings: {
      Fatality: 3,
      Brutality: 2,
      Agility: 4,
      Hostility: 4
    }
  },
  {
    id: 'manaforged',
    name: 'Manaforged',
    act: 'Act 2',
    speed: 9,
    criticalChance: 5,
    hp: 28295,
    armor: {
      Physical: 296,
      Ice: 110,
      Fire: 219,
      Electric: 110,
      Poison: 263
    },
    ratings: {
      Fatality: 2,
      Brutality: 2,
      Agility: 2,
      Hostility: 4
    }
  },
  {
    id: 'artificer',
    name: 'Artificer',
    act: 'Act 2',
    speed: 8,
    criticalChance: 5,
    hp: 72720,
    armor: {
      Physical: 250,
      Ice: 250,
      Fire: 250,
      Electric: 375,
      Poison: 375
    },
    ratings: {
      Fatality: 4,
      Brutality: 4,
      Agility: 5,
      Hostility: 2
    }
  }
]

export class JsonBossesService {
  constructor(private readonly filePath: string) {}

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
    await mkdir(dirname(this.filePath), { recursive: true })

    const temporaryPath = `${this.filePath}.tmp`
    await writeFile(
      temporaryPath,
      `${JSON.stringify(savedBosses, null, 2)}\n`,
      'utf8'
    )
    await rename(temporaryPath, this.filePath)

    return savedBosses
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
