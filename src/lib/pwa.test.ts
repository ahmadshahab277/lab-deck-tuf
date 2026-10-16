import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { detectPlatform } from './pwa'

describe('pwa install helpers', () => {
  it('detects ios, android, and mac', () => {
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios')
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 14)')).toBe('android')
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)')).toBe('mac')
  })

  it('includes installable manifest assets', () => {
    const manifest = readFileSync(resolve(process.cwd(), 'public/manifest.webmanifest'), 'utf8')
    expect(manifest).toContain('"name": "TUF LabDesk"')
    expect(manifest).toContain('"short_name": "LabDesk"')
    expect(manifest).toContain('/icons/icon-192.png')
    expect(manifest).toContain('/icons/icon-512.png')
    expect(readFileSync(resolve(process.cwd(), 'public/offline.html'), 'utf8')).toContain('offline')
    expect(readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8')).toContain('labdesk-shell')
  })
})
