# Toast 复制功能设计

## 概述

为每个 AI 解释 Toast 添加复制按钮，用户可以一键复制解释内容。

## 设计决策

| 决策点 | 选择 |
|--------|------|
| 位置 | 内容区右侧 |
| 反馈 | 复制成功后显示 "已复制" 提示，1.5s 后恢复 |

## UI 布局

```
┌────────────────────────────────────────┐
│ 60s                        [×]         │  ← Header: 倒计时 + 关闭
├────────────────────────────────────────┤
│ 解释内容文本...           [📋]         │  ← Content: 文字 + 复制按钮
└────────────────────────────────────────┘
```

## 实现要点

### HTML 结构变更

在 `.toast-content` 后添加复制按钮：

```html
<div class="toast-content"></div>
<button class="toast-copy">
  <svg>...</svg>
</button>
```

### CSS 样式

```css
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
}
.toast-copy:hover {
  color: #f1f5f9;
  background: rgba(255,255,255,0.1);
}
```

### 交互逻辑

1. 点击复制按钮
2. 使用 `navigator.clipboard.writeText()` 复制内容
3. 按钮内显示 "已复制" (1.5s)
4. 1.5s 后恢复原图标

### 复制成功反馈

按钮文字/图标切换为 "已复制"，1.5 秒后恢复。

## 文件变更

- `content.js`: 修改 `createToastElement()` 函数
