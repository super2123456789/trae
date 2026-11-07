// 去背景：从网格边缘做「相似色」漫水填充，标记为透明（空格）
import { rgbToLab, labDistance } from './color'

// cells: 每格 {r,g,b,a}；返回新 cells（背景格 a=0）
export function removeBackground(cells, W, H, options = {}) {
  const { tolerance = 24, bgColor = null } = options
  const N = W * H

  // 自动取背景色：四角均值
  let bg = bgColor
  if (!bg) {
    const corners = [0, W - 1, (H - 1) * W, H * W - 1]
    let r = 0
    let g = 0
    let b = 0
    for (const i of corners) {
      r += cells[i].r
      g += cells[i].g
      b += cells[i].b
    }
    bg = { r: r / 4 | 0, g: g / 4 | 0, b: b / 4 | 0 }
  }
  const bgLab = rgbToLab(bg)

  const visited = new Uint8Array(N)
  const stack = []
  // 从四条边入队
  for (let x = 0; x < W; x++) {
    stack.push(x)
    stack.push((H - 1) * W + x)
  }
  for (let y = 0; y < H; y++) {
    stack.push(y * W)
    stack.push(y * W + W - 1)
  }

  while (stack.length) {
    const i = stack.pop()
    if (visited[i]) continue
    visited[i] = 1
    const c = cells[i]
    if (c.a < 128) continue
    const d = labDistance(rgbToLab(c), bgLab)
    if (d > tolerance) continue
    c.a = 0
    const x = i % W
    const y = (i / W) | 0
    if (x > 0) stack.push(i - 1)
    if (x < W - 1) stack.push(i + 1)
    if (y > 0) stack.push(i - W)
    if (y < H - 1) stack.push(i + W)
  }
  return cells
}