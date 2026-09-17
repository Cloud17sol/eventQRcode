import { useState } from 'react'
import { isAppleTouchDevice, isStandaloneDisplay } from '@/utils/pwa'

const DISMISS_KEY = 'doorlist-install-hint'

export function InstallHint() {
  const [visible, setVisible] = useState(() => {
    if (isStandaloneDisplay()) return false
    return sessionStorage.getItem(DISMISS_KEY) !== '1'
  })

  if (!visible) return null

  const ios = isAppleTouchDevice()

  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">Install for the door</p>
          <p className="mt-1 text-xs leading-5 text-white/70">
            {ios
              ? 'On iPhone, tap Share, then Add to Home Screen. Open Doorlist from there for a full-screen scanner.'
              : 'Add Doorlist to the home screen for a full-screen scanner that starts faster at the gate.'}
          </p>
        </div>
        <button
          type="button"
          className="cursor-pointer shrink-0 text-xs font-medium text-white/70"
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, '1')
            setVisible(false)
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
