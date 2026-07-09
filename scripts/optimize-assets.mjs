import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { assetConfig } from './assets.config.mjs'

const root = process.cwd()
const sourceDirectory = path.resolve(root, assetConfig.sourceDirectory)
const outputDirectory = path.resolve(root, assetConfig.outputDirectory)
const sourceExtensions = new Set(assetConfig.optimization.sourceExtensions)

async function loadSharp() {
  try {
    const sharpModule = await import('sharp')
    return sharpModule.default
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.error('Missing optimizer dependency. Run `npm install` and try again.')
      process.exit(1)
    }

    throw error
  }
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

const sharp = await loadSharp()
const files = await collectFiles(sourceDirectory)
let optimizedCount = 0
let outputBytes = 0

await rm(outputDirectory, { recursive: true, force: true })
await mkdir(outputDirectory, { recursive: true })
await writeFile(path.join(outputDirectory, '.gitkeep'), '')

for (const file of files) {
  const extension = path.extname(file).toLowerCase()

  if (!sourceExtensions.has(extension)) {
    continue
  }

  const relativePath = path.relative(sourceDirectory, file)
  const parsedPath = path.parse(relativePath)
  const outputPath = path.join(outputDirectory, parsedPath.dir, `${parsedPath.name}.webp`)

  await mkdir(path.dirname(outputPath), { recursive: true })
  await sharp(file)
    .rotate()
    .resize({
      width: assetConfig.optimization.maxWidth,
      height: assetConfig.optimization.maxHeight,
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality: assetConfig.optimization.webpQuality })
    .toFile(outputPath)

  const outputStats = await stat(outputPath)
  optimizedCount += 1
  outputBytes += outputStats.size
}

console.log(
  `Generated ${optimizedCount} optimized asset(s) in ${assetConfig.outputDirectory}. ` +
    `Output size is ${(outputBytes / 1024).toFixed(1)} KB.`
)
