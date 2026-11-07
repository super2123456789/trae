// 颜色匹配：把采样后的 cells 映射到所选色卡，支持抖动与限色
import { rgbToLab, labDistance } from './color'

export const EMPTY = -1

// 返回 { indices: Int16Array(W*H, -1 表示空格), used: number[] }
export function matchToPalette(cells, W, H, palette, options = {}) {
  const { dither = false, maxColors = 0, emptyThreshold = 128 } = options
  const N = W * H
  const pals = palette.colors

  const pr = new Float32Array(pals.length)
  const pg = new Float32Array(pals.length)
  const pb = new Float32Array(pals.length)
  const plab = new Array(pals.length)
  for (let k = 0; k < pals.length; k++) {
    pr[k] = pals[k].rgb.r
    pg[k] = pals[k].rgb.g
    pb[k] = pals[k].rgb.b
    plab[k] = pals[k].lab
  }

  const indices = new Int16Array(N).fill(EMPTY)
  const usedSet = new Set()

  // 抖动用的浮点缓冲
  const fr = new Float32Array(N)
  const fg = new Float32Array(N)
  const fb = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    fr[i] = cells[i].r
    fg[i] = cells[i].g
    fb[i] = cells[i].b
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const cell = cells[i]
      if (cell.a < emptyThreshold) {
        indices[i] = EMPTY
        continue
      }
      let idx
      if (dither) {
        const r = fr[i]
        const g = fg[i]
        const b = fb[i]
        idx = nearestRgb(r, g, b, pr, pg, pb)
        const er = r - pr[idx]
        const eg = g - pg[idx]
        const eb = b - pb[idx]
        diffuse(fr, fg, fb, W, H, i, x, er, eg, eb)
      } else {
        idx = nearestLab(cell.r, cell.g, cell.b, plab, pr, pg, pb)
      }
      indices[i] = idx
      usedSet.add(idx)
    }
  }

  let used = Array.from(usedSet)

  if (maxColors > 0 && used.length > maxColors) {
    const r = limitColors(indices, used, plab, maxColors)
    indices.set(r.indices)
    used = r.used
  }

  return { indices, used }
}

function nearestRgb(r, g, b, pr, pg, pb) {
  let best = 0
  let bd = Infinity
  for (let k = 0; k < pr.length; k++) {
    const dr = r - pr[k]
    const dg = g - pg[k]
    const db = b - pb[k]
    const d = dr * dr + dg * dg + db * db
    if (d < bd) {
      bd = d
      best = k
    }
  }
  return best
}

function nearestLab(r, g, b, plab, pr, pg, pb) {
  let best = 0
  let bd = Infinity
  let lab = null
  for (let k = 0; k < plab.length; k++) {
    if (!lab) lab = rgbToLab({ r, g, b })
    const d = labDistance(lab, plab[k])
    if (d < bd) {
      bd = d
      best = k
    }
  }
  return best
}

function diffuse(fr, fg, fb, W, H, i, x, er, eg, eb) {
  const N = W * H
  const hasRight = x < W - 1
  const hasLeft = x > 0
  const hasDown = i + W < N
  if (hasRight) add(fr, fg, fb, i + 1, er, eg, eb, 7 / 16)
  if (hasDown) {
    add(fr, fg, fb, i + W, er, eg, eb, 5 / 16)
    if (hasLeft) add(fr, fg, fb, i + W - 1, er, eg, eb, 3 / 16)
    if (hasRight) add(fr, fg, fb, i + W + 1, er, eg, eb, 1 / 16)
  }
}

function add(fr, fg, fb, i, er, eg, eb, f) {
  fr[i] += er * f
  fg[i] += eg * f
  fb[i] += eb * f
}

function limitColors(indices, used, plab, maxColors) {
  let u = used.slice()
  while (u.length > maxColors) {
    let bi = u[0]
    let bj = u[1]
    let bd = Infinity
    for (let i = 0; i < u.length; i++) {
      for (let j = i + 1; j < u.length; j++) {
        const d = labDistance(plab[u[i]], plab[u[j]])
        if (d < bd) {
          bd = d
          bi = u[i]
          bj = u[j]
        }
      }
    }
    for (let k = 0; k < indices.length; k++) {
      if (indices[k] === bj) indices[k] = bi
    }
    u = u.filter(c => c !== bj)
  }
  return { indices, used: u }
}