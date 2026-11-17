import QRCode from 'qrcode'
import type { AccessPassDetails } from '@/components/invite/AccessPass'
import { normalizePassColor, passGold, passInk, passMuted } from '@/utils/passTheme'

const INK = '#121A22'
const PAPER = '#FFFFFF'

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

function loadImage(src: string, cors = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    if (cors) image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load image'))
    image.src = src
  })
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

function drawScanFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  gold: string,
  ink: string,
  qrImage: HTMLImageElement,
) {
  ctx.fillStyle = ink
  ctx.font = '500 13px Lexend, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('SCAN ME', x + size / 2, y + 16)
  ctx.fillText('SCAN ME', x + size / 2, y + size - 16)

  const drawSide = (cx: number, cy: number, angle: number) => {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)
    ctx.fillText('SCAN ME', 0, 0)
    ctx.restore()
  }
  drawSide(x + 16, y + size / 2, -Math.PI / 2)
  drawSide(x + size - 16, y + size / 2, Math.PI / 2)

  const m = 28
  const c = 22
  ctx.strokeStyle = gold
  ctx.lineWidth = 4
  ctx.lineCap = 'square'
  const corners: Array<[number, number, number, number, number, number]> = [
    [x + m, y + m + c, x + m, y + m, x + m + c, y + m],
    [x + size - m - c, y + m, x + size - m, y + m, x + size - m, y + m + c],
    [x + m, y + size - m - c, x + m, y + size - m, x + m + c, y + size - m],
    [x + size - m, y + size - m - c, x + size - m, y + size - m, x + size - m - c, y + size - m],
  ]
  corners.forEach(([x1, y1, x2, y2, x3, y3]) => {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.lineTo(x3, y3)
    ctx.stroke()
  })

  const inset = 48
  ctx.fillStyle = PAPER
  ctx.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2)
  ctx.drawImage(qrImage, x + inset, y + inset, size - inset * 2, size - inset * 2)
}

export async function passPngDataUrl(details: AccessPassDetails, credentialUrl: string): Promise<string> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready
  }

  const background = normalizePassColor(details.backgroundColor)
  const ink = passInk(background)
  const muted = passMuted(background)
  const gold = passGold(background)

  const qr = await qrDataUrl(credentialUrl)
  const qrImage = await loadImage(qr)
  let logoImage: HTMLImageElement | null = null
  if (details.logoUrl) {
    try {
      logoImage = await loadImage(details.logoUrl, true)
    } catch {
      logoImage = null
    }
  }

  const width = 720
  const padding = 56
  const contentWidth = width - padding * 2
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create pass canvas')

  ctx.font = '600 40px Lexend, sans-serif'
  const eventLines = wrapText(ctx, details.eventName, contentWidth)
  const detailWidth = 280
  ctx.font = '600 22px Lexend, sans-serif'
  const whenLines = wrapText(ctx, details.when, detailWidth)
  const venueLines = wrapText(ctx, details.venue || 'Venue to be announced', detailWidth)
  const place = [details.tableName ? `Table ${details.tableName}` : null, details.category].filter(Boolean).join(' · ')
  const placeLines = place ? wrapText(ctx, place, detailWidth) : []

  const logoHeight = logoImage ? 88 : 0
  const frameSize = 300
  const detailsHeight =
    22 +
    whenLines.length * 28 +
    36 +
    venueLines.length * 28 +
    (placeLines.length ? 36 + placeLines.length * 28 : 0)
  const rowHeight = Math.max(frameSize, detailsHeight)
  const height =
    padding +
    logoHeight +
    (logoImage ? 28 : 0) +
    22 +
    eventLines.length * 48 +
    36 +
    48 +
    rowHeight +
    72

  canvas.width = width
  canvas.height = height
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)

  let y = padding
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  if (logoImage) {
    const maxW = 200
    const maxH = 88
    const scale = Math.min(maxW / logoImage.width, maxH / logoImage.height, 1)
    const w = logoImage.width * scale
    const h = logoImage.height * scale
    ctx.drawImage(logoImage, (width - w) / 2, y, w, h)
    y += h + 28
  }

  ctx.fillStyle = muted
  ctx.font = '500 14px Lexend, sans-serif'
  ctx.fillText('ACCESS PASS', width / 2, y)
  y += 36

  ctx.fillStyle = ink
  ctx.font = '600 40px Lexend, sans-serif'
  eventLines.forEach((line) => {
    ctx.fillText(line, width / 2, y)
    y += 48
  })
  y += 12
  ctx.fillStyle = muted
  ctx.font = '500 18px Lexend, sans-serif'
  ctx.fillText(details.invitationNumber, width / 2, y)
  y += 56

  const frameX = padding
  drawScanFrame(ctx, frameX, y, frameSize, gold, ink, qrImage)

  let textY = y + 28
  const textX = width - padding - detailWidth
  const drawBlock = (label: string, lines: string[]) => {
    ctx.textAlign = 'left'
    ctx.fillStyle = muted
    ctx.font = '500 13px Lexend, sans-serif'
    ctx.fillText(label.toUpperCase(), textX, textY)
    textY += 26
    ctx.fillStyle = ink
    ctx.font = '600 22px Lexend, sans-serif'
    lines.forEach((line) => {
      ctx.fillText(line, textX, textY)
      textY += 28
    })
    textY += 16
  }
  drawBlock('When', whenLines)
  drawBlock('Where', venueLines)
  if (placeLines.length) drawBlock('Place', placeLines)

  y += rowHeight + 40
  ctx.textAlign = 'center'
  ctx.fillStyle = muted
  ctx.font = '500 16px Lexend, sans-serif'
  ctx.fillText('Show this at the door', width / 2, y)

  return canvas.toDataURL('image/png')
}
