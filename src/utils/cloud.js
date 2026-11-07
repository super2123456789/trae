// 数据存储：优先微信云开发，未配置云环境时回退到本地存储（开箱即用）
import { CLOUD_ENV } from './config'

let db = null
let ready = false

const LOCAL_KEY = 'pd_projects'

export function initCloud() {
  ready = false
  try {
    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined' && wx.cloud && CLOUD_ENV) {
      wx.cloud.init({ env: CLOUD_ENV, traceUser: true })
      db = wx.cloud.database()
      ready = true
    }
    // #endif
  } catch (e) {
    ready = false
  }
}

export function isCloudReady() {
  return ready
}

function localList() {
  return uni.getStorageSync(LOCAL_KEY) || []
}

function writeLocal(list) {
  uni.setStorageSync(LOCAL_KEY, list)
}

export async function saveProject(project) {
  if (ready) {
    const data = { ...project, createdAt: project.createdAt || Date.now(), updatedAt: Date.now() }
    if (project._id) {
      await db.collection('projects').doc(project._id).update({ data: { ...data, _id: undefined } })
      return project._id
    }
    const res = await db.collection('projects').add({ data })
    return res._id
  }
  const list = localList()
  const id = project._id || 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  const item = { ...project, _id: id, createdAt: project.createdAt || Date.now(), updatedAt: Date.now() }
  const idx = list.findIndex(p => p._id === id)
  if (idx >= 0) list[idx] = item
  else list.unshift(item)
  writeLocal(list)
  return id
}

export async function listProjects() {
  if (ready) {
    const res = await db.collection('projects').orderBy('updatedAt', 'desc').limit(100).get()
    return res.data
  }
  return localList()
}

export async function getProject(id) {
  if (ready) {
    const res = await db.collection('projects').doc(id).get()
    return res.data
  }
  return localList().find(p => p._id === id)
}

export async function updateProject(id, patch) {
  if (ready) {
    await db.collection('projects').doc(id).update({ data: { ...patch, updatedAt: Date.now() } })
    return
  }
  const list = localList()
  const idx = list.findIndex(p => p._id === id)
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch, updatedAt: Date.now() }
    writeLocal(list)
  }
}

export async function deleteProject(id) {
  if (ready) {
    await db.collection('projects').doc(id).remove()
    return
  }
  writeLocal(localList().filter(p => p._id !== id))
}

export async function uploadImage(filePath) {
  if (ready) {
    const ext = (filePath.split('.').pop() || 'png').toLowerCase()
    const cloudPath = 'images/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext
    const res = await wx.cloud.uploadFile({ cloudPath, filePath })
    return res.fileID
  }
  return filePath
}

// 分享：生成 token 快照，好友可打开查看
export async function createShare(project) {
  const token = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  if (ready) {
    await db.collection('shares').add({ data: { token, snapshot: project, createdAt: Date.now() } })
  } else {
    const shares = uni.getStorageSync('pd_shares') || {}
    shares[token] = project
    uni.setStorageSync('pd_shares', shares)
  }
  return token
}

export async function getShare(token) {
  if (ready) {
    const res = await db.collection('shares').where({ token }).limit(1).get()
    return res.data[0] ? res.data[0].snapshot : null
  }
  const shares = uni.getStorageSync('pd_shares') || {}
  return shares[token] || null
}

export async function generatePdf(payload) {
  if (!ready) {
    throw new Error('LOCAL_PDF_NOT_SUPPORTED')
  }
  const res = await wx.cloud.callFunction({ name: 'generatePdf', data: payload })
  return res.result
}