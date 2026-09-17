import { isSupabaseConfigured } from '@/lib/supabase'

export function ConfigNotice() {
  if (isSupabaseConfigured) return null

  return (
    <div className="rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-sm leading-6 text-copy">
      Connect a Supabase project first. Copy <code className="font-medium">.env.example</code> to{' '}
      <code className="font-medium">.env</code>, then run the SQL migration in the{' '}
      <code className="font-medium">supabase/migrations</code> folder.
    </div>
  )
}
