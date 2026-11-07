<template>
  <view class="editor">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBar + 'px' }">
      <view class="nav-btn" @tap="goBack">‹ 返回</view>
      <text class="nav-title">图案编辑器</text>
      <view class="nav-btn" @tap="toggleParams">参数</view>
    </view>

    <!-- 画布区 -->
    <scroll-view scroll-y class="canvas-scroll">
      <view class="canvas-wrap">
        <canvas
          id="preview"
          type="2d"
          class="preview-canvas"
          :style="{ width: canvasW + 'px', height: canvasH + 'px' }"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
        />
      </view>
      <canvas id="work" type="2d" class="work-canvas" />
    </scroll-view>

    <!-- 参数面板 -->
    <view class="panel" v-if="showParams">
      <view class="panel-row">
        <text class="label">品牌色卡</text>
        <picker :range="brandNames" :value="brandIndex" @change="onBrandChange">
          <view class="picker-val">{{ palette.name }}</view>
        </picker>
      </view>

      <view class="panel-row">
        <text class="label">豆径</text>
        <picker :range="beadSizeLabels" :value="beadSizeIndex" @change="onBeadSizeChange">
          <view class="picker-val">{{ beadSizeLabel }}</view>
        </picker>
      </view>

      <view class="panel-row">
        <text class="label">网格尺寸</text>
        <picker :range="gridPresetLabels" :value="gridPresetIndex" @change="onGridPresetChange">
          <view class="picker-val">{{ gridW }}×{{ gridH }}</view>
        </picker>
      </view>

      <view class="panel-row" v-if="gridPresetIndex === gridPresetLabels.length - 1">
        <text class="label">自定义</text>
        <view class="wh-inputs">
          <input class="wh-input" type="number" v-model="gridW" @blur="regenerate" />
          <text>×</text>
          <input class="wh-input" type="number" v-model="gridH" @blur="regenerate" />
        </view>
      </view>

      <view class="panel-row">
        <text class="label">颜色抖动</text>
        <switch :checked="dither" color="#FF5C8A" @change="onDitherChange" />
      </view>

      <view class="panel-row">
        <text class="label">去背景</text>
        <switch :checked="removeBg" color="#FF5C8A" @change="onRemoveBgChange" />
      </view>

      <view class="panel-row column">
        <view class="label-row">
          <text class="label">最大颜色数</text>
          <text class="label-val">{{ maxColors === 0 ? '不限' : maxColors }}</text>
        </view>
        <slider :min="0" :max="64" :value="maxColors" @changing="onMaxColorsChanging" @change="onMaxColorsChange" />
      </view>

      <view class="panel-row">
        <text class="label">标题</text>
        <input class="title-input" v-model="title" placeholder="未命名图案" />
      </view>
    </view>

    <!-- 拼豆模式（颜色分层） -->
    <view class="bead-panel" v-if="beadMode">
      <view class="bead-head">
        <text class="label">颜色分层（共{{ stats.total }}豆）</text>
        <text class="link" @tap="showAll">全部显示</text>
      </view>
      <scroll-view scroll-x class="color-list">
        <view
          v-for="it in stats.list"
          :key="it.idx"
          class="color-chip"
          :class="{ off: visibleMap[it.idx] === false }"
          @tap="toggleColor(it.idx)"
        >
          <view class="swatch" :style="{ background: it.hex }" />
          <text class="chip-code">{{ it.code }}</text>
          <text class="chip-count">{{ it.count }}</text>
        </view>
      </scroll-view>
      <view class="bead-options">
        <view class="bead-opt">
          <text>网格</text>
          <switch :checked="showGrid" color="#FF5C8A" @change="e => { showGrid = e.detail.value; render() }" />
        </view>
        <view class="bead-opt">
          <text>符号</text>
          <switch :checked="showSymbols" color="#FF5C8A" @change="e => { showSymbols = e.detail.value; render() }" />
        </view>
      </view>
    </view>

    <!-- 编辑工具条 -->
    <view class="toolbar" v-if="showTools">
      <scroll-view scroll-x class="tool-list">
        <view v-for="t in tools" :key="t.id" class="tool" :class="{ active: tool === t.id }" @tap="setTool(t.id)">
          <text>{{ t.icon }}</text>
        </view>
        <view class="tool" @tap="mirrorH"><text>⇋</text></view>
        <view class="tool" @tap="mirrorV"><text>⇅</text></view>
        <view class="tool" @tap="undo"><text>↩</text></view>
        <view class="tool" @tap="redo"><text>↪</text></view>
      </scroll-view>
      <scroll-view scroll-x class="palette-strip">
        <view
          v-for="(c, i) in palette.colors"
          :key="c.code"
          class="p-swatch"
          :class="{ sel: activeColor === i }"
          :style="{ background: c.hex }"
          @tap="activeColor = i"
        />
      </scroll-view>
    </view>

    <!-- 底部操作 -->
    <view class="bottombar">
      <view class="btn" @tap="toggleBead">拼豆模式</view>
      <view class="btn" @tap="toggleTools">编辑</view>
      <view class="btn" @tap="save">保存</view>
      <view class="btn primary" @tap="exportDoc">导出PDF</view>
    </view>

    <!-- 网格符号开关组件简化为内联 -->
  </view>
</template>

<script>
import { BRANDS, getBrand } from '@/utils/brands.js'
import { BEAD_SIZES, PRESETS, MIN_GRID, MAX_GRID } from '@/utils/config.js'
import { getImageData, drawImageToCanvas } from '@/utils/image-data.js'
import { pixelate } from '@/utils/sampler.js'
import { removeBackground } from '@/utils/bg-remove.js'
import { matchToPalette } from '@/utils/matcher.js'
import { EditorState, EMPTY } from '@/utils/editor-state.js'
import { drawPattern } from '@/utils/render.js'
import { computeStats } from '@/utils/stats.js'
import { saveProject } from '@/utils/cloud.js'
import { exportPdf, downloadAndOpen } from '@/utils/pdf.js'

const CANVAS_MAX = 520

export default {
  data() {
    const p = getBrand('mard-221')
    return {
      statusBar: 20,
      img: '',
      title: '',
      palette: p,
      brands: BRANDS,
      brandIndex: 0,
      beadSizes: BEAD_SIZES,
      beadSizeId: p.beadSizes[0] || '2.6mm',
      beadSizeIndex: 0,
      gridPresets: PRESETS,
      gridPresetIndex: 1,
      gridW: 50,
      gridH: 50,
      dither: true,
      removeBg: false,
      bgTolerance: 24,
      maxColors: 0,
      showParams: false,
      beadMode: false,
      showTools: false,
      showGrid: true,
      showSymbols: false,
      tool: 'paint',
      activeColor: 0,
      state: null,
      stats: { list: [], total: 0 },
      visibleMap: {},
      imageData: null,
      cell: 6,
      canvasW: 300,
      canvasH: 300,
      stroking: false,
      dragStart: null,
      tools: [
        { id: 'paint', icon: '🖌️' },
        { id: 'erase', icon: '🧽' },
        { id: 'fill', icon: '🪣' },
        { id: 'line', icon: '📏' },
        { id: 'rect', icon: '⬜' },
        { id: 'pick', icon: '💉' }
      ]
    }
  },
  computed: {
    brandNames() {
      return this.brands.map(b => b.name)
    },
    beadSizeLabels() {
      return BEAD_SIZES.map(b => b.label)
    },
    beadSizeLabel() {
      const s = BEAD_SIZES.find(b => b.id === this.beadSizeId)
      return s ? s.label : this.beadSizeId
    },
    gridPresetLabels() {
      return [...PRESETS.map(p => p.label), '自定义']
    }
  },
  onLoad(query) {
    this.img = query.img ? decodeURIComponent(query.img) : ''
    try {
      const info = uni.getSystemInfoSync()
      this.statusBar = info.statusBarHeight || 20
    } catch (e) {}
  },
  onReady() {
    this.initCanvas()
  },
  methods: {
    initCanvas() {
      uni.createSelectorQuery()
        .in(this)
        .select('#preview')
        .fields({ node: true })
        .select('#work')
        .fields({ node: true })
        .exec(res => {
          if (!res[0] || !res[1]) return
          this.previewCanvas = res[0].node
          this.previewCtx = this.previewCanvas.getContext('2d')
          this.workCanvas = res[1].node
          this.workCtx = this.workCanvas.getContext('2d')
          this.loadSource()
        })
    },
    async loadSource() {
      if (!this.img) return
      try {
        uni.showLoading({ title: '生成中...' })
        const { width, height } = await drawImageToCanvas(this.workCanvas, this.img)
        this.imageData = getImageData(this.workCanvas, width, height)
        this.regenerate()
        uni.hideLoading()
        this.showParams = true
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '图片加载失败', icon: 'none' })
      }
    },
    regenerate() {
      if (!this.imageData) return
      const W = this.clampGrid(Number(this.gridW))
      const H = this.clampGrid(Number(this.gridH))
      this.gridW = W
      this.gridH = H
      const { cells } = pixelate(this.imageData, W, H)
      if (this.removeBg) {
        removeBackground(cells, W, H, { tolerance: Number(this.bgTolerance) })
      }
      const { indices } = matchToPalette(cells, W, H, this.palette, {
        dither: this.dither,
        maxColors: Number(this.maxColors)
      })
      this.state = new EditorState(W, H, indices)
      this.visibleMap = {}
      this.setupCanvas()
      this.refreshStats()
      this.render()
    },
    clampGrid(v) {
      if (Number.isNaN(v)) return 50
      return Math.max(MIN_GRID, Math.min(MAX_GRID, v))
    },
    setupCanvas() {
      const W = this.state.W
      const H = this.state.H
      const cell = Math.max(2, Math.floor(CANVAS_MAX / Math.max(W, H)))
      this.cell = cell
      this.canvasW = cell * W
      this.canvasH = cell * H
      if (this.previewCanvas) {
        this.previewCanvas.width = this.canvasW
        this.previewCanvas.height = this.canvasH
      }
    },
    refreshStats() {
      this.stats = computeStats(this.state, this.palette)
      const m = { ...this.visibleMap }
      this.stats.list.forEach(it => {
        if (!(it.idx in m)) m[it.idx] = true
      })
      this.visibleMap = m
    },
    visibleSet() {
      const s = new Set()
      this.stats.list.forEach(it => {
        if (this.visibleMap[it.idx] !== false) s.add(it.idx)
      })
      return s
    },
    render() {
      if (!this.state || !this.previewCtx) return
      const visible = this.beadMode ? this.visibleSet() : null
      drawPattern(this.previewCtx, this.state, this.palette, {
        cellPx: this.cell,
        showGrid: this.showGrid,
        showSymbols: this.showSymbols,
        visible
      })
    },
    onBrandChange(e) {
      const i = Number(e.detail.value)
      this.brandIndex = i
      this.palette = getBrand(this.brands[i].id)
      this.beadSizeId = this.palette.beadSizes[0] || '5mm'
      this.beadSizeIndex = BEAD_SIZES.findIndex(b => b.id === this.beadSizeId)
      this.regenerate()
    },
    onBeadSizeChange(e) {
      this.beadSizeIndex = Number(e.detail.value)
      this.beadSizeId = BEAD_SIZES[this.beadSizeIndex].id
    },
    onGridPresetChange(e) {
      const i = Number(e.detail.value)
      this.gridPresetIndex = i
      if (PRESETS[i]) {
        this.gridW = PRESETS[i].w
        this.gridH = PRESETS[i].h
      }
      this.regenerate()
    },
    onDitherChange(e) {
      this.dither = e.detail.value
      this.regenerate()
    },
    onRemoveBgChange(e) {
      this.removeBg = e.detail.value
      this.regenerate()
    },
    onMaxColorsChanging(e) {
      this.maxColors = Number(e.detail.value)
    },
    onMaxColorsChange(e) {
      this.maxColors = Number(e.detail.value)
      this.regenerate()
    },
    toggleParams() {
      this.showParams = !this.showParams
    },
    toggleBead() {
      this.beadMode = !this.beadMode
      if (this.beadMode) this.showTools = false
      this.render()
    },
    toggleTools() {
      this.showTools = !this.showTools
      if (this.showTools) this.beadMode = false
      this.render()
    },
    toggleColor(idx) {
      const cur = this.visibleMap[idx] !== false
      this.visibleMap = { ...this.visibleMap, [idx]: !cur }
      this.render()
    },
    showAll() {
      const m = {}
      this.stats.list.forEach(it => {
        m[it.idx] = true
      })
      this.visibleMap = m
      this.render()
    },
    setTool(id) {
      this.tool = id
    },
    mirrorH() {
      if (!this.state) return
      this.state.mirrorH()
      this.state.commit()
      this.afterEdit()
    },
    mirrorV() {
      if (!this.state) return
      this.state.mirrorV()
      this.state.commit()
      this.afterEdit()
    },
    undo() {
      if (this.state && this.state.undo()) this.afterEdit()
    },
    redo() {
      if (this.state && this.state.redo()) this.afterEdit()
    },
    afterEdit() {
      this.refreshStats()
      this.render()
    },
    getCellFromEvent(e) {
      const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0])
      if (!t) return null
      const x = Math.floor(t.x / this.cell)
      const y = Math.floor(t.y / this.cell)
      return { x, y, ok: this.state.inBounds(x, y) }
    },
    onTouchStart(e) {
      if (!this.state) return
      const c = this.getCellFromEvent(e)
      if (!c || !c.ok) return
      if (this.tool === 'line' || this.tool === 'rect') {
        this.dragStart = c
        return
      }
      if (this.tool === 'fill') {
        if (this.state.fill(c.x, c.y, this.activeColor)) {
          this.state.commit()
          this.afterEdit()
        }
        return
      }
      if (this.tool === 'pick') {
        const v = this.state.get(c.x, c.y)
        if (v !== EMPTY) {
          this.activeColor = v
          this.tool = 'paint'
        }
        return
      }
      // paint / erase
      this.stroking = true
      this.applyCell(c)
    },
    onTouchMove(e) {
      if (!this.state || !this.stroking) return
      const c = this.getCellFromEvent(e)
      if (!c || !c.ok) return
      this.applyCell(c)
    },
    onTouchEnd(e) {
      if (!this.state) return
      if ((this.tool === 'line' || this.tool === 'rect') && this.dragStart) {
        const c = this.getCellFromEvent(e)
        if (c && c.ok) {
          if (this.tool === 'line') {
            this.state.line(this.dragStart.x, this.dragStart.y, c.x, c.y, this.activeColor)
          } else {
            this.state.rect(this.dragStart.x, this.dragStart.y, c.x, c.y, this.activeColor)
          }
          this.state.commit()
          this.afterEdit()
        }
        this.dragStart = null
        return
      }
      if (this.stroking) {
        this.state.commit()
        this.afterEdit()
        this.stroking = false
      }
    },
    applyCell(c) {
      if (this.tool === 'erase') this.state.erase(c.x, c.y)
      else this.state.paint(c.x, c.y, this.activeColor)
    },
    goBack() {
      uni.navigateBack()
    },
    async save() {
      if (!this.state) return
      const meta = {
        title: this.title || '图案-' + this.fmtTime(),
        brandId: this.palette.id,
        brandName: this.palette.name,
        beadSizeId: this.beadSizeId,
        beadSizeLabel: this.beadSizeLabel,
        dia: (BEAD_SIZES.find(b => b.id === this.beadSizeId) || { dia: 5 }).dia,
        W: this.state.W,
        H: this.state.H,
        gridData: JSON.stringify(this.state.toArray()),
        isFavorite: false
      }
      try {
        uni.showLoading({ title: '保存中...' })
        const id = await saveProject(meta)
        uni.hideLoading()
        uni.showToast({ title: '已保存', icon: 'success' })
        this.savedId = id
      } catch (err) {
        uni.hideLoading()
        uni.showToast({ title: '保存失败', icon: 'none' })
      }
    },
    async exportDoc() {
      if (!this.state) return
      try {
        uni.showLoading({ title: '生成PDF...' })
        const result = await exportPdf(this.state, this.palette, {
          title: this.title || '未命名图案',
          beadSizeLabel: this.beadSizeLabel,
          dia: (BEAD_SIZES.find(b => b.id === this.beadSizeId) || { dia: 5 }).dia
        })
        uni.hideLoading()
        if (result && result.fileID) {
          await downloadAndOpen(result.fileID)
        } else {
          uni.showToast({ title: '生成失败', icon: 'none' })
        }
      } catch (err) {
        uni.hideLoading()
        if (err && err.message === 'LOCAL_PDF_NOT_SUPPORTED') {
          uni.showModal({
            title: '提示',
            content: 'PDF 导出需配置微信云开发环境。请在 utils/config.js 中填写 CLOUD_ENV 后重新编译。',
            showCancel: false
          })
        } else {
          uni.showToast({ title: '导出失败', icon: 'none' })
        }
      }
    },
    fmtTime() {
      const d = new Date()
      const p = n => (n < 10 ? '0' + n : '' + n)
      return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`
    }
  }
}
</script>

<style lang="scss" scoped>
.editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #FFF4F8;
}
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx 12rpx;
  background: #fff;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.nav-btn {
  color: #FF5C8A;
  font-size: 28rpx;
}
.nav-title {
  font-weight: 700;
}
.canvas-scroll {
  flex: 1;
  overflow: hidden;
}
.canvas-wrap {
  display: flex;
  justify-content: center;
  padding: 24rpx;
}
.preview-canvas {
  background: #fff;
  border-radius: 8rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}
.work-canvas {
  position: fixed;
  left: -9999rpx;
  top: 0;
  width: 10rpx;
  height: 10rpx;
  opacity: 0;
}
.panel {
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
  padding: 8rpx 24rpx;
  max-height: 46vh;
  overflow-y: auto;
}
.panel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.panel-row.column {
  flex-direction: column;
  align-items: stretch;
}
.label-row {
  display: flex;
  justify-content: space-between;
}
.label {
  font-size: 28rpx;
  color: #333;
}
.label-val {
  color: #FF5C8A;
  font-weight: 600;
}
.picker-val {
  color: #666;
}
.wh-inputs {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.wh-input {
  width: 100rpx;
  border: 1rpx solid #eee;
  border-radius: 8rpx;
  text-align: center;
  padding: 8rpx;
}
.title-input {
  flex: 1;
  margin-left: 20rpx;
  border: 1rpx solid #eee;
  border-radius: 8rpx;
  padding: 8rpx 16rpx;
}
.bead-panel {
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
  padding: 16rpx 24rpx;
}
.bead-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.link {
  color: #FF5C8A;
  font-size: 26rpx;
}
.color-list {
  white-space: nowrap;
}
.color-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin-right: 16rpx;
  padding: 12rpx;
  border-radius: 12rpx;
  background: #fafafa;
}
.color-chip.off {
  opacity: 0.35;
}
.swatch {
  width: 56rpx;
  height: 56rpx;
  border-radius: 10rpx;
  border: 1rpx solid #eee;
}
.chip-code {
  font-size: 20rpx;
  margin-top: 6rpx;
}
.chip-count {
  font-size: 20rpx;
  color: #999;
}
.bead-options {
  display: flex;
  gap: 24rpx;
  margin-top: 12rpx;
}
.bead-opt {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  color: #555;
}
.toolbar {
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
  padding: 12rpx 0;
}
.tool-list {
  white-space: nowrap;
  padding: 0 24rpx;
}
.tool {
  display: inline-flex;
  width: 72rpx;
  height: 72rpx;
  align-items: center;
  justify-content: center;
  margin-right: 12rpx;
  border-radius: 14rpx;
  background: #f7f7f7;
  font-size: 36rpx;
}
.tool.active {
  background: #FFE3EC;
  border: 2rpx solid #FF5C8A;
}
.palette-strip {
  white-space: nowrap;
  padding: 12rpx 24rpx 0;
}
.p-swatch {
  display: inline-block;
  width: 48rpx;
  height: 48rpx;
  border-radius: 8rpx;
  margin-right: 10rpx;
  border: 2rpx solid transparent;
}
.p-swatch.sel {
  border-color: #FF5C8A;
}
.bottombar {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
}
.btn {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 16rpx;
  background: #f0f0f0;
  color: #333;
  font-weight: 600;
}
.btn.primary {
  background: #FF5C8A;
  color: #fff;
}
</style>