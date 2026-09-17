import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Button } from '@/components/common/Button'
import { ConfigNotice } from '@/components/common/ConfigNotice'
import { Field, Input } from '@/components/common/Field'
import { Logo } from '@/components/common/Logo'
import { useAuth } from '@/hooks/useAuth'

const schema = z.object({
  email: z.string().min(1, 'Enter your email').email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { signIn, configured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormValues) {
    try {
      await signIn(values.email, values.password)
      navigate(from, { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sign in')
    }
  }

  return (
    <div className="grid min-h-dvh bg-ink lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden px-12 py-12 text-white lg:flex lg:flex-col">
        <Logo inverted to="/login" />
        <div className="relative z-10 my-auto max-w-md">
          <p className="text-sm font-medium text-white/55">Guest access control</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Know who is invited, and who has already come through the door.
          </h1>
          <p className="mt-5 text-base leading-7 text-white/70">
            Doorlist is the organizer ledger for invitations, RSVPs, and gate admission. QR codes are a credential, not the product.
          </p>
        </div>
        <p className="relative z-10 text-xs text-white/40">Milestone 1 · Events foundation</p>
        <div className="pointer-events-none absolute -right-24 top-24 h-80 w-80 rounded-full bg-admit/30 blur-3xl" />
      </section>

      <section className="flex min-h-dvh w-full items-center justify-center bg-paper px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo to="/login" />
          </div>
          <div className="rounded-2xl border border-line bg-card p-6 shadow-[0_16px_40px_-28px_rgba(18,26,34,0.5)] sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="mt-1 text-sm text-muted">Open your event ledger.</p>
            <div className="mt-5">
              <ConfigNotice />
            </div>
            <form className="mt-6 grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
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
                  autoComplete="current-password"
                  error={Boolean(errors.password)}
                  {...register('password')}
                />
              </Field>
              <Button type="submit" fullWidth disabled={isSubmitting || !configured}>
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
            <p className="mt-5 text-sm text-muted">
              Need an account?{' '}
              <Link to="/signup" className="font-medium text-admit hover:text-admit-hover">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
