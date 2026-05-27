# ReadPilot Toast 堆叠功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Toast 堆叠功能，支持最多 3 个 toast 同时显示，超出时最早的 toast 滑出

**Architecture:** 通过 toastQueue 数组管理多个 toast DOM 元素，每个 toast 有独立的 top 位置（24px + index * 92px），超出 3 个时移除队列头部 toast

**Tech Stack:** Vanilla JavaScript (content.js)

---

## File Structure

- Modify: `content.js` - 核心实现文件

---

## Task 1: 添加 Toast 队列管理变量

**Files:**
- Modify: `content.js:1-20`

- [ ] **Step 1: 添加队列相关变量**

在 `TOAST_DURATION` 和 `TOAST_ID` 附近添加：

```javascript
const MAX_TOASTS = 3;
const TOAST_SPACING = 12;
const TOAST_BASE_TOP = 24;
const ESTIMATED_TOAST_HEIGHT = 80;

let toastQueue = [];
let toastIdCounter = 0;
```

---

## Task 2: 添加 Toast ID 生成和位置计算辅助函数

**Files:**
- Modify: `content.js:在 hideToast 函数后添加`

- [ ] **Step 1: 添加辅助函数**

在 `hideToast` 函数后添加：

```javascript
function generateToastId() {
  return ++toastIdCounter;
}

function getToastTopByIndex(index) {
  return TOAST_BASE_TOP + index * (ESTIMATED_TOAST_HEIGHT + TOAST_SPACING);
}

function positionToasts() {
  toastQueue.forEach((toast, index) => {
    const top = getToastTopByIndex(index);
    toast.element.style.top = `${top}px`;
  });
}
```

---

## Task 3: 重构 hideToast 为 hideToastById

**Files:**
- Modify: `content.js:151-162`

- [ ] **Step 1: 重构 hideToast 函数**

将现有 `hideToast` 重构为接收 toast ID：

```javascript
function hideToast(toastId) {
  const index = toastQueue.findIndex(t => t.id === toastId);
  if (index === -1) return;

  const toast = toastQueue[index];
  stopCountdownForToast(toast);

  toast.element.style.transform = 'translateX(120%)';
  toast.element.style.opacity = '0';

  setTimeout(() => {
    toast.element.remove();
  }, 300);

  toastQueue.splice(index, 1);
  positionToasts();
}

function stopCountdownForToast(toast) {
  if (toast.countdownInterval) {
    clearInterval(toast.countdownInterval);
    toast.countdownInterval = null;
  }
}
```

---

## Task 4: 添加 dequeueToast 函数

**Files:**
- Modify: `content.js:在 hideToastById 后添加`

- [ ] **Step 1: 添加 dequeueToast 函数**

```javascript
function dequeueToast() {
  if (toastQueue.length === 0) return;

  const oldest = toastQueue.shift();
  stopCountdownForToast(oldest);

  oldest.element.style.transform = 'translateX(120%)';
  oldest.element.style.opacity = '0';

  setTimeout(() => {
    oldest.element.remove();
  }, 300);

  positionToasts();
}
```

---

## Task 5: 修改 createToast 函数，添加 toast ID 支持

**Files:**
- Modify: `content.js:69-149`

- [ ] **Step 1: 为 createToast 添加 id 参数**

修改 `createToast` 函数签名，接收 `toastId` 参数，并更新 `querySelector` 选择器使用更精确的选择：

```javascript
function createToastElement(toastId) {
  const toast = document.createElement('div');
  toast.id = `${TOAST_ID}-${toastId}`;
  // ... 原有代码 ...
  // 修改关闭按钮事件处理
  toast.querySelector('.toast-close').addEventListener('click', () => {
    hideToast(toastId);
  });
  // ...
}
```

---

## Task 6: 重构 showToast 函数

**Files:**
- Modify: `content.js:208-234`

- [ ] **Step 1: 重构 showToast 函数**

将原来的 `showToast` 重构为使用队列：

```javascript
async function showToast(message, isError = false, showCountdown = true) {
  // 1. 如果队列已满，移除最早的
  if (toastQueue.length >= MAX_TOASTS) {
    dequeueToast();
  }

  // 2. 生成 ID 并创建 toast 元素
  const toastId = generateToastId();
  const toastElement = createToastElement(toastId);

  // 3. 设置内容
  const contentEl = toastElement.querySelector('.toast-content');
  contentEl.textContent = message;
  toastElement.style.background = isError
    ? 'rgba(239, 68, 68, 0.95)'
    : 'rgba(15, 23, 42, 0.95)';

  // 4. 隐藏倒计时（loading 状态）
  const countdownEl = toastElement.querySelector('.toast-countdown');
  countdownEl.style.display = 'none';

  // 5. 添加到 DOM
  document.body.appendChild(toastElement);

  // 6. 创建 toast 数据对象
  const toastData = {
    id: toastId,
    element: toastElement,
    countdownInterval: null,
    remainingSeconds: TOAST_DURATION,
    isError: isError
  };

  // 7. 入队并定位
  toastQueue.push(toastData);
  positionToasts();

  // 8. 显示动画
  requestAnimationFrame(() => {
    toastElement.style.transform = 'translateX(0)';
    toastElement.style.opacity = '1';
  });

  // 9. 返回 toast ID 供后续使用
  return toastId;
}
```

---

## Task 7: 添加 startCountdownForToast 函数

**Files:**
- Modify: `content.js:在 positionToasts 后添加`

- [ ] **Step 1: 添加 startCountdownForToast 函数**

```javascript
function startCountdownForToast(toastData) {
  stopCountdownForToast(toastData);
  toastData.remainingSeconds = TOAST_DURATION;
  updateCountdownDisplayForToast(toastData);

  toastData.countdownInterval = setInterval(() => {
    toastData.remainingSeconds--;
    updateCountdownDisplayForToast(toastData);

    if (toastData.remainingSeconds <= 0) {
      stopCountdownForToast(toastData);
      hideToast(toastData.id);
    }
  }, 1000);
}

function updateCountdownDisplayForToast(toastData) {
  const countdownEl = toastData.element.querySelector('.toast-countdown');
  if (countdownEl && toastData.remainingSeconds > 0) {
    countdownEl.textContent = `${toastData.remainingSeconds}s`;
  }
}
```

---

## Task 8: 修改 handleExplain 函数调用 showToast

**Files:**
- Modify: `content.js:236-295`

- [ ] **Step 1: 修改 handleExplain 函数**

需要修改调用方式，因为 `showToast` 现在是异步的并返回 toastId：

```javascript
async function handleExplain(selectedText) {
  // ... 验证逻辑不变 ...

  // loading 状态
  showToast(getMessage('gettingExplanation'), false, false);

  try {
    // ... API 调用 ...

    // 获取 toastId 并更新内容
    const explanation = data.choices?.[0]?.message?.content || getMessage('unableToGenerateExplanation');
    showToast(explanation);
  } catch (error) {
    showToast(getMessage('connectionError', [error.message]), true);
  }
}
```

---

## Task 9: 清理旧的单一 toast 相关变量和函数

**Files:**
- Modify: `content.js`

- [ ] **Step 1: 移除旧变量**

移除：
```javascript
let toastElement = null;  // 不再需要单例
let toastRemainingSeconds = TOAST_DURATION;  // 已移到 toastData 中
let toastCountdownInterval = null;  // 已移到 toastData 中
```

- [ ] **Step 2: 移除旧的 updateCountdownDisplay 函数**

旧的 `updateCountdownDisplay` 函数可以移除，因为已改用 `updateCountdownDisplayForToast`

- [ ] **Step 3: 移除旧的 startCountdown/stopCountdown 函数**

旧的函数已不需要，已被 `startCountdownForToast/stopCountdownForToast` 替代

---

## Task 10: 更新 createToastElement 设置初始 top 位置

**Files:**
- Modify: `content.js:createToastElement 函数`

- [ ] **Step 1: 修改 createToastElement 添加 top 样式**

在 toastElement.style.cssText 中添加 top 属性：

```javascript
toast.style.cssText = `
  position: fixed;
  top: 0;  /* 初始值，后面会被 positionToasts 覆盖 */
  right: 24px;
  transform: translateX(120%);
  opacity: 0;
  /* ... 其他样式 ... */
`;
```

---

## Task 11: 语法检查和测试

**Files:**
- Modify: `content.js`

- [ ] **Step 1: 运行语法检查**

```bash
node --check content.js
```

- [ ] **Step 2: Git 提交**

```bash
git add content.js
git commit -m "feat(content): implement toast stacking with max 3 toasts"
```

---

## 验证清单

- [ ] 连续划词 3 次，3 个 toast 正确垂直堆叠
- [ ] 划词第 4 次，最早的 toast 向右滑出消失
- [ ] 点击某个 toast 的关闭按钮，只关闭该 toast
- [ ] toast 60s 倒计时结束，自动关闭
- [ ] 关闭 toast 后，剩余 toast 向上移动到正确位置
- [ ] Loading 状态不显示倒计时
- [ ] Error toast 正常入队和显示
