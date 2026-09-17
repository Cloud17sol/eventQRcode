import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '@/components/common/Button'

type QrCameraProps = {
  paused: boolean
  onDecode: (value: string) => void
}

type Phase = 'idle' | 'starting' | 'ready' | 'blocked'

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function cameraMessage(error: unknown) {
  const name = error instanceof Error ? error.name : ''
  const text = error instanceof Error ? error.message : ''
  const denied = name === 'NotAllowedError' || name === 'PermissionDeniedError' || /not allowed|permission/i.test(text)

  if (denied) {
    return isIos()
      ? 'Camera is blocked for this site. Tap AA in the address bar, open Website Settings, set Camera to Allow, then tap Enable camera again.'
      : 'Camera is blocked for this site. Open site settings in the address bar, allow Camera, then tap Enable camera again.'
  }

  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera found on this device. Use manual check-in.'
  }

  if (name === 'NotReadableError') {
    return 'Another app is using the camera. Close it, then tap Enable camera again.'
  }

  return 'Could not open the camera. Check permission and try again.'
}

export function QrCamera({ paused, onDecode }: QrCameraProps) {
  const regionId = useRef(`qr-reader-${Math.random().toString(36).slice(2, 10)}`).current
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const onDecodeRef = useRef(onDecode)
  const [phase, setPhase] = useState<Phase>(() => (window.isSecureContext ? 'idle' : 'blocked'))
  const [message, setMessage] = useState<string | null>(() =>
    window.isSecureContext
      ? null
      : 'Camera needs a secure page (https). This address is http, so the phone will not turn the camera on. Use manual check-in, or open the scanner from an https link.',
  )

  onDecodeRef.current = onDecode

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current
      if (!scanner) return
      try {
        scanner.stop()
      } catch {
        /* already stopped */
      }
      try {
        scanner.clear()
      } catch {
        /* already cleared */
      }
    }
  }, [])

  useEffect(() => {
    const scanner = scannerRef.current
    if (!scanner || phase !== 'ready') return
    try {
      if (paused) scanner.pause(true)
      else scanner.resume()
    } catch {
      /* scanner may already be stopping */
    }
  }, [paused, phase])

  async function enableCamera() {
    if (!window.isSecureContext) {
      setPhase('blocked')
      setMessage(
        'Camera needs a secure page (https). This address is http, so the phone will not turn the camera on. Use manual check-in, or open the scanner from an https link.',
      )
      return
    }

    setPhase('starting')
    setMessage(null)

    const scanner = scannerRef.current ?? new Html5Qrcode(regionId, { verbose: false })
    scannerRef.current = scanner

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (decoded) => onDecodeRef.current(decoded),
        () => undefined,
      )
      setPhase('ready')
    } catch (firstError) {
      try {
        await scanner.start(
          { facingMode: 'user' },
          { fps: 8, qrbox: { width: 240, height: 240 } },
          (decoded) => onDecodeRef.current(decoded),
          () => undefined,
        )
        setPhase('ready')
      } catch (secondError) {
        setPhase('blocked')
        setMessage(cameraMessage(secondError ?? firstError))
      }
    }
  }

  const showStart = phase === 'idle' || phase === 'blocked'
  const showRetry = phase === 'blocked'

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <div
        id={regionId}
        className="min-h-[320px] overflow-hidden [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
      />
      {phase === 'starting' ? (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <p className="text-sm leading-6 text-white/80">Allow camera when your phone asks.</p>
        </div>
      ) : null}
      {showStart ? (
        <div className="absolute inset-0 grid place-items-center px-6 py-8 text-center">
          <div className="max-w-sm">
            <p className="text-base font-semibold text-white">
              {showRetry ? 'Camera is off' : 'Enable camera'}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/75">
              {message ?? 'Allow camera to scan guest QR codes. Use the back camera. Your phone will ask once.'}
            </p>
            {window.isSecureContext ? (
              <Button className="mt-5" onClick={() => void enableCamera()}>
                {showRetry ? 'Try camera again' : 'Enable camera'}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
