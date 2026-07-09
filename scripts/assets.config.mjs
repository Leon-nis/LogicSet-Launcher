export const assetConfig = {
  sourceDirectory: 'assets-source',
  outputDirectory: 'src/renderer/src/assets/generated',
  maxFileBytes: 500 * 1024,
  maxTotalBytes: 10 * 1024 * 1024,
  allowedOutputExtensions: ['.avif', '.ico', '.svg', '.webp'],
  optimization: {
    maxWidth: 1600,
    maxHeight: 1600,
    webpQuality: 80,
    sourceExtensions: ['.avif', '.jpeg', '.jpg', '.png', '.webp']
  }
}
