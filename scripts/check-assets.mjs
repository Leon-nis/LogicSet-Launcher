import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { assetConfig } from './assets.config.mjs'

const root = process.cwd()
const assetDirectory = path.resolve(root, assetConfig.outputDirectory)
const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

function formatBytes(bytes) {
  return `${formatter.format(bytes / 1024)} KB`
}

async function collectFiles(directory) {
  let entries

  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []
    }

    throw error
  }

  const files = []

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolutePath))
      continue
    }

    if (entry.isFile() && !entry.name.startsWith('.')) {
      files.push(absolutePath)
    }
  }

  return files
}

const files = await collectFiles(assetDirectory)
const allowedExtensions = new Set(assetConfig.allowedOutputExtensions)
const oversizedFiles = []
const unsupportedFiles = []
let totalBytes = 0

for (const file of files) {
  const fileStats = await stat(file)
  const relativePath = path.relative(root, file)
  const extension = path.extname(file).toLowerCase()

  totalBytes += fileStats.size

  if (!allowedExtensions.has(extension)) {
    unsupportedFiles.push(relativePath)
  }

  if (fileStats.size > assetConfig.maxFileBytes) {
    oversizedFiles.push(`${relativePath} (${formatBytes(fileStats.size)})`)
  }
}

const errors = []

if (unsupportedFiles.length > 0) {
  errors.push(`Unsupported asset type:\n${unsupportedFiles.map((file) => `  - ${file}`).join('\n')}`)
}

if (oversizedFiles.length > 0) {
  errors.push(
    `Assets above ${formatBytes(assetConfig.maxFileBytes)}:\n${oversizedFiles.map((file) => `  - ${file}`).join('\n')}`
  )
}

if (totalBytes > assetConfig.maxTotalBytes) {
  errors.push(
    `Generated asset folder is ${formatBytes(totalBytes)}, above the ${formatBytes(assetConfig.maxTotalBytes)} total limit.`
  )
}

if (errors.length > 0) {
  console.error(`Asset check failed for ${assetConfig.outputDirectory}:\n\n${errors.join('\n\n')}`)
  process.exit(1)
}

console.log(
  `Asset check passed: ${files.length} file(s), ${formatBytes(totalBytes)} total. ` +
    `Per-file limit is ${formatBytes(assetConfig.maxFileBytes)}.`
)
