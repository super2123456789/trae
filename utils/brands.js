// 品牌色卡：静态导入四套色卡并预计算 Lab，供匹配与渲染使用
import { hexToRgb, rgbToLab } from './color'
import mard from '@/static/brands/mard-221.json'
import perler from '@/static/brands/perler-midi.json'
import hama from '@/static/brands/hama-midi.json'
import artkal from '@/static/brands/artkal-s.json'

const RAW = [mard, perler, hama, artkal]

function buildPalette(raw) {
  const colors = raw.colors.map(c => {
    const rgb = hexToRgb(c.hex)
    return {
      code: c.code,
      name: c.name,
      hex: (c.hex || '').toUpperCase(),
      rgb,
      lab: rgbToLab(rgb)
    }
  })
  return {
    id: raw.id,
    name: raw.name,
    beadSizes: raw.beadSizes || [],
    note: raw.note || '',
    colors
  }
}

export const BRANDS = RAW.map(buildPalette)

export function getBrand(id) {
  return BRANDS.find(b => b.id === id)
}