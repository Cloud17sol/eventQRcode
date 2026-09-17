export function scanVibrate(kind: 'ok' | 'warn') {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  navigator.vibrate(kind === 'ok' ? [40, 30, 40] : [80, 40, 80, 40, 80])
}

export function scanTone(kind: 'ok' | 'warn') {
  const AudioContextClass =
    window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return

  const context = new AudioContextClass()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = kind === 'ok' ? 880 : 220
  gain.gain.value = 0.05
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + (kind === 'ok' ? 0.12 : 0.22))
  oscillator.onended = () => {
    void context.close()
  }
}

export function scanFeedback(kind: 'ok' | 'warn') {
  scanVibrate(kind)
  try {
    scanTone(kind)
  } catch {
    /* audio is optional */
  }
}
