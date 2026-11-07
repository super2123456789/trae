// 生成 A4 单页拼豆图纸 PDF（云函数）
// 数据来自小程序端：cells 为 W*H 的颜色 hex 数组（'' 表示空格），palette 为按用量降序的颜色清单
const cloud = require('wx-server-sdk')
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib')
const fs = require('fs')
const path = require('path')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const A4W = 595.28
const A4H = 841.89
const MARGIN = 30

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  if (Number.isNaN(n)) return [0, 0, 0]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function columnLetter(col) {
  let s = ''
  let n = col + 1
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

exports.main = async event => {
  const payload = event
  const W = Math.max(1, Number(payload.W) || 1)
  const H = Math.max(1, Number(payload.H) || 1)
  const cells = payload.cells || []
  const palette = payload.palette || []
  const title = payload.title || '未命名图案'
  const brandName = payload.brandName || ''
  const beadSizeLabel = payload.beadSizeLabel || '5mm'
  const dia = Number(payload.dia) || 5
  const total = Number(payload.total) || 0

  const doc = await PDFDocument.create()
  const page = doc.addPage([A4W, A4H])

  // 字体：优先内嵌中文字体（可自行放入 NotoSansSC.ttf，文件体量较大，按需）
  let font
  let boldFont
  let cjk = true
  try {
    const fontBytes = fs.readFileSync(path.join(__dirname, 'NotoSansSC.ttf'))
    font = await doc.embedFont(fontBytes)
    cjk = true
  } catch (e) {
    font = await doc.embedFont(StandardFonts.Helvetica)
    cjk = false
  }
  try {
    boldFont = await doc.embedFont(StandardFonts.HelveticaBold)
  } catch (e) {
    boldFont = font
  }

  // 无中文字体时，去掉非 ASCII 字符，避免乱码
  const safe = s => (cjk ? s : String(s).replace(/[^\x00-\x7F]/g, '').trim())

  // 页眉
  let cursorY = A4H - MARGIN
  page.drawText(safe(title), { x: MARGIN, y: cursorY - 6, size: 16, font: boldFont, color: rgb(0.98, 0.23, 0.4), maxWidth: A4W - 2 * MARGIN })
  cursorY -= 30
  const meta = safe(`${brandName}  |  ${beadSizeLabel}  |  网格 ${W}×${H}  |  用豆 ${total} 粒`)
  page.drawText(meta, { x: MARGIN, y: cursorY - 4, size: 9, font, color: rgb(0.4, 0.4, 0.4), maxWidth: A4W - 2 * MARGIN })
  cursorY -= 22

  // 图例区（底部）
  const legendCols = palette.length > 24 ? 6 : 4
  const legendRows = Math.ceil(palette.length / legendCols)
  const itemH = 14
  const legendH = legendRows * itemH + 10
  const legendTop = MARGIN + legendH + 26
  const legendBottom = MARGIN + 26

  // 网格区
  const gridTop = cursorY
  const availW = A4W - 2 * MARGIN
  const availH = gridTop - legendTop
  const cell = Math.floor(Math.min(availW / W, availH / H))
  const gridW = cell * W
  const gridH = cell * H
  const gridX = MARGIN + (availW - gridW) / 2
  const gridY = legendTop + (availH - gridH) / 2

  // 行列坐标
  if (cell >= 4) {
    for (let x = 0; x < W; x++) {
      const label = String(x + 1)
      const tw = font.widthOfTextAtSize(label, 5)
      page.drawText(label, { x: gridX + x * cell + (cell - tw) / 2, y: gridY + gridH + 3, size: 5, font, color: rgb(0.6, 0.6, 0.6) })
    }
    for (let y = 0; y < H; y++) {
      const label = columnLetter(y)
      page.drawText(label, { x: gridX - 10, y: gridY + (H - 1 - y) * cell + cell / 2 - 2, size: 5, font, color: rgb(0.6, 0.6, 0.6) })
    }
  }

  // 单元格填充 + 符号
  const drawSymbols = cell >= 13
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const hex = cells[i]
      const px = gridX + x * cell
      const py = gridY + (H - 1 - y) * cell
      if (!hex) {
        page.drawRectangle({ x: px, y: py, width: cell, height: cell, color: rgb(0.97, 0.97, 0.97) })
      } else {
        const [r, g, b] = hexToRgb(hex)
        page.drawRectangle({ x: px, y: py, width: cell, height: cell, color: rgb(r / 255, g / 255, b / 255) })
        if (drawSymbols) {
          // 找到该颜色在 palette 中的短码
          let code = ''
          for (let k = 0; k < palette.length; k++) {
            if (palette[k].hex.toUpperCase() === hex.toUpperCase()) {
              code = palette[k].code
              break
            }
          }
          const fs = Math.max(4, Math.floor(cell * 0.4))
          const tw = font.widthOfTextAtSize(safe(code), fs)
          page.drawText(safe(code), {
            x: px + (cell - tw) / 2,
            y: py + cell / 2 - fs / 2,
            size: fs,
            font: boldFont,
            color: rgb(0, 0, 0)
          })
        }
      }
    }
  }
  // 网格边框
  page.drawRectangle({ x: gridX - 1, y: gridY - 1, width: gridW + 2, height: gridH + 2, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 })

  // 图例
  const colW = availW / legendCols
  let legendCursorY = legendBottom + legendH - itemH
  palette.forEach((c, idx) => {
    const col = idx % legendCols
    const row = Math.floor(idx / legendCols)
    const lx = MARGIN + col * colW
    const ly = legendCursorY - row * itemH
    const sw = 7
    const [r, g, b] = hexToRgb(c.hex)
    page.drawRectangle({ x: lx, y: ly, width: sw, height: sw, color: rgb(r / 255, g / 255, b / 255) })
    page.drawRectangle({ x: lx, y: ly, width: sw, height: sw, borderColor: rgb(0.85, 0.85, 0.85), borderWidth: 0.5 })
    page.drawText(`${safe(c.code)} ×${c.count}`, { x: lx + sw + 4, y: ly + 1, size: 6, font: boldFont, color: rgb(0.15, 0.15, 0.15) })
  })

  // 页脚
  const sizeInfo = safe(`成品尺寸约 ${Math.round(W * dia)}mm × ${Math.round(H * dia)}mm（按 ${beadSizeLabel} 豆径）`)
  page.drawText(sizeInfo, { x: MARGIN, y: MARGIN + 4, size: 8, font, color: rgb(0.4, 0.4, 0.4) })
  const timeStr = new Date().toLocaleString('zh-CN', { hour12: false })
  page.drawText(safe(`生成时间 ${timeStr} · 拼豆小助手`), { x: MARGIN, y: MARGIN - 8, size: 7, font, color: rgb(0.6, 0.6, 0.6) })

  const bytes = await doc.save()
  // 保存到云存储并返回 fileID
  const cloudPath = `pdf/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`
  const upload = await cloud.uploadFile({ cloudPath, fileContent: Buffer.from(bytes) })
  return { fileID: upload.fileID }
}