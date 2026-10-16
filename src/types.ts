export const CLASS_STATUSES = ['draft', 'published', 'archived'] as const
export type ClassStatus = (typeof CLASS_STATUSES)[number]

export const RESOURCE_TYPES = [
  'outline',
  'lecture',
  'lab_manual',
  'slides',
  'code',
  'handout',
  'other',
] as const
export type ResourceType = (typeof RESOURCE_TYPES)[number]

export const PUBLICATION_STATUSES = ['draft', 'published', 'archived'] as const
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number]

export const ASSIGNEE_TYPES = ['individual', 'group', 'class'] as const
export type AssigneeType = (typeof ASSIGNEE_TYPES)[number]

export const ASSIGNMENT_STATUSES = [
  'upcoming',
  'in_progress',
  'completed',
  'overdue',
  'cancelled',
] as const
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number]

export const PRIORITIES = ['low', 'normal', 'high'] as const
export type Priority = (typeof PRIORITIES)[number]

export type AdminProfile = {
  id: string
  email: string
  full_name: string
  role: 'admin'
}

export type CourseClass = {
  id: string
  slug: string
  title: string
  course_code: string
  semester: string
  section: string
  academic_year: string
  timezone: string
  outline: string
  submission_guidelines: string
  status: ClassStatus
  created_by: string
  created_at: string
  updated_at: string
}

export type StudentClass = Pick<
  CourseClass,
  | 'id'
  | 'slug'
  | 'title'
  | 'course_code'
  | 'semester'
  | 'section'
  | 'academic_year'
  | 'timezone'
  | 'outline'
  | 'submission_guidelines'
>

export type Resource = {
  id: string
  class_id: string
  title: string
  description: string
  resource_type: ResourceType
  topic: string
  week_number: number | null
  lecture_number: number | null
  related_lab_id: string | null
  file_name: string
  file_mime: string
  file_size: number
  storage_path: string
  version: number
  is_current: boolean
  replaces_id: string | null
  status: PublicationStatus
  created_by: string
  created_at: string
  updated_at: string
}

export type StudentResource = Omit<
  Resource,
  'class_id' | 'storage_path' | 'is_current' | 'replaces_id' | 'status' | 'created_by' | 'updated_at'
>

export type LabTask = {
  id: string
  class_id: string
  lab_number: number
  title: string
  objectives: string
  instructions: string
  exercises: string
  required_concepts: string
  sample_input: string
  sample_output: string
  deadline: string | null
  printing_requirements: string
  submission_guidelines: string
  assessment_criteria: string
  manual_resource_id: string | null
  status: PublicationStatus
  created_by: string
  created_at: string
  updated_at: string
}

export type StudentLab = Omit<LabTask, 'class_id' | 'status' | 'created_by' | 'created_at' | 'updated_at'>

export type TaskAssignment = {
  id: string
  class_id: string
  title: string
  description: string
  instructions: string
  assignee_type: AssigneeType
  assignee_name: string
  deadline: string | null
  status: AssignmentStatus
  priority: Priority
  related_lab_id: string | null
  related_resource_id: string | null
  why_it_matters: string
  admin_notes: string
  is_published: boolean
  created_by: string
  created_at: string
  updated_at: string
  completed_at: string | null
  completed_by: string | null
}

export type StudentAssignment = {
  id: string
  title: string
  description: string
  instructions: string
  assignee_type: AssigneeType
  assignee_name: string
  deadline: string | null
  status: AssignmentStatus
  priority: Priority
  related_lab_id: string | null
  related_resource_id: string | null
  why_it_matters: string
  created_at: string
}

export type Announcement = {
  id: string
  class_id: string
  title: string
  body: string
  assignee_name: string
  link_url: string
  attachment_path: string
  attachment_name: string
  attachment_mime: string
  status: PublicationStatus
  pinned: boolean
  created_by: string
  created_at: string
  updated_at: string
  published_at: string | null
}

export type StudentAnnouncement = {
  id: string
  title: string
  body: string
  assignee_name: string
  link_url: string
  attachment_path: string
  attachment_name: string
  attachment_mime: string
  pinned: boolean
  published_at: string | null
  created_at: string
}

export type ClassGuideline = {
  id: string
  class_id: string
  template_key: string
  title: string
  body: string
  is_override: boolean
  status: PublicationStatus
  updated_by: string | null
  updated_at: string
}

export type StudentGuideline = {
  id: string
  template_key: string
  title: string
  body: string
}

export type ClassProgress = {
  class_id: string
  last_week: number | null
  last_lecture_number: number | null
  last_lab_number: number | null
  last_topic: string
  notes: string
  updated_by: string | null
  updated_at: string
}

export type TaughtTopic = {
  id: string
  class_id: string
  title: string
  week_number: number | null
  taught_on: string | null
  notes: string
  resource_id: string | null
  lab_id: string | null
  created_by: string | null
  created_at: string
}

export type SearchHit = {
  id: string
  kind: 'lab' | 'resource' | 'task' | 'announcement' | 'outline' | 'guideline'
  title: string
  subtitle: string
  href: string
}

export type VerifyResult =
  | { ok: true; token: string; expires_at: string }
  | { ok: false; error: string }

export type TimetableSlot = {
  id: string
  owner_id: string
  day_of_week: number
  start_time: string
  end_time: string
  title: string
  course_code: string
  room: string
  section: string
  class_id: string | null
  created_at: string
}

export type TimetableSource = {
  owner_id: string
  storage_path: string
  file_name: string
  slot_count: number
  updated_at: string
}

export type ClassAccessSettings = {
  class_id: string
  password_updated_at: string
  access_enabled: boolean
}
