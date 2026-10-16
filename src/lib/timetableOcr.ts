import type { OcrWord } from './timetable'
import { fileExtension } from './preview'

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])

export function validateTimetableImage(file: File): string | null {
  if (file.size > 25 * 1024 * 1024) return 'Pictures must be 25 MB or smaller.'
  const extension = fileExtension(file.name)
  const imageType = file.type.startsWith('image/')
  if (!imageType && !IMAGE_EXTENSIONS.has(extension)) return 'Upload a picture of the timetable (PNG, JPG, or WEBP).'
  if (file.type && !file.type.startsWith('image/')) return 'Upload a picture of the timetable (PNG, JPG, or WEBP).'
  return null
}

export async function readTimetableImage(file: File, onProgress?: (message: string) => void): Promise<OcrWord[]> {
  onProgress?.('Preparing the timetable reader…')
  const { createWorker, PSM } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    logger: (message) => {
      if (message.status === 'recognizing text') onProgress?.(`Reading timetable… ${Math.round(message.progress * 100)}%`)
      else onProgress?.('Preparing the timetable reader…')
    },
  })
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: '1',
    })
    const image = await prepareImage(file)
    const result = await worker.recognize(image, {}, { blocks: true, text: true })
    return wordsFromPage(result.data.blocks)
  } finally {
    await worker.terminate()
  }
}

function wordsFromPage(blocks: { paragraphs: { lines: { words: { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }[] }[] }[] }[] | null): OcrWord[] {
  const words: OcrWord[] = []
  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        for (const word of line.words ?? []) {
          const text = word.text?.trim()
          if (!text) continue
          if (word.confidence < 30 && !/[0-9]|mon|tue|wed|thu|fri|sat|sun/i.test(text)) continue
          words.push({
            text,
            x: word.bbox.x0,
            y: word.bbox.y0,
            w: Math.max(1, word.bbox.x1 - word.bbox.x0),
            h: Math.max(1, word.bbox.y1 - word.bbox.y0),
          })
        }
      }
    }
  }
  return words
}

async function prepareImage(file: File): Promise<Blob | File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = bitmap.width > 1800 ? 1800 / bitmap.width : bitmap.width < 1200 ? Math.min(2, 1400 / bitmap.width) : 1
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const image = context.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = image.data
    for (let index = 0; index < pixels.length; index += 4) {
      const gray = pixels[index] * 0.3 + pixels[index + 1] * 0.59 + pixels[index + 2] * 0.11
      const contrast = Math.min(255, Math.max(0, (gray - 128) * 1.4 + 128))
      pixels[index] = contrast
      pixels[index + 1] = contrast
      pixels[index + 2] = contrast
    }
    context.putImageData(image, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    return blob ?? file
  } catch {
    return file
  }
}
