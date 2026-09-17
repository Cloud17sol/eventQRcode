import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

type FieldProps = {
  id: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
}

export function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-copy">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

const controlClass =
  'w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm text-copy placeholder:text-muted/80 transition-colors duration-200 focus:border-admit'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean
}

export function Input({ className = '', error, ...props }: InputProps) {
  return (
    <input
      className={`${controlClass} ${error ? 'border-danger' : ''} ${className}`}
      aria-invalid={error || undefined}
      {...props}
    />
  )
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean
}

export function Select({ className = '', error, children, ...props }: SelectProps) {
  return (
    <select
      className={`${controlClass} ${error ? 'border-danger' : ''} ${className}`}
      aria-invalid={error || undefined}
      {...props}
    >
      {children}
    </select>
  )
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean
}

export function Textarea({ className = '', error, ...props }: TextareaProps) {
  return (
    <textarea
      className={`${controlClass} min-h-28 resize-y ${error ? 'border-danger' : ''} ${className}`}
      aria-invalid={error || undefined}
      {...props}
    />
  )
}
