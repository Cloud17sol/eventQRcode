import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Button } from '@/components/common/Button'
import { ConfigNotice } from '@/components/common/ConfigNotice'
import { Field, Input } from '@/components/common/Field'
import { Logo } from '@/components/common/Logo'
import { useAuth } from '@/hooks/useAuth'

const schema = z.object({
  fullName: z.string().min(2, 'Enter your name'),
  email: z.string().min(1, 'Enter your email').email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
})

type FormValues = z.infer<typeof schema>

export function SignupPage() {
  const { signUp, configured } = useAuth()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormValues) {
    try {
      await signUp(values.fullName, values.email, values.password)
      toast.success('Account created. If email confirmation is on, check your inbox.')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create account')
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-ink px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Logo inverted to="/signup" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-card p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
          <p className="mt-1 text-sm text-muted">Organizers run events. Staff are assigned after they sign up.</p>
          <div className="mt-5">
            <ConfigNotice />
          </div>
          <form className="mt-6 grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field id="fullName" label="Full name" error={errors.fullName?.message}>
              <Input id="fullName" autoComplete="name" error={Boolean(errors.fullName)} {...register('fullName')} />
            </Field>
            <Field id="email" label="Email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                error={Boolean(errors.email)}
                {...register('email')}
              />
            </Field>
            <Field id="password" label="Password" error={errors.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                error={Boolean(errors.password)}
                {...register('password')}
              />
            </Field>
            <Button type="submit" fullWidth disabled={isSubmitting || !configured}>
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="mt-5 text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-admit hover:text-admit-hover">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
