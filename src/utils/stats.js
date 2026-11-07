// 图案统计：每种颜色的用量与总数
import { EMPTY } from './editor-state'

export function computeStats(state, palette) {
  const W = state.W
  const H = state.H
  const counts = new Map()
  let total = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = state.get(x, y)
      if (idx === EMPTY) continue
      counts.set(idx, (counts.get(idx) || 0) + 1)
      total++
    }
  }
  const list = Array.from(counts.entries())
    .map(([idx, count]) => {
      const c = palette.colors[idx]
      return { idx, code: c.code, name: c.name, hex: c.hex, count }
    })
    .sort((a, b) => b.count - a.count)
  return { list, total }
}