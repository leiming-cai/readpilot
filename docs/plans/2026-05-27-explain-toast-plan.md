# AI 解释 Toast 优化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化划词"AI解释"功能的 toast 通知：位置改为右上角，增加60秒倒计时显示和关闭按钮

**Architecture:** 修改 content.js 中的 createToast() 和 showToast() 函数，重构 toast 结构和计时逻辑，添加 i18n 消息支持

**Tech Stack:** Chrome Extension Manifest V3, Vanilla JS, Chrome i18n API

---

## 文件变更

| 文件 | 变更 |
|------|------|
| `content.js` | 修改 toast 位置、结构、倒计时逻辑 |
| `_locales/en/messages.json` | 添加 i18n 消息 |
| `_locales/zh_CN/messages.json` | 添加 i18n 消息 |

---

## Task 1: 更新 i18n 消息

**Files:**
- Modify: `C:\Users\蔡雷鸣\ReadPilot\_locales\en\messages.json`
- Modify: `C:\Users\蔡雷鸣\ReadPilot\_locales\zh_CN\messages.json`

- [ ] **Step 1: 添加 i18n 消息**

在 `gettingExplanation` 条目后添加：

```json
,
"closeButton": {
  "message": "Close",
  "description": "Close button tooltip"
}
```

在 `zh_CN/messages.json` 中添加：

```json
,
"closeButton": {
  "message": "关闭",
  "description": "Close button tooltip"
}
```

- [ ] **Step 2: Commit**

```bash
git add _locales/en/messages.json _locales/zh_CN/messages.json
git commit -m "feat(i18n): add closeButton message"
```

---

## Task 2: 重构 content.js toast 功能

**Files:**
- Modify: `C:\Users\蔡雷鸣\ReadPilot\content.js`

- [ ] **Step 1: 添加倒计时相关常量和变量**

在文件顶部（MIN_SELECTION_LENGTH 附近）添加：

```javascript
const TOAST_DURATION = 60; // seconds
let toastCountdownInterval = null;
let toastRemainingSeconds = TOAST_DURATION;
```

- [ ] **Step 2: 修改 createToast() 函数**

替换现有的 createToast 函数：

```javascript
function createToast() {
  const toast = document.createElement('div');
  toast.id = TOAST_ID;
  toast.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    transform: translateX(120%);
    max-width: 360px;
    padding: 16px 20px;
    background: rgba(15, 23, 42, 0.95);
    color: #f1f5f9;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.5;
    border-radius: 12px;
    z-index: 2147483647;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    opacity: 0;
    transition: transform 0.3s ease, opacity 0.3s ease;
  `;

  toast.innerHTML = `
    <div class="toast-header">
      <span class="toast-countdown"></span>
      <button class="toast-close">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="toast-content"></div>
  `;

  // Add header and content styling
  const style = document.createElement('style');
  style.textContent = `
    .toast-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .toast-countdown {
      font-size: 12px;
      color: #94a3b8;
      font-weight: 500;
    }
    .toast-close {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: color 0.2s, background 0.2s;
    }
    .toast-close:hover {
      color: #f1f5f9;
      background: rgba(255,255,255,0.1);
    }
    .toast-content {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  `;
  toast.appendChild(style);

  // Close button handler
  toast.querySelector('.toast-close').addEventListener('click', () => {
    hideToast();
  });

  document.body.appendChild(toast);
  return toast;
}
```

- [ ] **Step 3: 添加 hideToast() 函数**

在 createToast() 后添加：

```javascript
function hideToast() {
  if (toastElement) {
    stopCountdown();
    toastElement.style.transform = 'translateX(120%)';
    toastElement.style.opacity = '0';
    setTimeout(() => {
      if (toastElement) {
        toastElement.style.display = 'none';
      }
    }, 300);
  }
}
```

- [ ] **Step 4: 添加倒计时函数**

在 hideToast() 后添加：

```javascript
function startCountdown(seconds, onComplete) {
  stopCountdown();
  toastRemainingSeconds = seconds;
  updateCountdownDisplay();

  toastCountdownInterval = setInterval(() => {
    toastRemainingSeconds--;
    updateCountdownDisplay();

    if (toastRemainingSeconds <= 0) {
      stopCountdown();
      if (onComplete) onComplete();
    }
  }, 1000);
}

function stopCountdown() {
  if (toastCountdownInterval) {
    clearInterval(toastCountdownInterval);
    toastCountdownInterval = null;
  }
}

function updateCountdownDisplay() {
  if (toastElement) {
    const countdownEl = toastElement.querySelector('.toast-countdown');
    if (countdownEl && toastRemainingSeconds > 0) {
      countdownEl.textContent = `${toastRemainingSeconds}s`;
    }
  }
}
```

- [ ] **Step 5: 修改 showToast() 函数**

替换现有的 showToast 函数：

```javascript
function showToast(message, isError = false, showCountdown = true) {
  if (!toastElement) {
    toastElement = createToast();
  }

  toastElement.style.background = isError
    ? 'rgba(239, 68, 68, 0.95)'
    : 'rgba(15, 23, 42, 0.95)';

  const contentEl = toastElement.querySelector('.toast-content');
  const countdownEl = toastElement.querySelector('.toast-countdown');

  contentEl.textContent = message;

  if (showCountdown && !isError) {
    countdownEl.style.display = 'block';
    startCountdown(TOAST_DURATION, () => {
      hideToast();
    });
  } else {
    countdownEl.style.display = 'none';
  }

  toastElement.style.display = 'block';
  toastElement.style.transform = 'translateX(0)';
  toastElement.style.opacity = '1';
}
```

- [ ] **Step 6: 修改 handleExplain() 函数**

找到 `showToast(getMessage('gettingExplanation'));` 调用，改为：

```javascript
showToast(getMessage('gettingExplanation'), false, false); // loading state, no countdown
```

找到 `showToast(explanation);` 调用（API 成功后），确保传入默认参数（会显示倒计时）

找到错误处理中的 `showToast(getMessage(...), true)` 调用，确保 `isError=true` 时不会显示倒计时

- [ ] **Step 7: 更新 handleExplain 中的错误处理**

在 catch 块中，更新错误显示调用以确保 isError=true：

```javascript
showToast(getMessage('connectionError', [error.message]), true);
```

- [ ] **Step 8: Commit**

```bash
git add content.js
git commit -m "feat(content): redesign explain toast with countdown and close button"
```

---

## Task 3: 验证和测试

- [ ] **Step 1: 本地测试**

1. 刷新扩展
2. 刷新测试页面
3. 划词点击 AI 解释按钮
4. 验证 toast 显示在右上角
5. 验证倒计时显示（如 "60s"）
6. 验证关闭按钮可点击
7. 验证60秒后自动关闭

- [ ] **Step 2: 推送到 GitHub**

```bash
git push
```

---

## 验证清单

- [ ] Toast 显示在页面右上角
- [ ] Loading 状态（"正在获取解释..."）不显示倒计时
- [ ] 获取结果后开始60秒倒计时
- [ ] 倒计时实时更新（如 60s, 59s, 58s...）
- [ ] 点击关闭按钮立即关闭 toast
- [ ] 60秒后自动关闭
- [ ] 错误 toast 不显示倒计时
- [ ] i18n 中英文切换正常
