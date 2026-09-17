import { createWriteStream } from 'node:fs'
import { PNG } from 'pngjs'

const INK = [18, 26, 34, 255]
const PAPER = [238, 241, 244, 255]
const ADMIT = [31, 107, 74, 255]

function setPixel(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return
  const idx = (png.width * y + x) << 2
  png.data[idx] = color[0]
  png.data[idx + 1] = color[1]
  png.data[idx + 2] = color[2]
  png.data[idx + 3] = color[3]
}

function inRoundedRect(px, py, x, y, w, h, r) {
  if (px < x || py < y || px >= x + w || py >= y + h) return false
  const cx = Math.min(Math.max(px, x + r), x + w - r)
  const cy = Math.min(Math.max(py, y + r), y + h - r)
  if (px === cx || py === cy) return true
  const dx = px - cx
  const dy = py - cy
  return dx * dx + dy * dy <= r * r
}

function fillRoundedRect(png, x, y, w, h, r, color) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.ceil(x + w)
  const y1 = Math.ceil(y + h)
  for (let py = y0; py < y1; py += 1) {
    for (let px = x0; px < x1; px += 1) {
      if (inRoundedRect(px + 0.5, py + 0.5, x, y, w, h, r)) setPixel(png, px, py, color)
    }
  }
}

function fillCircle(png, cx, cy, radius, color) {
  const r = Math.ceil(radius)
  for (let py = Math.floor(cy - r); py <= Math.ceil(cy + r); py += 1) {
    for (let px = Math.floor(cx - r); px <= Math.ceil(cx + r); px += 1) {
      const dx = px + 0.5 - cx
      const dy = py + 0.5 - cy
      if (dx * dx + dy * dy <= radius * radius) setPixel(png, px, py, color)
    }
  }
}

function drawDashedLine(png, x, y, height, color, scale) {
  const dash = 16 * scale
  const gap = 14 * scale
  const width = Math.max(2, Math.round(6 * scale))
  let cursor = y
  const end = y + height
  while (cursor < end) {
    const dashEnd = Math.min(cursor + dash, end)
    for (let py = Math.round(cursor); py < Math.round(dashEnd); py += 1) {
      for (let px = Math.round(x - width / 2); px < Math.round(x + width / 2); px += 1) {
        setPixel(png, px, py, color)
      }
    }
    cursor += dash + gap
  }
}

function drawMark(png, origin, size) {
  const s = size / 512
  fillRoundedRect(png, origin, origin, size, size, 112 * s, INK)
  fillRoundedRect(png, origin + 112 * s, origin + 128 * s, 288 * s, 256 * s, 28 * s, PAPER)
  drawDashedLine(png, origin + 208 * s, origin + 128 * s, 256 * s, INK, s)
  fillCircle(png, origin + 208 * s, origin + 128 * s, 22 * s, INK)
  fillCircle(png, origin + 208 * s, origin + 384 * s, 22 * s, INK)
  fillRoundedRect(png, origin + 248 * s, origin + 196 * s, 104 * s, 32 * s, 6 * s, ADMIT)
}

function writePng(path, size, maskable) {
  const png = new PNG({ width: size, height: size })
  if (maskable) {
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = INK[0]
      png.data[i + 1] = INK[1]
      png.data[i + 2] = INK[2]
      png.data[i + 3] = 255
    }
    drawMark(png, Math.round(size * 0.1), Math.round(size * 0.8))
  } else {
    drawMark(png, 0, size)
  }
  return new Promise((resolve, reject) => {
    png
      .pack()
      .pipe(createWriteStream(path))
      .on('finish', resolve)
      .on('error', reject)
  })
}

await writePng('public/pwa-192.png', 192, false)
await writePng('public/pwa-512.png', 512, false)
await writePng('public/pwa-512-maskable.png', 512, true)
await writePng('public/apple-touch-icon.png', 180, false)
