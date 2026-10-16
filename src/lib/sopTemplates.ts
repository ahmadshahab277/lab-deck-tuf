export type SopTemplate = {
  key: string
  title: string
  body: string
}

export const SOP_TEMPLATES: SopTemplate[] = [
  {
    key: 'lab_rules',
    title: 'Laboratory rules',
    body: 'Arrive on time with the printed practical file. Follow bench safety, keep bags away from machines, and do not share login credentials. Ask before using removable media. Leave the lab as you found it.',
  },
  {
    key: 'file_format',
    title: 'Practical-file formatting',
    body: 'Use A4 pages, 1-inch margins, 11–12 pt body text, and a consistent monospaced font for source code. Number every page. Each problem starts on a new page unless the instructor says otherwise.',
  },
  {
    key: 'cover_page',
    title: 'Cover page requirements',
    body: 'The cover page must include university name, course title and code, lab number, student name and registration number, section, and submission date. Leave space for instructor signature and marks.',
  },
  {
    key: 'problem_code',
    title: 'Problem statements and source code',
    body: 'Copy the assigned problem statement first. Then attach clean, commented source code. Do not crop screenshots so tightly that identifiers or output disappear.',
  },
  {
    key: 'output_evidence',
    title: 'Required output and evidence',
    body: 'Include compiled output or runtime evidence for every required case. If a program cannot run, write a short explanation. Fake or reused output is treated as academic misconduct.',
  },
  {
    key: 'page_order',
    title: 'Page ordering and numbering',
    body: 'Order: cover page, index, then labs in number order. Each lab should contain objectives, problem statement, code, output, and conclusion. Number pages continuously through the file.',
  },
  {
    key: 'printing',
    title: 'Printing and binding',
    body: 'Print single-sided unless told otherwise. Use readable contrast. Staple or spiral-bind as specified for the class. Do not submit loose sheets.',
  },
  {
    key: 'physical_deadline',
    title: 'Physical submission deadlines',
    body: 'Printed work is due at the start of the listed lab or class. Late files need prior written approval. Digital copies on this site are for reading only and do not count as submission.',
  },
  {
    key: 'end_semester',
    title: 'End-of-semester lab compilation',
    body: 'Compile every published lab into one practical file. Include the index, all marked work, and any makeup labs. Submit the compiled file on the date announced for the section.',
  },
]
