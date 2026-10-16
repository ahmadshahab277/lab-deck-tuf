import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  children: ReactNode
}

const variants = {
  primary: 'bg-pine text-white hover:bg-[#c2410c]',
  secondary: 'bg-white text-ink border border-line hover:bg-pine-soft',
  ghost: 'bg-transparent text-ink hover:bg-white/70',
  danger: 'bg-danger text-white hover:bg-[#7a3224]',
}

export function Button({ variant = 'primary', className = '', children, type = 'button', ...props }: Props) {
  return (
    <button
      type={type}
      className={`pressable inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
