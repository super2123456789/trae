// 颜色工具：hex <-> rgb <-> Lab，及颜色距离计算

export function hexToRgb(hex) {
  let h = (hex || '').replace('#', '').trim()
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h, 16)
  if (Number.isNaN(n)) return { r: 0, g: 0, b: 0 }
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex(r, g, b) {
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return '#' + c(r) + c(g) + c(b)
}

function srgbToLinear(c) {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

// sRGB D65 -> CIE Lab
export function rgbToLab({ r, g, b }) {
  const R = srgbToLinear(r)
  const G = srgbToLinear(g)
  const B = srgbToLinear(b)
  let X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375
  let Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175
  let Z = R * 0.0193339 + G * 0.119192 + B * 0.9503041
  X /= 0.95047
  Z /= 1.08883
  const f = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = f(X)
  const fy = f(Y)
  const fz = f(Z)
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) }
}

// CIE76 色差（Lab 欧氏距离）
export function labDistance(l1, l2) {
  const dl = l1.L - l2.L
  const da = l1.a - l2.a
  const db = l1.b - l2.b
  return Math.sqrt(dl * dl + da * da + db * db)
}

// RGB 欧氏距离平方
export function rgbDistanceSq(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return dr * dr + dg * dg + db * db
}