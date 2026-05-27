# Toast 复制按钮实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为每个 Toast 添加复制按钮，点击可复制解释内容

**Architecture:** 在 Toast HTML 结构中添加复制按钮，修改 CSS 样式实现 flex 布局，添加点击事件处理复制逻辑

**Tech Stack:** Vanilla JavaScript (content.js)

---

## File Structure

- Modify: `content.js` - 单一文件变更

---

## Task 1: 修改 HTML 结构添加复制按钮

**Files:**
- Modify: `content.js:75-154` (`createToastElement` 函数)

- [ ] **Step 1: 修改 HTML 结构**

在 `createToastElement` 函数中，找到：

```javascript
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
```

替换为：

```javascript
    toast.innerHTML = `
      <div class="toast-header">
        <span class="toast-countdown"></span>
        <button class="toast-close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="toast-body">
        <div class="toast-content"></div>
        <button class="toast-copy" title="${getMessage('copyButton') || 'Copy'}">
          <svg class="icon-copy" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <path d="M2 10V3a1 1 0 011-1h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <svg class="icon-check" width="14" height="14" viewBox="0 0 14 14" fill="none" style="display:none">
            <path d="M3 7l3 3 5-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    `;
```

---

## Task 2: 修改 CSS 样式添加 flex 布局

**Files:**
- Modify: `content.js:112-145` (style 元素内容)

- [ ] **Step 1: 添加 toast-body 和 toast-copy 样式**

在 `style.textContent` 中添加：

```javascript
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
      .toast-body {
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }
      .toast-content {
        flex: 1;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      .toast-copy {
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
        flex-shrink: 0;
      }
      .toast-copy:hover {
        color: #f1f5f9;
        background: rgba(255,255,255,0.1);
      }
      .toast-copy .icon-check {
        display: none;
      }
      .toast-copy.copied .icon-copy {
        display: none;
      }
      .toast-copy.copied .icon-check {
        display: block;
        color: #22c55e;
      }
    `;
```

---

## Task 3: 添加复制按钮点击事件处理

**Files:**
- Modify: `content.js:148-153` (createToastElement 函数末尾)

- [ ] **Step 1: 添加复制按钮点击事件**

在 `createToastElement` 函数的关闭按钮事件后，添加：

```javascript
    // Copy button handler
    toast.querySelector('.toast-copy').addEventListener('click', (e) => {
      e.stopPropagation();
      const content = toast.querySelector('.toast-content').textContent;
      navigator.clipboard.writeText(content).then(() => {
        const copyBtn = toast.querySelector('.toast-copy');
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.classList.remove('copied');
        }, 1500);
      }).catch(err => {
        console.error('Failed to copy:', err);
      });
    });
```

---

## Task 4: 验证和提交

**Files:**
- Modify: `content.js`

- [ ] **Step 1: 语法检查**

```bash
node --check content.js
```

- [ ] **Step 2: Git 提交**

```bash
git add content.js
git commit -m "feat(content): add copy button to toast"
```

---

## 验证清单

- [ ] 刷新扩展后，新的 Toast 右侧显示复制按钮
- [ ] 点击复制按钮，内容被复制到剪贴板
- [ ] 复制成功后按钮显示 ✓ 图标，1.5s 后恢复
- [ ] 多个 Toast 堆叠时，每个都有独立的复制按钮
