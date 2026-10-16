export function slugifyPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export function buildClassSlug(input: {
  course_code: string
  section: string
  academic_year: string
  suffix?: string
}): string {
  const parts = [
    slugifyPart(input.course_code),
    slugifyPart(input.section),
    slugifyPart(input.academic_year.replace('/', '-')),
  ].filter(Boolean)
  const base = parts.join('-') || 'class'
  return input.suffix ? `${base}-${slugifyPart(input.suffix)}` : base
}

export function normalizeSlugInput(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[?#].*$/, '')
    .replace(/^https?:\/\/[^/]+\/c\//, '')
    .replace(/\/.*$/, '')
    .replace(/[^a-z0-9-]/g, '')
}

export function classPath(slug: string): string {
  return `/c/${slug}`
}

export function classUrl(slug: string, origin = globalThis.location?.origin ?? ''): string {
  return `${origin}${classPath(slug)}`
}
