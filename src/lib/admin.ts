import { SOP_TEMPLATES } from './sopTemplates'
import { getSupabase } from './supabase'
import { sanitizeFileName, validateUpload } from './preview'
import type {
  Announcement,
  ClassGuideline,
  ClassProgress,
  CourseClass,
  LabTask,
  Resource,
  TaskAssignment,
  TaughtTopic,
} from '../types'

function throwIf(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

export async function loadProfile(userId: string) {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', userId)
    .maybeSingle()
  throwIf(error)
  return data
}

export async function claimAdminProfile() {
  const { data, error } = await getSupabase().rpc('claim_admin_profile')
  if (error) {
    if (error.message.toLowerCase().includes('could not find') || error.code === 'PGRST202') {
      throw new Error('Admin setup SQL has not been run yet. Run supabase/migrations/003_seed_ahmad_admin.sql in the Supabase SQL editor, then sign in again.')
    }
    return null
  }
  const payload = data as { ok?: boolean; profile?: { id: string; email: string; full_name: string; role: 'admin' } }
  if (!payload?.ok || !payload.profile) return null
  return payload.profile
}

export function authErrorMessage(error: { message?: string; code?: string } | null): string {
  const text = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase()
  if (text.includes('email not confirmed') || text.includes('email_not_confirmed')) {
    return 'This email is not confirmed yet. In Supabase Authentication, open the user and confirm it, or turn off “Confirm email” in Auth settings while testing.'
  }
  if (text.includes('invalid login') || text.includes('invalid_credentials')) {
    return 'Email or password is wrong. Use the exact email you created in Supabase Authentication — not the example ahmad@your-domain.edu unless that is the account you actually created.'
  }
  return error?.message || 'Unable to sign in with those credentials.'
}

export async function listClasses(): Promise<CourseClass[]> {
  const { data, error } = await getSupabase()
    .from('classes')
    .select('*')
    .order('updated_at', { ascending: false })
  throwIf(error)
  return (data ?? []) as CourseClass[]
}

export async function getClass(id: string): Promise<CourseClass> {
  const { data, error } = await getSupabase().from('classes').select('*').eq('id', id).single()
  throwIf(error)
  return data as CourseClass
}

export async function createClass(
  input: Omit<CourseClass, 'id' | 'created_at' | 'updated_at' | 'created_by'> & { password: string },
  createdBy: string,
): Promise<CourseClass> {
  const { password, ...fields } = input
  const { data, error } = await getSupabase()
    .from('classes')
    .insert({ ...fields, created_by: createdBy })
    .select('*')
    .single()
  throwIf(error)
  const created = data as CourseClass
  const { error: passwordError } = await getSupabase().rpc('admin_set_class_password', {
    p_class_id: created.id,
    p_password: password,
  })
  throwIf(passwordError)
  await seedGuidelines(created.id, createdBy)
  await getSupabase().from('class_progress').insert({ class_id: created.id, updated_by: createdBy })
  return created
}

export async function updateClass(id: string, patch: Partial<CourseClass>): Promise<void> {
  const { error } = await getSupabase().from('classes').update(patch).eq('id', id)
  throwIf(error)
}

export async function deleteClass(id: string): Promise<void> {
  const { data: files } = await getSupabase().from('resources').select('storage_path').eq('class_id', id)
  const { error } = await getSupabase().from('classes').delete().eq('id', id)
  throwIf(error)
  if (files?.length) {
    await getSupabase().storage.from('class-files').remove(files.map((file) => file.storage_path))
  }
}

export async function duplicateClass(source: CourseClass, createdBy: string, password: string): Promise<CourseClass> {
  const copy = await createClass(
    {
      slug: `${source.slug}-copy`,
      title: `${source.title} (Copy)`,
      course_code: source.course_code,
      semester: source.semester,
      section: source.section,
      academic_year: source.academic_year,
      timezone: source.timezone,
      outline: source.outline,
      submission_guidelines: source.submission_guidelines,
      status: 'draft',
      password,
    },
    createdBy,
  )

  const { data: labs } = await getSupabase().from('lab_tasks').select('*').eq('class_id', source.id)
  if (labs?.length) {
    await getSupabase().from('lab_tasks').insert(
      labs.map((lab) => ({
        class_id: copy.id,
        lab_number: lab.lab_number,
        title: lab.title,
        objectives: lab.objectives,
        instructions: lab.instructions,
        exercises: lab.exercises,
        required_concepts: lab.required_concepts,
        sample_input: lab.sample_input,
        sample_output: lab.sample_output,
        deadline: lab.deadline,
        printing_requirements: lab.printing_requirements,
        submission_guidelines: lab.submission_guidelines,
        assessment_criteria: lab.assessment_criteria,
        status: 'draft',
        created_by: createdBy,
      })),
    )
  }
  return copy
}

async function seedGuidelines(classId: string, userId: string): Promise<void> {
  await getSupabase().from('class_guidelines').insert(
    SOP_TEMPLATES.map((template) => ({
      class_id: classId,
      template_key: template.key,
      title: template.title,
      body: template.body,
      is_override: false,
      status: 'published',
      updated_by: userId,
    })),
  )
}

export async function setClassPassword(classId: string, password: string): Promise<void> {
  const { data, error } = await getSupabase().rpc('admin_set_class_password', {
    p_class_id: classId,
    p_password: password,
  })
  throwIf(error)
  const result = data as { ok?: boolean; error?: string }
  if (result && result.ok === false) throw new Error(result.error ?? 'Unable to update password.')
}

export async function revokeClassAccess(classId: string, disable: boolean): Promise<void> {
  const { error } = await getSupabase().rpc('admin_revoke_class_access', {
    p_class_id: classId,
    p_disable: disable,
  })
  throwIf(error)
}

export async function revokeClassSessions(classId: string): Promise<void> {
  const { error } = await getSupabase().rpc('admin_revoke_sessions', { p_class_id: classId })
  throwIf(error)
}

export async function listResources(classId?: string): Promise<Resource[]> {
  let query = getSupabase().from('resources').select('*').order('created_at', { ascending: false })
  if (classId) query = query.eq('class_id', classId)
  const { data, error } = await query
  throwIf(error)
  return (data ?? []) as Resource[]
}

export async function uploadResource(input: {
  classId: string
  title: string
  description: string
  resource_type: Resource['resource_type']
  topic: string
  week_number: number | null
  lecture_number: number | null
  related_lab_id: string | null
  status: Resource['status']
  file: File
  createdBy: string
  replacesId?: string | null
}): Promise<Resource> {
  const validation = validateUpload(input.file)
  if (validation) throw new Error(validation)

  const id = crypto.randomUUID()
  const storagePath = `${input.classId}/${id}/${sanitizeFileName(input.file.name)}`
  const { error: uploadError } = await getSupabase().storage.from('class-files').upload(storagePath, input.file, {
    contentType: input.file.type || 'application/octet-stream',
    upsert: false,
  })
  if (uploadError) {
    const message = uploadError.message.toLowerCase()
    if (message.includes('bucket not found') || message.includes('not found')) {
      throw new Error('File storage is not set up yet. Run supabase/migrations/005_storage_downloads.sql in the SQL editor, then try again.')
    }
    if (message.includes('row-level security') || message.includes('unauthorized') || message.includes('security')) {
      throw new Error('Upload was blocked. Confirm you are signed in as an admin, then run 005_storage_downloads.sql.')
    }
    throw new Error(uploadError.message)
  }

  let version = 1
  if (input.replacesId) {
    const { data: previous } = await getSupabase()
      .from('resources')
      .select('version')
      .eq('id', input.replacesId)
      .maybeSingle()
    version = (previous?.version ?? 1) + 1
    await getSupabase().from('resources').update({ is_current: false }).eq('id', input.replacesId)
  }

  const { data, error } = await getSupabase()
    .from('resources')
    .insert({
      id,
      class_id: input.classId,
      title: input.title,
      description: input.description,
      resource_type: input.resource_type,
      topic: input.topic,
      week_number: input.week_number,
      lecture_number: input.lecture_number,
      related_lab_id: input.related_lab_id,
      file_name: input.file.name,
      file_mime: input.file.type || 'application/octet-stream',
      file_size: input.file.size,
      storage_path: storagePath,
      version,
      is_current: true,
      replaces_id: input.replacesId ?? null,
      status: input.status,
      created_by: input.createdBy,
    })
    .select('*')
    .single()
  throwIf(error)
  return data as Resource
}

export async function updateResource(id: string, patch: Partial<Resource>): Promise<void> {
  const { error } = await getSupabase().from('resources').update(patch).eq('id', id)
  throwIf(error)
}

export async function deleteResource(resource: Resource): Promise<void> {
  const { error } = await getSupabase().from('resources').delete().eq('id', resource.id)
  throwIf(error)
  await getSupabase().storage.from('class-files').remove([resource.storage_path])
}

export async function listLabs(classId?: string): Promise<LabTask[]> {
  let query = getSupabase().from('lab_tasks').select('*').order('lab_number')
  if (classId) query = query.eq('class_id', classId)
  const { data, error } = await query
  throwIf(error)
  return (data ?? []) as LabTask[]
}

export async function saveLab(lab: Partial<LabTask> & { class_id: string; created_by: string }): Promise<LabTask> {
  if (lab.id) {
    const { data, error } = await getSupabase().from('lab_tasks').update(lab).eq('id', lab.id).select('*').single()
    throwIf(error)
    return data as LabTask
  }
  const { data, error } = await getSupabase().from('lab_tasks').insert(lab).select('*').single()
  throwIf(error)
  return data as LabTask
}

export async function deleteLab(id: string): Promise<void> {
  const { error } = await getSupabase().from('lab_tasks').delete().eq('id', id)
  throwIf(error)
}

export async function listAssignments(classId?: string): Promise<TaskAssignment[]> {
  let query = getSupabase().from('task_assignments').select('*').order('created_at', { ascending: false })
  if (classId) query = query.eq('class_id', classId)
  const { data, error } = await query
  throwIf(error)
  return (data ?? []) as TaskAssignment[]
}

export async function saveAssignment(
  assignment: Partial<TaskAssignment> & { class_id: string; created_by: string },
): Promise<TaskAssignment> {
  if (assignment.id) {
    const { data, error } = await getSupabase()
      .from('task_assignments')
      .update(assignment)
      .eq('id', assignment.id)
      .select('*')
      .single()
    throwIf(error)
    return data as TaskAssignment
  }
  const { data, error } = await getSupabase().from('task_assignments').insert(assignment).select('*').single()
  throwIf(error)
  return data as TaskAssignment
}

export async function deleteAssignment(id: string): Promise<void> {
  const { error } = await getSupabase().from('task_assignments').delete().eq('id', id)
  throwIf(error)
}

export async function listAnnouncements(classId?: string): Promise<Announcement[]> {
  let query = getSupabase().from('announcements').select('*').order('created_at', { ascending: false })
  if (classId) query = query.eq('class_id', classId)
  const { data, error } = await query
  throwIf(error)
  return (data ?? []) as Announcement[]
}

function normalizeLink(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export async function publishAnnouncement(input: {
  classId: string
  createdBy: string
  assigneeName: string
  title: string
  description: string
  linkUrl: string
  file: File | null
}): Promise<Announcement> {
  const link = normalizeLink(input.linkUrl)
  if (link) {
    try {
      const url = new URL(link)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('bad protocol')
    } catch {
      throw new Error('Enter a valid link, or leave the link blank.')
    }
  }
  if (input.file) {
    const invalid = validateUpload(input.file)
    if (invalid) throw new Error(invalid)
  }

  const id = crypto.randomUUID()
  const attachmentPath = input.file ? `announcements/${input.classId}/${id}/${sanitizeFileName(input.file.name)}` : ''
  if (input.file) {
    const { error: uploadError } = await getSupabase().storage.from('class-files').upload(attachmentPath, input.file, {
      contentType: input.file.type || 'application/octet-stream',
      upsert: false,
    })
    if (uploadError) throw new Error(uploadError.message)
  }

  const { data, error } = await getSupabase()
    .from('announcements')
    .insert({
      id,
      class_id: input.classId,
      title: input.title.trim(),
      body: input.description.trim(),
      assignee_name: input.assigneeName.trim(),
      link_url: link,
      attachment_path: attachmentPath,
      attachment_name: input.file?.name ?? '',
      attachment_mime: input.file?.type || (input.file ? 'application/octet-stream' : ''),
      status: 'published',
      pinned: false,
      created_by: input.createdBy,
      published_at: new Date().toISOString(),
    })
    .select('*')
    .single()
  if (error) {
    if (attachmentPath) await getSupabase().storage.from('class-files').remove([attachmentPath])
    const text = error.message.toLowerCase()
    if (text.includes('assignee_name') || text.includes('schema cache') || text.includes('link_url')) {
      throw new Error('Announcement fields are not set up yet. Run supabase/migrations/008_announcement_assignments.sql in the SQL editor, then try again.')
    }
    throw new Error(error.message)
  }
  return data as Announcement
}

export async function saveAnnouncement(
  item: Partial<Announcement> & { class_id: string; created_by: string },
): Promise<Announcement> {
  const payload = {
    ...item,
    published_at: item.status === 'published' ? item.published_at ?? new Date().toISOString() : item.published_at,
  }
  if (item.id) {
    const { data, error } = await getSupabase()
      .from('announcements')
      .update(payload)
      .eq('id', item.id)
      .select('*')
      .single()
    throwIf(error)
    return data as Announcement
  }
  const { data, error } = await getSupabase().from('announcements').insert(payload).select('*').single()
  throwIf(error)
  return data as Announcement
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { data } = await getSupabase().from('announcements').select('attachment_path').eq('id', id).maybeSingle()
  const { error } = await getSupabase().from('announcements').delete().eq('id', id)
  throwIf(error)
  if (data?.attachment_path) {
    await getSupabase().storage.from('class-files').remove([data.attachment_path])
  }
}

export async function listGuidelines(classId: string): Promise<ClassGuideline[]> {
  const { data, error } = await getSupabase()
    .from('class_guidelines')
    .select('*')
    .eq('class_id', classId)
    .order('title')
  throwIf(error)
  return (data ?? []) as ClassGuideline[]
}

export async function saveGuideline(item: Partial<ClassGuideline> & { class_id: string }): Promise<void> {
  if (item.id) {
    const { error } = await getSupabase().from('class_guidelines').update(item).eq('id', item.id)
    throwIf(error)
    return
  }
  const { error } = await getSupabase().from('class_guidelines').insert(item)
  throwIf(error)
}

export async function getProgress(classId: string): Promise<ClassProgress | null> {
  const { data, error } = await getSupabase().from('class_progress').select('*').eq('class_id', classId).maybeSingle()
  throwIf(error)
  return data as ClassProgress | null
}

export async function saveProgress(progress: ClassProgress): Promise<void> {
  const { error } = await getSupabase()
    .from('class_progress')
    .upsert({ ...progress, updated_at: new Date().toISOString() })
  throwIf(error)
}

export async function listTaughtTopics(classId: string): Promise<TaughtTopic[]> {
  const { data, error } = await getSupabase()
    .from('taught_topics')
    .select('*')
    .eq('class_id', classId)
    .order('taught_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  throwIf(error)
  return (data ?? []) as TaughtTopic[]
}

export async function addTaughtTopic(topic: Omit<TaughtTopic, 'id' | 'created_at'>): Promise<void> {
  const { error } = await getSupabase().from('taught_topics').insert(topic)
  throwIf(error)
}

export async function deleteTaughtTopic(id: string): Promise<void> {
  const { error } = await getSupabase().from('taught_topics').delete().eq('id', id)
  throwIf(error)
}

export async function storageEstimate(): Promise<number> {
  const { data, error } = await getSupabase().from('resources').select('file_size')
  throwIf(error)
  return (data ?? []).reduce((sum, row) => sum + (row.file_size ?? 0), 0)
}
