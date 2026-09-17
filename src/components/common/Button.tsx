import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  fullWidth?: boolean
  to?: string
  children: ReactNode
}

const variants: Record<Variant, string> = {
  primary: 'bg-admit text-white hover:bg-admit-hover disabled:bg-admit/40 disabled:text-white/80',
  secondary: 'bg-card text-copy border border-line hover:border-copy/30 disabled:opacity-50',
  ghost: 'bg-transparent text-current hover:bg-white/6 disabled:opacity-50',
  danger: 'bg-danger text-white hover:bg-danger/90 disabled:opacity-50',
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  to,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  const classes = `inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`

  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  )
}
