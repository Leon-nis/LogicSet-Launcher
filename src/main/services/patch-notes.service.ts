import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, extname } from 'node:path'
import type {
  PatchNoteEntry,
  PatchNoteEntryInput
} from '../../shared/types'

export class JsonPatchNotesService {
  constructor(private readonly filePath: string) {}

  async load(): Promise<readonly PatchNoteEntry[]> {
    const entries = await this.loadInputs()
    return Promise.all(entries.map(loadPatchNoteImage))
  }

  async save(
    entries: readonly PatchNoteEntryInput[]
  ): Promise<readonly PatchNoteEntry[]> {
    if (!isPatchNoteEntryInputs(entries)) {
      throw new Error('Invalid patch notes data.')
    }

    const savedEntries = entries.map((entry) => ({ ...entry }))
    await mkdir(dirname(this.filePath), { recursive: true })

    const temporaryPath = `${this.filePath}.tmp`
    await writeFile(
      temporaryPath,
      `${JSON.stringify(savedEntries, null, 2)}\n`,
      'utf8'
    )
    await rename(temporaryPath, this.filePath)

    return Promise.all(savedEntries.map(loadPatchNoteImage))
  }

  private async loadInputs(): Promise<readonly PatchNoteEntryInput[]> {
    try {
      const contents = await readFile(this.filePath, 'utf8')
      const entries: unknown = JSON.parse(contents)

      if (!isPatchNoteEntryInputs(entries)) {
        throw new Error('Invalid patch notes data.')
      }

      return entries.map((entry) => ({ ...entry }))
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return []
      }

      throw error
    }
  }
}

export const isPatchNoteEntryInputs = (
  value: unknown
): value is readonly PatchNoteEntryInput[] =>
  Array.isArray(value) && value.every(isPatchNoteEntryInput)

const isPatchNoteEntryInput = (
  value: unknown
): value is PatchNoteEntryInput => {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    value.id.trim() !== '' &&
    typeof value.version === 'string' &&
    value.version.trim() !== '' &&
    typeof value.imagePath === 'string' &&
    value.imagePath.trim() !== ''
  )
}

const loadPatchNoteImage = async (
  entry: PatchNoteEntryInput
): Promise<PatchNoteEntry> => {
  try {
    const image = await readFile(entry.imagePath)
    return {
      ...entry,
      imageDataUrl: `data:${getImageMimeType(entry.imagePath)};base64,${image.toString('base64')}`
    }
  } catch {
    return { ...entry, imageDataUrl: null }
  }
}

const getImageMimeType = (filePath: string): string => {
  switch (extname(filePath).toLowerCase()) {
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    default:
      return 'image/jpeg'
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error
