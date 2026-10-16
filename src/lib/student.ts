import { getSupabase, invokeFunction } from './supabase'
import type {
  StudentAnnouncement,
  StudentAssignment,
  StudentClass,
  StudentGuideline,
  StudentLab,
  StudentResource,
} from '../types'

type RpcEnvelope<K extends string, T> = { ok: boolean; error?: string } & Partial<Record<K, T>>

type FileAccess = {
  path: string
  fileName: string
  mime: string
}

async function studentRpc<K extends string, T>(
  fn: string,
  token: string,
  key: K,
): Promise<T> {
  const { data, error } = await getSupabase().rpc(fn, { p_token: token })
  if (error) throw new Error(error.message)
  const payload = data as RpcEnvelope<K, T>
  if (!payload?.ok) throw new Error(payload?.error ?? 'Session expired.')
  return (payload[key] ?? []) as T
}

export async function loadStudentClass(token: string): Promise<StudentClass> {
  const { data, error } = await getSupabase().rpc('student_get_class', { p_token: token })
  if (error) throw new Error(error.message)
  const payload = data as { ok: boolean; error?: string; class?: StudentClass }
  if (!payload?.ok || !payload.class) throw new Error(payload?.error ?? 'Session expired.')
  return payload.class
}

export function loadStudentResources(token: string) {
  return studentRpc('student_get_resources', token, 'resources') as Promise<StudentResource[]>
}

export function loadStudentLabs(token: string) {
  return studentRpc('student_get_labs', token, 'labs') as Promise<StudentLab[]>
}

export function loadStudentAssignments(token: string) {
  return studentRpc('student_get_assignments', token, 'assignments') as Promise<StudentAssignment[]>
}

export function loadStudentAnnouncements(token: string) {
  return studentRpc('student_get_announcements', token, 'announcements') as Promise<StudentAnnouncement[]>
}

export function loadStudentGuidelines(token: string) {
  return studentRpc('student_get_guidelines', token, 'guidelines') as Promise<StudentGuideline[]>
}

export async function loadStudentBundle(token: string) {
  const [course, resources, labs, assignments, announcements, guidelines] = await Promise.all([
    loadStudentClass(token),
    loadStudentResources(token),
    loadStudentLabs(token),
    loadStudentAssignments(token),
    loadStudentAnnouncements(token),
    loadStudentGuidelines(token),
  ])
  return { course, resources, labs, assignments, announcements, guidelines }
}

async function resolveFileAccess(resourceId: string, classToken?: string): Promise<FileAccess> {
  if (classToken) {
    const { data, error } = await getSupabase().rpc('student_authorized_resource_path', {
      p_token: classToken,
      p_resource_id: resourceId,
    })
    if (error) throw new Error(error.message)
    const payload = data as { ok?: boolean; error?: string; storage_path?: string; file_name?: string; file_mime?: string }
    if (!payload?.ok || !payload.storage_path) {
      throw new Error(payload?.error ?? 'Resource is not available.')
    }
    return {
      path: payload.storage_path,
      fileName: payload.file_name ?? 'download',
      mime: payload.file_mime ?? 'application/octet-stream',
    }
  }

  const { data, error } = await getSupabase()
    .from('resources')
    .select('storage_path, file_name, file_mime')
    .eq('id', resourceId)
    .maybeSingle()
  if (error || !data?.storage_path) throw new Error('Resource is not available.')
  return {
    path: data.storage_path,
    fileName: data.file_name,
    mime: data.file_mime || 'application/octet-stream',
  }
}

function storageError(message: string): Error {
  const text = message.toLowerCase()
  if (text.includes('bucket')) {
    return new Error('File storage is not set up yet. Run supabase/migrations/005_storage_downloads.sql in the SQL editor.')
  }
  if (
    text.includes('row-level')
    || text.includes('unauthorized')
    || text.includes('permission')
    || text.includes('not found')
    || text.includes('jwt')
  ) {
    return new Error('Download was blocked. Run supabase/migrations/007_download_access.sql in the SQL editor, then try again.')
  }
  return new Error(message || 'Download is not available.')
}

async function blobFromStorage(path: string): Promise<Blob> {
  const downloaded = await getSupabase().storage.from('class-files').download(path)
  if (downloaded.data) return downloaded.data

  const signed = await getSupabase().storage.from('class-files').createSignedUrl(path, 120, { download: true })
  if (signed.data?.signedUrl) {
    const response = await fetch(signed.data.signedUrl)
    if (response.ok) return response.blob()
  }

  throw storageError(downloaded.error?.message ?? signed.error?.message ?? 'Download is not available.')
}

async function signedDownloadUrl(access: FileAccess, resourceId: string, classToken?: string): Promise<string | null> {
  try {
    const headers: Record<string, string> = {}
    if (classToken) headers['x-class-session'] = classToken
    const result = await invokeFunction<{ ok: boolean; url?: string; error?: string }>(
      'create-signed-url',
      { resource_id: resourceId },
      headers,
    )
    if (result.ok && result.url) {
      const url = new URL(result.url)
      if (!url.searchParams.has('download')) url.searchParams.set('download', access.fileName)
      return url.toString()
    }
  } catch {
    /* The edge function may not be deployed. Storage signing is the fallback. */
  }

  const signed = await getSupabase().storage.from('class-files').createSignedUrl(access.path, 180, {
    download: access.fileName,
  })
  return signed.data?.signedUrl ?? null
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  window.setTimeout(() => {
    link.remove()
    URL.revokeObjectURL(url)
  }, 1500)
}

function isSafariDownload(): boolean {
  const agent = navigator.userAgent
  return /safari/i.test(agent) && !/chrome|chromium|crios|edg|android/i.test(agent)
}

export async function requestSignedUrl(resourceId: string, classToken?: string): Promise<string> {
  const access = await resolveFileAccess(resourceId, classToken)
  const signed = await signedDownloadUrl(access, resourceId, classToken)
  if (signed) return signed
  const blob = await blobFromStorage(access.path)
  return URL.createObjectURL(blob)
}

export async function openResourceDownload(resourceId: string, classToken?: string): Promise<void> {
  const access = await resolveFileAccess(resourceId, classToken)
  const signed = await signedDownloadUrl(access, resourceId, classToken)
  if (signed && isSafariDownload()) {
    window.location.assign(signed)
    return
  }
  if (signed) {
    try {
      const response = await fetch(signed)
      if (response.ok) {
        saveBlob(await response.blob(), access.fileName)
        return
      }
    } catch {
      /* Fall through to a direct storage download. */
    }
  }
  saveBlob(await blobFromStorage(access.path), access.fileName)
}

export async function downloadStoredFile(path: string, fileName: string): Promise<void> {
  const signed = await getSupabase().storage.from('class-files').createSignedUrl(path, 180, { download: fileName })
  if (signed.data?.signedUrl && isSafariDownload()) {
    window.location.assign(signed.data.signedUrl)
    return
  }
  if (signed.data?.signedUrl) {
    try {
      const response = await fetch(signed.data.signedUrl)
      if (response.ok) {
        saveBlob(await response.blob(), fileName)
        return
      }
    } catch {
      /* Fall through to a direct storage download. */
    }
  }
  saveBlob(await blobFromStorage(path), fileName)
}

export async function fetchPreviewText(resourceId: string, classToken?: string): Promise<string> {
  const access = await resolveFileAccess(resourceId, classToken)
  const blob = await blobFromStorage(access.path)
  return blob.text()
}

export async function previewUrl(resourceId: string, classToken?: string): Promise<string> {
  const access = await resolveFileAccess(resourceId, classToken)
  const blob = await blobFromStorage(access.path)
  return URL.createObjectURL(blob)
}
