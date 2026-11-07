<script>
import { initCloud, isCloudReady } from '@/utils/cloud.js'

export default {
  onLaunch() {
    // 云开发初始化（未配置云环境时自动回退到本地存储，保证开箱即用）
    initCloud()
  },
  globalData: {
    cloudReady: isCloudReady()
  }
}
</script>

<style>
/* 全局基础样式：可爱像素风 */
page {
  background-color: #FFF4F8;
  color: #333;
  font-size: 28rpx;
  line-height: 1.5;
}

.button-primary {
  background: #FF5C8A;
  color: #fff;
  border-radius: 16rpx;
  font-weight: 600;
}
.button-primary[disabled] {
  background: #ffb3c8;
  color: #fff;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 6rpx 20rpx rgba(255, 92, 138, 0.08);
}
</style>