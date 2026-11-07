<template>
  <view class="home">
    <view class="hero">
      <text class="hero-title">拼豆小助手</text>
      <text class="hero-sub">把照片变成可拼装的像素图纸</text>
    </view>

    <view class="actions">
      <view class="action-btn primary" @tap="chooseImage">
        <text class="action-icon">🖼️</text>
        <text class="action-text">相册选图</text>
      </view>
      <view class="action-btn" @tap="takePhoto">
        <text class="action-icon">📷</text>
        <text class="action-text">拍照</text>
      </view>
    </view>

    <view class="card recent" v-if="recent.length">
      <view class="card-title">最近图案</view>
      <view class="proj-item" v-for="p in recent" :key="p._id" @tap="openProject(p)">
        <view class="proj-info">
          <text class="proj-title">{{ p.title }}</text>
          <text class="proj-meta">{{ p.brandName }} · {{ p.W }}×{{ p.H }} · {{ p.beadSizeLabel }}</text>
        </view>
        <text class="proj-arrow">›</text>
      </view>
    </view>

    <view class="card tip" v-else>
      <text class="tip-title">开始创作</text>
      <text class="tip-text">上传一张照片，自动匹配品牌色卡，导出可打印的 A4 图纸</text>
    </view>
  </view>
</template>

<script>
import { listProjects } from '@/utils/cloud.js'

export default {
  data() {
    return {
      recent: []
    }
  },
  onShow() {
    this.loadRecent()
  },
  methods: {
    async loadRecent() {
      try {
        this.recent = await listProjects()
      } catch (e) {
        this.recent = []
      }
    },
    chooseImage() {
      uni.chooseImage({
        count: 1,
        success: res => this.goEditor(res.tempFilePaths[0])
      })
    },
    takePhoto() {
      uni.chooseImage({
        count: 1,
        sourceType: ['camera'],
        success: res => this.goEditor(res.tempFilePaths[0])
      })
    },
    goEditor(img) {
      uni.navigateTo({ url: '/pages/editor/editor?img=' + encodeURIComponent(img) })
    },
    openProject(p) {
      uni.navigateTo({ url: '/pages/detail/detail?id=' + p._id })
    }
  }
}
</script>

<style lang="scss" scoped>
.home {
  padding: 24rpx;
}
.hero {
  display: flex;
  flex-direction: column;
  padding: 40rpx 8rpx 24rpx;
}
.hero-title {
  font-size: 56rpx;
  font-weight: 800;
  color: #FF5C8A;
  letter-spacing: 2rpx;
}
.hero-sub {
  margin-top: 8rpx;
  color: #999;
}
.actions {
  display: flex;
  gap: 24rpx;
  margin: 16rpx 0 32rpx;
}
.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 44rpx 0;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 6rpx 20rpx rgba(255, 92, 138, 0.12);
}
.action-btn.primary {
  background: #FF5C8A;
}
.action-btn.primary .action-text {
  color: #fff;
}
.action-icon {
  font-size: 64rpx;
}
.action-text {
  margin-top: 12rpx;
  font-weight: 600;
}
.recent {
  margin-top: 8rpx;
}
.card-title {
  font-weight: 700;
  margin-bottom: 12rpx;
}
.proj-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.proj-item:last-child {
  border-bottom: none;
}
.proj-info {
  display: flex;
  flex-direction: column;
}
.proj-title {
  font-weight: 600;
}
.proj-meta {
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
}
.proj-arrow {
  color: #ccc;
  font-size: 40rpx;
}
.tip {
  margin-top: 8rpx;
  text-align: center;
}
.tip-title {
  font-weight: 700;
  font-size: 32rpx;
}
.tip-text {
  display: block;
  margin-top: 12rpx;
  color: #999;
}
</style>