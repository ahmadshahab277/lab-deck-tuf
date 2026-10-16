export type LabDraft = {
  lab_number: number
  title: string
  objectives: string
  instructions: string
  exercises: string
  required_concepts: string
  sample_input: string
  sample_output: string
  printing_requirements: string
  submission_guidelines: string
  assessment_criteria: string
}

export function emptyLabDraft(labNumber = 1): LabDraft {
  return {
    lab_number: labNumber,
    title: '',
    objectives: '',
    instructions: '',
    exercises: '',
    required_concepts: '',
    sample_input: '',
    sample_output: '',
    printing_requirements: '',
    submission_guidelines: '',
    assessment_criteria: '',
  }
}

export function structuredLabTemplate(labNumber: number): LabDraft {
  return {
    lab_number: labNumber,
    title: `Lab ${String(labNumber).padStart(2, '0')}`,
    objectives: 'By the end of this lab, students will be able to:\n1. \n2. \n3. ',
    instructions:
      'Read the problem statements before writing code.\nWork on your own machine or the assigned lab bench.\nSave source files with the required names.\nShow output for every required case.',
    exercises: 'Exercise 1:\n\nExercise 2:\n\nExercise 3:',
    required_concepts: '',
    sample_input: '',
    sample_output: '',
    printing_requirements: 'Print the problem statement, source code, and output. Attach them in order in the practical file.',
    submission_guidelines: 'Bring the printed lab to the next session. This site does not accept file uploads.',
    assessment_criteria: 'Correctness, completeness of output, clarity of code, and timely printed submission.',
  }
}

export function publicAssignmentFields<T extends { admin_notes?: string }>(
  assignment: T,
): Omit<T, 'admin_notes'> {
  const { admin_notes: _adminNotes, ...visible } = assignment
  return visible
}
