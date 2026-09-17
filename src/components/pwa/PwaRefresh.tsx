import { useEffect, useRef, useState } from 'react'

export function PwaRefresh() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const waiting = useRef<ServiceWorker | null>(null)

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

    let cancelled = false
    let interval = 0

    void navigator.serviceWorker.register('/sw.js').then((reg) => {
      if (cancelled) return
      if (reg.waiting) {
        waiting.current = reg.waiting
        setNeedRefresh(true)
      }
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing
        if (!worker) return
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            waiting.current = worker
            setNeedRefresh(true)
          }
        })
      })
      interval = window.setInterval(() => {
        void reg.update()
      }, 60 * 60 * 1000)
    })

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 border-b border-white/10 bg-ink px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-sm text-white">
      <p className="min-w-0 font-medium">A new Doorlist version is ready.</p>
      <div className="flex shrink-0 gap-3">
        <button
          type="button"
          className="cursor-pointer font-medium text-white/70"
          onClick={() => setNeedRefresh(false)}
        >
          Later
        </button>
        <button
          type="button"
          className="cursor-pointer font-medium text-white"
          onClick={() => {
            waiting.current?.postMessage({ type: 'SKIP_WAITING' })
            window.location.reload()
          }}
        >
          Reload
        </button>
      </div>
    </div>
  )
}
