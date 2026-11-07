// PDF 导出：组装图纸数据并调用云函数生成，下载并打开
import { generatePdf } from './cloud'
import { computeStats } from './stats'
import { EMPTY } from './editor-state'

export async function exportPdf(state, palette, meta = {}) {
  const { list, total } = computeStats(state, palette)
  const cells = []
  for (let y = 0; y < state.H; y++) {
    for (let x = 0; x < state.W; x++) {
      const idx = state.get(x, y)
      cells.push(idx === EMPTY ? '' : palette.colors[idx].hex)
    }
  }
  const payload = {
    title: meta.title || '未命名图案',
    brandName: palette.name,
    beadSizeLabel: meta.beadSizeLabel || '5mm',
    dia: meta.dia || 5,
    W: state.W,
    H: state.H,
    cells,
    palette: list,
    total
  }
  return await generatePdf(payload)
}

export async function downloadAndOpen(fileID) {
  const res = await wx.cloud.downloadFile({ fileID })
  await uni.openDocument({ filePath: res.tempFilePath, fileType: 'pdf', showMenu: true })
}