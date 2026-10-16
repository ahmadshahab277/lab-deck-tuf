const PREVIEWABLE_MIME = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/json',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])

const PREVIEWABLE_EXT = new Set([
  'pdf',
  'txt',
  'md',
  'json',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'c',
  'cpp',
  'h',
  'java',
  'py',
  'js',
  'ts',
  'tsx',
  'css',
  'html',
])

export function fileExtension(name: string): string {
  const parts = name.toLowerCase().split('.')
  return parts.length > 1 ? (parts.at(-1) ?? '') : ''
}

export function canPreview(fileName: string, mime: string): boolean {
  return PREVIEWABLE_MIME.has(mime) || PREVIEWABLE_EXT.has(fileExtension(fileName))
}

export function isTextPreview(fileName: string, mime: string): boolean {
  if (mime.startsWith('text/') || mime === 'application/json') return true
  return ['txt', 'md', 'json', 'c', 'cpp', 'h', 'java', 'py', 'js', 'ts', 'tsx', 'css', 'html'].includes(
    fileExtension(fileName),
  )
}

export function isImagePreview(mime: string): boolean {
  return mime.startsWith('image/')
}

export const ALLOWED_UPLOAD_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'txt',
  'md',
  'c',
  'cpp',
  'h',
  'hpp',
  'java',
  'py',
  'js',
  'ts',
  'tsx',
  'html',
  'css',
  'json',
  'zip',
  'png',
  'jpg',
  'jpeg',
  'webp',
] as const

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-')
  return cleaned.slice(0, 120) || 'file'
}

export function validateUpload(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) return 'Files must be 25 MB or smaller.'
  const ext = fileExtension(file.name)
  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(ext as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number])) {
    return 'This file type is not supported.'
  }
  return null
}
