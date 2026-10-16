const tones = {
  draft: 'bg-[#f3eee4] text-[#7a6240]',
  published: 'bg-pine-soft text-pine',
  archived: 'bg-[#eeeae4] text-muted',
  upcoming: 'bg-[#e8eef6] text-[#31455f]',
  in_progress: 'bg-[#efe8d8] text-brass',
  completed: 'bg-pine-soft text-pine',
  overdue: 'bg-[#f6e6e2] text-danger',
  cancelled: 'bg-[#eeeae4] text-muted',
  high: 'bg-[#f6e6e2] text-danger',
  normal: 'bg-[#eeeae4] text-muted',
  low: 'bg-[#e8eef6] text-[#31455f]',
}

export function Badge({
  value,
  className = '',
}: {
  value: string
  className?: string
}) {
  const tone = tones[value as keyof typeof tones] ?? 'bg-[#eeeae4] text-muted'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${tone} ${className}`}>
      {value.replaceAll('_', ' ')}
    </span>
  )
}
