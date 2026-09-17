import QRCode from 'qrcode'
import type { AccessPassDetails } from '@/components/invite/AccessPass'

const INK = '#121A22'
const PAPER = '#FFFFFF'
const MUTED = '#5C6B78'
const LINE = '#D5DCE3'

export async function qrDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    margin: 1,
    width: 360,
    color: {
      dark: INK,
      light: PAPER,
    },
  })
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.click()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let current = words[0]
  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`
    if (ctx.measureText(next).width <= maxWidth) {
      current = next
    } else {
      lines.push(current)
      current = words[i]
    }
  }
  lines.push(current)
  return lines.slice(0, 3)
}

export async function passPngDataUrl(details: AccessPassDetails, credentialUrl: string): Promise<string> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready
  }

  const qr = await qrDataUrl(credentialUrl)
  const qrImage = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load QR image'))
    image.src = qr
  })

  const width = 720
  const padding = 48
  const contentWidth = width - padding * 2
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create pass canvas')

  ctx.font = '600 36px Lexend, sans-serif'
  const eventLines = wrapText(ctx, details.eventName, contentWidth)
  ctx.font = '600 32px Lexend, sans-serif'
  const nameLines = wrapText(ctx, details.guestName, contentWidth)
  ctx.font = '600 22px Lexend, sans-serif'
  const whenLines = wrapText(ctx, details.when, contentWidth)
  const venueLines = wrapText(ctx, details.venue || 'Venue to be announced', contentWidth)
  const place = [details.tableName ? `Table ${details.tableName}` : null, details.category].filter(Boolean).join(' · ')
  const placeLines = place ? wrapText(ctx, place, contentWidth) : []

  const headerHeight = 56 + eventLines.length * 44 + 28
  const qrSize = 360
  const bodyTop = headerHeight + 48
  const height =
    bodyTop +
    nameLines.length * 38 +
    36 +
    28 +
    whenLines.length * 28 +
    28 +
    venueLines.length * 28 +
    (placeLines.length ? 28 + placeLines.length * 28 : 0) +
    36 +
    qrSize +
    72

  canvas.width = width
  canvas.height = height
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, width, canvas.height)

  ctx.fillStyle = INK
  ctx.fillRect(0, 0, width, headerHeight)
  ctx.fillStyle = 'rgba(255,255,255,0.62)'
  ctx.font = '500 18px Lexend, sans-serif'
  ctx.fillText('Access pass', padding, 42)
  ctx.fillStyle = PAPER
  ctx.font = '600 36px Lexend, sans-serif'
  eventLines.forEach((line, index) => {
    ctx.fillText(line, padding, 86 + index * 44)
  })

  ctx.strokeStyle = LINE
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.setLineDash([6, 8])
  ctx.moveTo(24, headerHeight)
  ctx.lineTo(width - 24, headerHeight)
  ctx.stroke()
  ctx.setLineDash([])

  let y = bodyTop
  ctx.fillStyle = INK
  ctx.font = '600 32px Lexend, sans-serif'
  nameLines.forEach((line) => {
    ctx.fillText(line, padding, y)
    y += 38
  })
  ctx.fillStyle = MUTED
  ctx.font = '500 20px Lexend, sans-serif'
  ctx.fillText(details.invitationNumber, padding, y)
  y += 40

  const drawBlock = (label: string, lines: string[]) => {
    ctx.fillStyle = MUTED
    ctx.font = '500 16px Lexend, sans-serif'
    ctx.fillText(label, padding, y)
    y += 26
    ctx.fillStyle = INK
    ctx.font = '600 22px Lexend, sans-serif'
    lines.forEach((line) => {
      ctx.fillText(line, padding, y)
      y += 28
    })
    y += 12
  }

  drawBlock('When', whenLines)
  drawBlock('Where', venueLines)
  if (placeLines.length) drawBlock('Place', placeLines)

  const qrX = (width - qrSize) / 2
  ctx.strokeStyle = LINE
  ctx.lineWidth = 2
  ctx.strokeRect(qrX - 16, y, qrSize + 32, qrSize + 32)
  ctx.drawImage(qrImage, qrX, y + 16, qrSize, qrSize)
  y += qrSize + 56

  ctx.fillStyle = MUTED
  ctx.font = '500 16px Lexend, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Show this at the door. Doorlist', width / 2, y)

  return canvas.toDataURL('image/png')
}
