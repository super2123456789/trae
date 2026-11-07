<template>
  <view class="detail">
    <view class="head card">
      <text class="title">{{ project.title || '未命名图案' }}</text>
      <text class="meta">{{ project.brandName }} · {{ project.W }}×{{ project.H }} · {{ project.beadSizeLabel }} · {{ stats.total }}豆</text>
    </view>

    <view class="canvas-card card">
      <canvas
        id="preview"
        type="2d"
        class="preview-canvas"
        :style="{ width: canvasW + 'px', height: canvasH + 'px' }"
      />
    </view>

    <view class="legend card">
      <view class="card-title">颜色清单（{{ stats.list.length }} 色）</view>
      <view class="legend-item" v-for="it in stats.list" :key="it.code">
        <view class="swatch" :style="{ background: it.hex }" />
        <text class="code">{{ it.code }}</text>
        <text class="name">{{ it.name }}</text>
        <text class="count">×{{ it.count }}</text>
      </view>
    </view>

    <view class="actions">
      <button v-if="!isShared" class="btn" @tap="toggleFav">{{ project.isFavorite ? '取消收藏' : '收藏' }}</button>
      <button v-if="!isShared" class="btn" @tap="openRename">重命名</button>
      <button class="btn" open-type="share">分享给好友</button>
      <button class="btn" @tap="exportDoc">导出PDF</button>
      <button v-if="isShared" class="btn primary" @tap="saveAsMine">存为我的图案</button>
      <button v-if="!isShared" class="btn danger" @tap="remove">删除</button>
    </view>

    <!-- 重命名遮罩 -->
    <view class="mask" v-if="renaming" @tap="renaming = false">
      <view class="rename-box" @tap.stop>
        <input class="rename-input" v-model="newTitle" placeholder="输入新标题" focus />
        <view class="rename-btns">
          <button class="btn" @tap="renaming = false">取消</button>
          <button class="btn primary" @tap="doRename">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getProject, getShare, updateProject, deleteProject, createShare, saveProject } from '@/utils/cloud.js'
import { getBrand } from '@/utils/brands.js'
import { EditorState } from '@/utils/editor-state.js'
import { drawPattern } from '@/utils/render.js'
import { computeStats } from '@/utils/stats.js'
import { exportPdf, downloadAndOpen } from '@/utils/pdf.js'

const CANVAS_MAX = 520

export default {
  data() {
    return {
      project: {},
      palette: null,
      state: null,
      stats: { list: [], total: 0 },
      isShared: false,
      shareToken: '',
      canvasW: 200,
      canvasH: 200,
      cell: 6,
      renaming: false,
      newTitle: ''
    }
  },
  onLoad(query) {
    this.loadId = query.id || ''
    this.loadToken = query.token || ''
  },
  onReady() {
    uni.createSelectorQuery()
      .in(this)
      .select('#preview')
      .fields({ node: true })
      .exec(res => {
        if (res[0]) {
          this.canvas = res[0].node
          this.ctx = this.canvas.getContext('2d')
        }
        this.init()
      })
  },
  onShareAppMessage() {
    return {
      title: (this.project.title || '拼豆图案') + '（拼豆小助手）',
      path: this.shareToken ? '/pages/detail/detail?token=' + this.shareToken : '/pages/home/home'
    }
  },
  methods: {
    async init() {
      try {
        if (this.loadToken) {
          this.project = await getShare(this.loadToken)
          this.isShared = true
          if (!this.project) {
            uni.showToast({ title: '分享已失效', icon: 'none' })
            return
          }
        } else {
          this.project = await getProject(this.loadId)
        }
        if (!this.project) {
          uni.showToast({ title: '未找到图案', icon: 'none' })
          return
        }
        this.palette = getBrand(this.project.brandId) || getBrand('mard-221')
        const arr = JSON.parse(this.project.gridData || '[]')
        this.state = new EditorState(this.project.W, this.project.H, Int16Array.from(arr))
        this.stats = computeStats(this.state, this.palette)
        this.setupCanvas()
        this.render()
        this.ensureShare()
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    setupCanvas() {
      const W = this.state.W
      const H = this.state.H
      const cell = Math.max(2, Math.floor(CANVAS_MAX / Math.max(W, H)))
      this.cell = cell
      this.canvasW = cell * W
      this.canvasH = cell * H
      this.canvas.width = this.canvasW
      this.canvas.height = this.canvasH
    },
    render() {
      if (!this.state || !this.ctx) return
      drawPattern(this.ctx, this.state, this.palette, { cellPx: this.cell, showGrid: true, showSymbols: false })
    },
    async ensureShare() {
      try {
        this.shareToken = await createShare(this.project)
      } catch (e) {}
    },
    async toggleFav() {
      const val = !this.project.isFavorite
      this.project.isFavorite = val
      await updateProject(this.project._id, { isFavorite: val })
      uni.showToast({ title: val ? '已收藏' : '已取消收藏', icon: 'none' })
    },
    openRename() {
      this.newTitle = this.project.title || ''
      this.renaming = true
    },
    async doRename() {
      const t = (this.newTitle || '').trim()
      if (!t) {
        uni.showToast({ title: '标题不能为空', icon: 'none' })
        return
      }
      this.project.title = t
      await updateProject(this.project._id, { title: t })
      this.renaming = false
      uni.showToast({ title: '已重命名', icon: 'none' })
    },
    async remove() {
      const r = await new Promise(res => {
        uni.showModal({
          title: '删除图案',
          content: '确定删除该图案吗？',
          success: x => res(x.confirm),
          fail: () => res(false)
        })
      })
      if (!r) return
      await deleteProject(this.project._id)
      uni.showToast({ title: '已删除', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 400)
    },
    async saveAsMine() {
      const clone = {
        ...this.project,
        _id: undefined,
        isFavorite: false,
        createdAt: Date.now()
      }
      await saveProject(clone)
      uni.showToast({ title: '已存为我的图案', icon: 'success' })
    },
    async exportDoc() {
      try {
        uni.showLoading({ title: '生成PDF...' })
        const result = await exportPdf(this.state, this.palette, {
          title: this.project.title || '未命名图案',
          beadSizeLabel: this.project.beadSizeLabel,
          dia: this.project.dia || 5
        })
        uni.hideLoading()
        if (result && result.fileID) {
          await downloadAndOpen(result.fileID)
        }
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '需配置云开发后导出', icon: 'none' })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.detail {
  padding: 24rpx;
}
.head {
  margin-bottom: 24rpx;
}
.title {
  font-size: 40rpx;
  font-weight: 800;
  color: #FF5C8A;
  display: block;
}
.meta {
  color: #999;
  font-size: 26rpx;
  margin-top: 8rpx;
  display: block;
}
.canvas-card {
  display: flex;
  justify-content: center;
  margin-bottom: 24rpx;
}
.preview-canvas {
  background: #fff;
  border-radius: 8rpx;
}
.legend {
  margin-bottom: 24rpx;
}
.card-title {
  font-weight: 700;
  margin-bottom: 12rpx;
}
.legend-item {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.swatch {
  width: 44rpx;
  height: 44rpx;
  border-radius: 8rpx;
  border: 1rpx solid #eee;
}
.code {
  margin-left: 16rpx;
  font-weight: 600;
  width: 90rpx;
}
.name {
  flex: 1;
  color: #555;
}
.count {
  color: #FF5C8A;
  font-weight: 700;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.actions .btn {
  flex: 1;
  min-width: 180rpx;
  background: #f0f0f0;
  color: #333;
  border-radius: 16rpx;
  font-size: 26rpx;
}
.actions .btn.primary {
  background: #FF5C8A;
  color: #fff;
}
.actions .btn.danger {
  background: #fff;
  color: #ff4d4f;
  border: 1rpx solid #ff4d4f;
}
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.rename-box {
  width: 80%;
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
}
.rename-input {
  border: 1rpx solid #eee;
  border-radius: 12rpx;
  padding: 16rpx;
}
.rename-btns {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}
.rename-btns .btn {
  flex: 1;
  background: #f0f0f0;
  border-radius: 12rpx;
}
.rename-btns .btn.primary {
  background: #FF5C8A;
  color: #fff;
}
</style>