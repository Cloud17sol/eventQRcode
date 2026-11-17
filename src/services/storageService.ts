import { isSupabaseConfigured, supabase } from '@/lib/supabase'

const BUCKET = 'event-assets'
const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

function requireConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Connect Supabase before uploading a logo.')
  }
}

function extensionFor(file: File) {
  const fromType = ALLOWED_TYPES[file.type]
  if (fromType) return fromType
  const name = file.name.toLowerCase()
  if (name.endsWith('.png')) return 'png'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'jpg'
  if (name.endsWith('.webp')) return 'webp'
  return null
}

export async function uploadEventLogo(eventId: string, file: File): Promise<string> {
  requireConfigured()
  if (file.size > MAX_BYTES) {
    throw new Error('Logo must be 2MB or smaller.')
  }
  const ext = extensionFor(file)
  if (!ext) {
    throw new Error('Use a PNG, JPG, or WebP image.')
  }

  const path = `${eventId}/logo.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    cacheControl: '3600',
  })
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}

export async function removeEventLogo(eventId: string): Promise<void> {
  requireConfigured()
  const { data, error } = await supabase.storage.from(BUCKET).list(eventId)
  if (error) throw new Error(error.message)
  const files = (data ?? []).map((item) => `${eventId}/${item.name}`)
  if (files.length === 0) return
  const { error: removeError } = await supabase.storage.from(BUCKET).remove(files)
  if (removeError) throw new Error(removeError.message)
}
