import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import {
  findSocketableStat,
  isSocketableStat,
  type SocketableEntry,
  type SocketableStat
} from '../../shared/types'

export const DEFAULT_SOCKETABLES: readonly SocketableEntry[] = [
  {
    id: 'skull_001',
    kind: 'skull',
    name: '',
    stat: 'ALL DAMAGE % | to All Damage bonus',
    value: ''
  },
  {
    id: 'skull_002',
    kind: 'skull',
    name: '',
    stat: 'HEALTH BONUS | Health bonus',
    value: ''
  },
  {
    id: 'skull_003',
    kind: 'skull',
    name: '',
    stat: 'CRITICAL DAMAGE | bonus to Critical Damage',
    value: ''
  },
  {
    id: 'eye_001',
    kind: 'eye',
    name: '',
    stat: 'CRITICAL CHANCE | Critical Hit Chance bonus',
    value: ''
  },
  {
    id: 'eye_002',
    kind: 'eye',
    name: '',
    stat: 'MANA BONUS | Mana bonus',
    value: ''
  },
  {
    id: 'eye_003',
    kind: 'eye',
    name: '',
    stat: 'XP % | increase in the amount of experience gained',
    value: ''
  }
]

export interface SkullsEyesService {
  load(): Promise<readonly SocketableEntry[]>
  save(
    socketables: readonly SocketableEntry[]
  ): Promise<readonly SocketableEntry[]>
  reset(): Promise<readonly SocketableEntry[]>
}

export class JsonSkullsEyesService implements SkullsEyesService {
  constructor(private readonly filePath: string) {}

  async load(): Promise<readonly SocketableEntry[]> {
    try {
      const contents = await readFile(this.filePath, 'utf8')
      const socketables = normalizeSocketableEntries(JSON.parse(contents))

      if (socketables === null) {
        throw new Error('Invalid skulls and eyes data.')
      }

      return cloneSocketables(socketables)
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return cloneSocketables(DEFAULT_SOCKETABLES)
      }

      throw error
    }
  }

  async save(
    socketables: readonly SocketableEntry[]
  ): Promise<readonly SocketableEntry[]> {
    if (!isSocketableEntries(socketables)) {
      throw new Error('Invalid skulls and eyes data.')
    }

    const savedSocketables = cloneSocketables(socketables)
    await mkdir(dirname(this.filePath), { recursive: true })

    const temporaryPath = `${this.filePath}.tmp`
    await writeFile(
      temporaryPath,
      `${JSON.stringify(savedSocketables, null, 2)}\n`,
      'utf8'
    )
    await rename(temporaryPath, this.filePath)

    return savedSocketables
  }

  reset(): Promise<readonly SocketableEntry[]> {
    return this.save(DEFAULT_SOCKETABLES)
  }
}

export const isSocketableEntries = (
  value: unknown
): value is readonly SocketableEntry[] =>
  Array.isArray(value) && value.every(isSocketableEntry)

const isSocketableEntry = (value: unknown): value is SocketableEntry => {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    value.id.trim() !== '' &&
    (value.kind === 'skull' || value.kind === 'eye') &&
    typeof value.name === 'string' &&
    typeof value.value === 'string' &&
    isSocketableStat(value.stat) &&
    (value.iconPath === undefined || typeof value.iconPath === 'string')
  )
}

const cloneSocketables = (
  socketables: readonly SocketableEntry[]
): readonly SocketableEntry[] =>
  socketables.map((socketable) => ({ ...socketable }))

const LEGACY_STATS: Readonly<Record<string, SocketableStat>> = {
  'DAMAGE PHYSICAL%': 'DAMAGE PHYSICAL %',
  'WEAPON DAMAGE ELETRICAL': 'WEAPON DAMAGE ELECTRICAL',
  'ARMOR FLET': 'ARMOR FLAT',
  'MULT-ARMOR FLET': 'MULT-ARMOR FLAT',
  'KNOCKBACK RESISTENCE': 'KNOCKBACK RESISTANCE'
}

const normalizeSocketableEntries = (
  value: unknown
): readonly SocketableEntry[] | null => {
  if (!Array.isArray(value)) {
    return null
  }

  const normalized = value.map((entry) => {
    if (!isRecord(entry) || typeof entry.stat !== 'string') {
      return entry
    }

    const legacyStat = LEGACY_STATS[entry.stat] ?? entry.stat
    const migratedStat = findSocketableStat(legacyStat)
    return migratedStat === undefined
      ? entry
      : { ...entry, stat: migratedStat.id }
  })

  return isSocketableEntries(normalized) ? normalized : null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error
