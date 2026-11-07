// 采样：将图片像素等比缩放并居中留白到目标网格
// 返回 cells: 每格 {r,g,b,a}，留白区域 a=0（空格）

export function pixelate(imageData, W, H) {
  const { data, width: w0, height: h0 } = imageData
  const scale = Math.min(W / w0, H / h0)
  const pw = Math.max(1, Math.round(w0 * scale))
  const ph = Math.max(1, Math.round(h0 * scale))
  const ox = Math.floor((W - pw) / 2)
  const oy = Math.floor((H - ph) / 2)

  const cells = new Array(W * H)
  for (let gy = 0; gy < H; gy++) {
    for (let gx = 0; gx < W; gx++) {
      const idx = gy * W + gx
      if (gx < ox || gx >= ox + pw || gy < oy || gy >= oy + ph) {
        cells[idx] = { r: 0, g: 0, b: 0, a: 0 }
        continue
      }
      const sx0 = (gx - ox) / scale
      const sy0 = (gy - oy) / scale
      const sx1 = (gx - ox + 1) / scale
      const sy1 = (gy - oy + 1) / scale
      cells[idx] = averageRegion(data, w0, h0, sx0, sy0, sx1, sy1)
    }
  }
  return { cells, W, H, ox, oy, pw, ph }
}

// 区域平均采样（最多 N×N 个采样点）
function averageRegion(data, w0, h0, x0, y0, x1, y1) {
  const N = 4
  let r = 0
  let g = 0
  let b = 0
  let a = 0
  let n = 0
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = Math.min(w0 - 1, Math.max(0, Math.floor(x0 + ((x1 - x0) * (i + 0.5)) / N)))
      const y = Math.min(h0 - 1, Math.max(0, Math.floor(y0 + ((y1 - y0) * (j + 0.5)) / N)))
      const p = (y * w0 + x) * 4
      r += data[p]
      g += data[p + 1]
      b += data[p + 2]
      a += data[p + 3]
      n++
    }
  }
  return { r: r / n | 0, g: g / n | 0, b: b / n | 0, a: a / n | 0 }
}