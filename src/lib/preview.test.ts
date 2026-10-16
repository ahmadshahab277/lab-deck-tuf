import { describe, expect, it } from 'vitest'
import { canPreview, sanitizeFileName, validateUpload } from './preview'

describe('uploads and previews', () => {
  it('allows pdf preview and rejects huge files', () => {
    expect(canPreview('week1.pdf', 'application/pdf')).toBe(true)
    expect(canPreview('slides.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe(false)
    const huge = new File([new Uint8Array(26 * 1024 * 1024)], 'notes.pdf', { type: 'application/pdf' })
    expect(validateUpload(huge)).toMatch(/25 MB/)
  })

  it('sanitizes storage file names', () => {
    expect(sanitizeFileName('Lab 04 (final).PDF')).toBe('Lab-04-final-.PDF')
  })
})
