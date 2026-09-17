import { useMemo, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/common/Button'
import { ConfigNotice } from '@/components/common/ConfigNotice'
import { Field, Input } from '@/components/common/Field'
import { Logo } from '@/components/common/Logo'
import { useOpenEventRegistration } from '@/hooks/useRegistration'
import { isSupabaseConfigured } from '@/lib/supabase'
import { registerForEvent } from '@/services/registrationService'
import { formatEventWhen } from '@/utils/dates'

const schema = z.object({
  name: z.string().min(2, 'Enter your name'),
  email: z.string().min(1, 'Enter your email').email('Enter a valid email'),
  phone: z.string().min(7, 'Enter a phone number'),
})

type FormValues = z.infer<typeof schema>

const CLOSED_COPY: Record<string, { title: string; body: string }> = {
  unknown: {
    title: 'Registration not found',
    body: 'This link is invalid or the event no longer exists.',
  },
  closed: {
    title: 'Registration is closed',
    body: 'The organizer is not accepting new names on this link.',
  },
  event_cancelled: {
    title: 'This event has been cancelled',
    body: 'The organizer cancelled the event attached to this link.',
  },
}

export function RegisterPage() {
  const { registerToken } = useParams()
  const token = registerToken ? decodeURIComponent(registerToken) : ''
  const { data, isLoading, isError, error } = useOpenEventRegistration(token || undefined)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const venue = useMemo(() => {
    if (!data) return ''
    return [data.venue_name, data.address, data.city, data.state, data.country].filter(Boolean).join(', ')
  }, [data])

  const submit = useMutation({
    mutationFn: (values: FormValues) => registerForEvent(token, values.name, values.email, values.phone),
    onSuccess: (result) => {
      if (result.status === 'ok') {
        toast.success("You're on the list")
        return
      }
      if (result.status === 'already_registered') {
        toast.success("You're already on this list")
        return
      }
      toast.error(registerError(result.status))
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not register')
    },
  })

  if (!isSupabaseConfigured) {
    return (
      <RegisterShell>
        <ConfigNotice />
      </RegisterShell>
    )
  }

  if (isLoading) {
    return (
      <RegisterShell>
        <div className="h-80 animate-pulse rounded-2xl bg-line/70" />
      </RegisterShell>
    )
  }

  if (isError) {
    return (
      <RegisterShell>
        <ClosedCard
          title="Unable to open registration"
          body={error instanceof Error ? error.message : 'Try this link again in a moment.'}
        />
      </RegisterShell>
    )
  }

  const closed = data?.status && data.status !== 'ok' ? CLOSED_COPY[data.status] : null
  if (!data || closed) {
    return (
      <RegisterShell>
        <ClosedCard title={closed?.title ?? 'Registration not found'} body={closed?.body ?? ''} />
      </RegisterShell>
    )
  }

  const done = submit.isSuccess && (submit.data?.status === 'ok' || submit.data?.status === 'already_registered')

  return (
    <RegisterShell>
      <article className="overflow-hidden rounded-2xl border border-line bg-card shadow-[0_16px_40px_-28px_rgba(18,26,34,0.5)]">
        {data.cover_image_url ? (
          <img src={data.cover_image_url} alt="" className="h-40 w-full object-cover sm:h-52" />
        ) : (
          <div className="bg-ink px-6 py-8 text-white">
            <p className="text-xs font-medium tracking-[0.18em] text-white/55 uppercase">Register</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{data.event_name}</h1>
          </div>
        )}

        <div className="ticket-stub px-6 py-6 sm:px-8">
          {data.cover_image_url ? (
            <>
              <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Register</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">{data.event_name}</h1>
            </>
          ) : null}

          <dl className="mt-6 grid gap-4 text-sm">
            <div>
              <dt className="text-muted">When</dt>
              <dd className="mt-1 font-medium text-copy">
                {formatEventWhen(data.event_date, data.start_time, data.end_time)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Where</dt>
              <dd className="mt-1 font-medium text-copy">{venue || 'Venue to be announced'}</dd>
            </div>
          </dl>

          {data.description ? <p className="mt-6 text-sm leading-6 text-copy">{data.description}</p> : null}

          {done ? (
            <div className="mt-8 border-t border-line pt-6">
              <h2 className="text-base font-semibold">You're on the list</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                The organizer has your name. They will send your invitation separately.
              </p>
            </div>
          ) : (
            <form className="mt-8 grid gap-4 border-t border-line pt-6" onSubmit={handleSubmit((values) => submit.mutate(values))} noValidate>
              <h2 className="text-base font-semibold">Your details</h2>
              <p className="text-sm text-muted">Name, email, and phone. The organizer will add table and category later.</p>
              <Field id="name" label="Full name" error={errors.name?.message}>
                <Input id="name" autoComplete="name" error={Boolean(errors.name)} {...register('name')} />
              </Field>
              <Field id="email" label="Email" error={errors.email?.message}>
                <Input id="email" type="email" autoComplete="email" error={Boolean(errors.email)} {...register('email')} />
              </Field>
              <Field id="phone" label="Phone" error={errors.phone?.message}>
                <Input id="phone" type="tel" autoComplete="tel" error={Boolean(errors.phone)} {...register('phone')} />
              </Field>
              <Button type="submit" fullWidth disabled={submit.isPending}>
                {submit.isPending ? 'Saving…' : 'Register'}
              </Button>
            </form>
          )}
        </div>
      </article>
    </RegisterShell>
  )
}

function RegisterShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6">
          <Logo />
        </div>
        {children}
      </div>
    </div>
  )
}

function ClosedCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-6 py-10 text-center">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
    </div>
  )
}

function registerError(status: string) {
  if (status === 'invalid_name') return 'Enter your name.'
  if (status === 'invalid_email') return 'Enter a valid email.'
  if (status === 'invalid_phone') return 'Enter a phone number.'
  if (status === 'closed') return 'Registration is closed for this event.'
  if (status === 'event_full') return 'This event is full.'
  if (status === 'event_cancelled') return 'This event has been cancelled.'
  return 'Could not register.'
}
