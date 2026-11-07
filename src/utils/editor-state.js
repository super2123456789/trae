// 图案编辑状态：扁平网格 + 撤销/重做 + 编辑操作
export const EMPTY = -1

export class EditorState {
  constructor(width, height, indices) {
    this.W = width
    this.H = height
    this.grid = indices ? Int16Array.from(indices) : new Int16Array(width * height).fill(EMPTY)
    this.undoStack = [Int16Array.from(this.grid)]
    this.redoStack = []
  }

  inBounds(x, y) {
    return x >= 0 && x < this.W && y >= 0 && y < this.H
  }

  get(x, y) {
    return this.grid[y * this.W + x]
  }

  set(x, y, v) {
    this.grid[y * this.W + x] = v
  }

  // 完成一次操作后提交历史
  commit() {
    this.undoStack.push(Int16Array.from(this.grid))
    if (this.undoStack.length > 30) this.undoStack.shift()
    this.redoStack.length = 0
  }

  undo() {
    if (this.undoStack.length <= 1) return false
    this.redoStack.push(this.undoStack.pop())
    this.grid = Int16Array.from(this.undoStack[this.undoStack.length - 1])
    return true
  }

  redo() {
    if (this.redoStack.length === 0) return false
    const nxt = this.redoStack.pop()
    this.undoStack.push(nxt)
    this.grid = Int16Array.from(nxt)
    return true
  }

  paint(x, y, color) {
    if (!this.inBounds(x, y)) return false
    this.set(x, y, color)
    return true
  }

  erase(x, y) {
    return this.paint(x, y, EMPTY)
  }

  fill(x, y, color) {
    if (!this.inBounds(x, y)) return false
    const target = this.get(x, y)
    if (target === color) return false
    const stack = [[x, y]]
    let changed = false
    while (stack.length) {
      const [cx, cy] = stack.pop()
      if (!this.inBounds(cx, cy)) continue
      if (this.get(cx, cy) !== target) continue
      this.set(cx, cy, color)
      changed = true
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
    }
    return changed
  }

  line(x0, y0, x1, y1, color) {
    let dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    for (;;) {
      if (this.inBounds(x0, y0)) this.set(x0, y0, color)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x0 += sx
      }
      if (e2 <= dx) {
        err += dx
        y0 += sy
      }
    }
    return true
  }

  rect(x0, y0, x1, y1, color) {
    const xa = Math.min(x0, x1)
    const xb = Math.max(x0, x1)
    const ya = Math.min(y0, y1)
    const yb = Math.max(y0, y1)
    for (let y = ya; y <= yb; y++) {
      for (let x = xa; x <= xb; x++) {
        if (this.inBounds(x, y)) this.set(x, y, color)
      }
    }
    return true
  }

  mirrorH() {
    const { W, H } = this
    const n = new Int16Array(W * H)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        n[y * W + (W - 1 - x)] = this.grid[y * W + x]
      }
    }
    this.grid = n
    return true
  }

  mirrorV() {
    const { W, H } = this
    const n = new Int16Array(W * H)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        n[(H - 1 - y) * W + x] = this.grid[y * W + x]
      }
    }
    this.grid = n
    return true
  }

  toArray() {
    return Array.from(this.grid)
  }
}