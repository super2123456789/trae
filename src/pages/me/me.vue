<template>
  <view class="me">
    <view class="profile card">
      <image v-if="user.avatar" class="avatar" :src="user.avatar" mode="aspectFill" />
      <view v-else class="avatar avatar-placeholder" @tap="login">👤</view>
      <view class="profile-info">
        <text class="nickname">{{ user.nickname || '未登录' }}</text>
        <text class="profile-sub">{{ user.nickname ? '拼豆爱好者' : '登录以同步与收藏图案' }}</text>
      </view>
      <button v-if="!user.nickname" class="login-btn" @tap="login">一键登录</button>
    </view>

    <view class="card section">
      <view class="card-title">我的收藏</view>
      <view v-if="favorites.length">
        <view class="proj-item" v-for="p in favorites" :key="p._id" @tap="openProject(p)">
          <view class="proj-info">
            <text class="proj-title">{{ p.title }}</text>
            <text class="proj-meta">{{ p.brandName }} · {{ p.W }}×{{ p.H }}</text>
          </view>
          <text class="proj-arrow">›</text>
        </view>
      </view>
      <text v-else class="empty">暂无收藏</text>
    </view>
  </view>
</template>

<script>
import { listProjects } from '@/utils/cloud.js'

export default {
  data() {
    return {
      user: { nickname: '', avatar: '' },
      favorites: []
    }
  },
  onShow() {
    this.loadUser()
    this.loadFavorites()
  },
  methods: {
    loadUser() {
      const u = uni.getStorageSync('pd_user')
      if (u) this.user = u
    },
    async loadFavorites() {
      try {
        const all = await listProjects()
        this.favorites = all.filter(p => p.isFavorite)
      } catch (e) {
        this.favorites = []
      }
    },
    login() {
      // #ifdef MP-WEIXIN
      uni.getUserProfile({
        desc: '用于展示头像昵称',
        success: res => {
          const u = { nickname: res.userInfo.nickName, avatar: res.userInfo.avatarUrl }
          this.user = u
          uni.setStorageSync('pd_user', u)
        },
        fail: () => {}
      })
      // #endif
    },
    openProject(p) {
      uni.navigateTo({ url: '/pages/detail/detail?id=' + p._id })
    }
  }
}
</script>

<style lang="scss" scoped>
.me {
  padding: 24rpx;
}
.profile {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}
.avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: #FFE3EC;
}
.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56rpx;
}
.profile-info {
  flex: 1;
  margin-left: 24rpx;
  display: flex;
  flex-direction: column;
}
.nickname {
  font-weight: 700;
  font-size: 34rpx;
}
.profile-sub {
  color: #999;
  font-size: 24rpx;
  margin-top: 4rpx;
}
.login-btn {
  background: #FF5C8A;
  color: #fff;
  font-size: 26rpx;
  border-radius: 32rpx;
  padding: 0 28rpx;
  line-height: 64rpx;
}
.section {
  margin-bottom: 24rpx;
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
.empty {
  color: #bbb;
}
</style>