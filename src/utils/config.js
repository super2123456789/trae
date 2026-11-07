// 全局配置
// 填写你的微信云开发环境 ID（如 'cloud1-xxxx'），留空则使用本地存储模式（开箱即用）
export const CLOUD_ENV = ''

// 生成图案默认上限（网格尺寸）
export const MAX_GRID = 150
export const MIN_GRID = 8

// 预设网格规格
export const PRESETS = [
  { label: '29×29', w: 29, h: 29 },
  { label: '50×50', w: 50, h: 50 },
  { label: '96×96', w: 96, h: 96 }
]

// 豆径规格
export const BEAD_SIZES = [
  { id: '5mm', label: '5mm 标准豆', dia: 5 },
  { id: '2.6mm', label: '2.6mm 迷你豆', dia: 2.6 }
]