// 画布渲染：绘制图案网格（预览 / 拼豆分层 / 详情），供 editor 与 detail 复用
import { EMPTY } from './editor-state'

function emptyColor() {
  return '#FFFFFF'
}

// opts: { visible: Set|null, showSymbols, showGrid, cellPx, colors, emptyHex }
export function drawPattern(ctx, state, palette, opts = {}) {
  const W = state.W
  const H = state.H
  const cell = opts.cellPx || 1
  const showGrid = opts.showGrid !== false
  const showSymbols = !!opts.showSymbols
  const visible = opts.visible || null
  const bg = opts.emptyHex || emptyColor()

  ctx.clearRect(0, 0, W * cell, H * cell)

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = state.get(x, y)
      const px = x * cell
      const py = y * cell
      if (idx === EMPTY) {
        ctx.fillStyle = bg
        ctx.fillRect(px, py, cell, cell)
        continue
      }
      const c = palette.colors[idx]
      if (visible && !visible.has(idx)) {
        ctx.fillStyle = '#F0F0F0'
        ctx.fillRect(px, py, cell, cell)
      } else {
        ctx.fillStyle = c.hex
        ctx.fillRect(px, py, cell, cell)
      }
    }
  }

  // 网格线
  if (showGrid && cell > 3) {
    ctx.strokeStyle = 'rgba(0,0,0,0.10)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= W; x++) {
      ctx.moveTo(x * cell + 0.5, 0)
      ctx.lineTo(x * cell + 0.5, H * cell)
    }
    for (let y = 0; y <= H; y++) {
      ctx.moveTo(0, y * cell + 0.5)
      ctx.lineTo(W * cell, y * cell + 0.5)
    }
    ctx.stroke()
  }

  // 符号/编号
  if (showSymbols) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = state.get(x, y)
        if (idx === EMPTY) continue
        const c = palette.colors[idx]
        if (visible && !visible.has(idx)) continue
        ctx.fillStyle = '#000000'
        ctx.font = `${Math.max(6, cell * 0.5)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(c.code, (x + 0.5) * cell, (y + 0.5) * cell)
      }
    }
  }
}