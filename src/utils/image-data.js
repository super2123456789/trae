// 图片解码为 ImageData（使用 type="2d" canvas，微信小程序 / H5 通用）
const MAX_DIM = 1200

export function drawImageToCanvas(canvas, path) {
  return new Promise((resolve, reject) => {
    const ctx = canvas.getContext('2d')
    const img = canvas.createImage()
    img.onload = () => {
      let w = img.width
      let h = img.height
      const scale = Math.min(1, MAX_DIM / Math.max(w, h))
      w = Math.max(1, Math.round(w * scale))
      h = Math.max(1, Math.round(h * scale))
      canvas.width = w
      canvas.height = h
      ctx.drawImage(img, 0, 0, w, h)
      resolve({ width: w, height: h })
    }
    img.onerror = e => reject(e)
    img.src = path
  })
}

export function getImageData(canvas, width, height) {
  const ctx = canvas.getContext('2d')
  return ctx.getImageData(0, 0, width, height)
}

export function canvasToTempPath(canvas) {
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvas,
      success: res => resolve(res.tempFilePath),
      fail: reject
    })
  })
}