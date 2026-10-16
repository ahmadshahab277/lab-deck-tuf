export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  const rounded = value >= 10 || exponent === 0 || Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
  return `${rounded} ${units[exponent]}`
}

export function formatDate(value: string | null, timeZone = 'Asia/Karachi'): string {
  if (!value) return 'No date'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatDateTime(value: string | null, timeZone = 'Asia/Karachi'): string {
  if (!value) return 'No deadline'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function padLab(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatRelative(value: string | null, now = Date.now()): string {
  if (!value) return 'No deadline'
  const target = new Date(value).getTime()
  if (Number.isNaN(target)) return 'No deadline'
  const diff = target - now
  const abs = Math.abs(diff)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  const ahead = diff >= 0

  if (abs < minute) return ahead ? 'in under a minute' : 'just now'
  if (abs < hour) {
    const mins = Math.max(1, Math.round(abs / minute))
    return ahead ? `in ${mins} min` : `${mins} min ago`
  }
  if (abs < day) {
    const hours = Math.max(1, Math.round(abs / hour))
    return ahead ? `in ${hours} hr` : `${hours} hr ago`
  }
  const days = Math.max(1, Math.round(abs / day))
  const unit = days === 1 ? 'day' : 'days'
  return ahead ? `in ${days} ${unit}` : `${days} ${unit} ago`
}

export function resourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    outline: 'Course outline',
    lecture: 'Lecture',
    lab_manual: 'Lab manual',
    slides: 'Slides',
    code: 'Source code',
    handout: 'Handout',
    other: 'Resource',
  }
  return labels[type] ?? 'Resource'
}

export function statusLabel(status: string): string {
  return status.replaceAll('_', ' ')
}
