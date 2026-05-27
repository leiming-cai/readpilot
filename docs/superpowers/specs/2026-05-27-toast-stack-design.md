# ReadPilot Toast 堆叠功能设计

## 概述

为 ReadPilot Chrome 扩展的 AI 解释 Toast 实现多 toast 堆叠显示功能。当新 toast 到来时，如果上一个尚未关闭，新的 toast 会在上一个下方显示。最多同时显示 3 个 toast，超过时自动关闭最早的 toast。

## 背景

当前实现只支持单个 toast，新 toast 会直接替换旧 toast。用户希望能够同时看到多个 toast，特别是在连续划词解释时。

## 设计决策

| 决策点 | 选择 |
|--------|------|
| 堆叠方向 | 向下堆叠（向下扩展，越早的越靠上） |
| 移除方式 | 滑出动画（向右滑出） |
| Toast 间距 | 12px |
| 关闭按钮行为 | 只关闭自己 |
| 最大数量 | 3 个 |

## 架构

### 数据结构

```javascript
toastQueue: Array<{
  id: number,           // 递增 ID
  element: HTMLElement, // toast DOM 元素
  countdownInterval: number, // setInterval ID
  remainingSeconds: number  // 剩余秒数
}>

// 常量
MAX_TOASTS = 3
TOAST_SPACING = 12
TOAST_BASE_TOP = 24
ESTIMATED_TOAST_HEIGHT = 80
```

### 核心函数

| 函数 | 职责 |
|------|------|
| `createToast()` | 工厂函数，创建 toast DOM 元素（保持不变） |
| `showToast(message, isError, showCountdown)` | 创建 toast 入队，检查是否超限，移除最早的，重新定位所有 toast |
| `hideToast(toastId)` | 停止倒计时，播放滑出动画，从队列移除，重新定位 |
| `positionToasts()` | 遍历队列，重新计算每个 toast 的 top 位置 |
| `enqueueToast(toastData)` | 添加 toast 到队列尾部 |
| `dequeueToast()` | 移除队列头部 toast（带动画） |
| `generateToastId()` | 生成递增的唯一 ID |

### Toast 位置计算

```javascript
function positionToasts() {
  toastQueue.forEach((toast, index) => {
    const top = TOAST_BASE_TOP + index * (ESTIMATED_TOAST_HEIGHT + TOAST_SPACING);
    toast.element.style.top = `${top}px`;
  });
}
```

## 用户交互流程

### 场景 1：正常显示（< 3 个 toast）

1. 用户划词 → 显示 Toast 1（top: 24px）
2. 用户再次划词 → Toast 2 入队（top: 116px）
3. Toast 1 仍在显示
4. 用户再次划词 → Toast 3 入队（top: 208px）

### 场景 2：超过最大数量

1. 已有 3 个 toast 显示
2. 用户再次划词 → Toast 4 到来
3. Toast 1（最早的）向右滑出（translateX: 120%），opacity: 0
4. 300ms 后从 DOM 移除
5. Toast 2 和 Toast 3 向上移动到新位置
6. Toast 4 入队显示

### 场景 3：手动关闭

1. 用户点击 Toast 2 的关闭按钮
2. Toast 2 停止倒计时，向右滑出
3. Toast 3 向上移动到 Toast 2 的位置

### 场景 4：倒计时自动关闭

1. Toast 1 倒计时结束（60s）
2. Toast 1 向右滑出
3. Toast 2 和 Toast 3 向上移动

## 视觉效果

| 属性 | 值 |
|------|-----|
| 位置 | fixed, right: 24px |
| 初始 top | 24px |
| Toast 高度 | 约 80px（内容自适应） |
| Toast 间距 | 12px |
| 堆叠方向 | 向下（index 越大，top 越大） |
| 入场动画 | translateX(120%) → translateX(0), 300ms ease |
| 退场动画 | translateX(0) → translateX(120%), 300ms ease |
| 关闭按钮 | 右上角 X 图标 |

## 实现变更

### 新增变量

```javascript
let toastQueue = [];
let toastIdCounter = 0;
const MAX_TOASTS = 3;
const TOAST_SPACING = 12;
const TOAST_BASE_TOP = 24;
const ESTIMATED_TOAST_HEIGHT = 80;
```

### 修改 showToast

```javascript
function showToast(message, isError = false, showCountdown = true) {
  // 1. 如果队列已满，移除最早的
  if (toastQueue.length >= MAX_TOASTS) {
    dequeueToast();
  }

  // 2. 创建新 toast
  const toastData = createToastData(message, isError, showCountdown);
  enqueueToast(toastData);
}
```

### 新增辅助函数

```javascript
function createToastData(message, isError, showCountdown) {
  const id = ++toastIdCounter;
  const element = createToast();
  // ... 设置内容、样式、事件
  return { id, element, countdownInterval: null, remainingSeconds: TOAST_DURATION };
}

function enqueueToast(toastData) {
  toastQueue.push(toastData);
  positionToasts();
  // 显示动画
  toastData.element.style.display = 'block';
  requestAnimationFrame(() => {
    toastData.element.style.transform = 'translateX(0)';
    toastData.element.style.opacity = '1';
  });
  // 启动倒计时
  if (showCountdown && !toastData.isError) {
    startCountdownForToast(toastData);
  }
}

function dequeueToast() {
  const oldest = toastQueue.shift();
  hideToastElement(oldest);
  positionToasts();
}

function positionToasts() {
  toastQueue.forEach((toast, index) => {
    const top = TOAST_BASE_TOP + index * (ESTIMATED_TOAST_HEIGHT + TOAST_SPACING);
    toast.element.style.top = `${top}px`;
  });
}

function hideToastElement(toastData) {
  stopCountdownForToast(toastData);
  toastData.element.style.transform = 'translateX(120%)';
  toastData.element.style.opacity = '0';
  setTimeout(() => {
    toastData.element.remove();
  }, 300);
}
```

## 错误处理

- API 错误 toast 正常入队，同样受 max 限制
- 网络错误 toast 同上
- 所有 toast 独立管理自己的倒计时

## 测试场景

1. 连续划词 3 次，验证 3 个 toast 正确堆叠
2. 连续划词 4 次，验证第 4 次时最早的 toast 滑出
3. 手动关闭中间 toast，验证剩余 toast 向上移动
4. 等待 60s，验证倒计时结束的 toast 自动关闭
5. 验证关闭按钮只关闭自己，不影响其他 toast
