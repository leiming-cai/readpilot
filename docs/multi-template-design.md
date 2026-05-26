# ReadPilot 多模板摘要功能设计

## 1. 概述

在设置页面提供4个内置摘要模板 + 用户自定义模板支持，弹窗支持快速切换模板。

## 2. 内置模板

| ID | 名称(en) | 名称(zh) | Prompt |
|----|---------|---------|--------|
| `bulletSummary` | Bullet Summary | 简洁要点 | You are a professional summarizer. Read the following article and write a concise summary in 3-5 bullet points. Focus on the main points and key takeaways. Language: match the input language. |
| `detailedSummary` | Detailed Summary | 段落详摘 | You are a professional summarizer. Please write a detailed summary of 100-200 words covering the main topic, key arguments, and conclusions. Language: match the input language. |
| `keyTakeaways` | Key Takeaways | 关键信息 | You are a professional reading assistant. From the following article, extract: 1) What is the main topic 2) The 3 most important points or findings 3) Conclusions or recommendations. Language: match the input language. |
| `plainEnglish` | Plain English | 通俗解释 | You are a professional summarizer. Explain the core content of the following article in plain, easy-to-understand language. Assume the reader knows nothing about this topic. Avoid or explain technical jargon. Language: match the input language. |

**默认选中**：`plainEnglish`

## 3. 数据模型

```javascript
// chrome.storage.local
{
  apiKey: "...",
  apiBaseUrl: "https://api.deepseek.com",
  maxTokens: 1000,
  summaryTemplates: {
    defaultTemplate: "plainEnglish",  // 默认模板ID
    presets: {
      bulletSummary: { name: "简洁要点", nameEn: "Bullet Summary", prompt: "..." },
      detailedSummary: { name: "段落详摘", nameEn: "Detailed Summary", prompt: "..." },
      keyTakeaways: { name: "关键信息", nameEn: "Key Takeaways", prompt: "..." },
      plainEnglish: { name: "通俗解释", nameEn: "Plain English", prompt: "..." }
    },
    custom: {
      // 用户自定义模板，key格式: "custom_{timestamp}"
      "custom_1712345678": {
        name: "我的模板",
        prompt: "用户自定义的prompt..."
      }
    }
  }
}
```

## 4. 初始化流程

1. 首次安装时，从 `_locales` 加载内置4个模板到 `chrome.storage.local`
2. 用户编辑保存在本地，不影响内置模板
3. 自定义模板以 `custom_` 前缀存储

## 5. UI 变更

### 设置页面 (options.html)

新增 **"摘要模板"** 区块：

```
┌─ 摘要模板 ──────────────────────────────────────┐
│ 默认模板: [▼ 通俗解释                    ]      │
│                                                  │
│ ┌─ 简洁要点 ──────────────────────────────────┐ │
│ │ You are a professional summarizer...        │ │
│ │                              [编辑] [重置]   │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─ 段落详摘 ──────────────────────────────────┐ │
│ │ Please write a detailed summary...          │ │
│ │                              [编辑] [重置]   │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─ 关键信息 ──────────────────────────────────┐ │
│ │ From the following article, extract...       │ │
│ │                              [编辑] [重置]   │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─ 通俗解释 ──────────────────────────────────┐ │
│ │ Explain the core content in plain...        │ │
│ │                              [编辑] [重置]   │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ ── 自定义模板 ─────────────────────────────────│
│ ┌─ 我的模板 ──────────────────────────────────┐ │
│ │ 用户自定义的prompt...                        │ │
│ │                              [编辑] [删除]   │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│           [+ 添加自定义模板]                     │
└──────────────────────────────────────────────────┘
```

**模板编辑弹窗**：
- 名称输入框
- Prompt 输入框（textarea）
- 保存/取消按钮

### 弹窗页面 (popup.html)

```
┌────────────────────────────┐
│  ReadPilot            ⚙️  │
│                            │
│  [▼ 通俗解释        ]      │  ← 模板选择下拉
│                            │
│  ┌──────────────────────┐  │
│  │                      │  │
│  │   [Summarize Page]   │  │
│  │                      │  │
│  └──────────────────────┘  │
│                            │
│  Smart Reading Assistant    │
└────────────────────────────┘
```

## 6. i18n 策略

| 内容 | 存储位置 | 说明 |
|------|----------|------|
| 内置模板名称 | `_locales/*/messages.json` | 随语言切换 |
| 内置模板Prompt | `_locales/*/messages.json` | 随语言切换 |
| 自定义模板 | `chrome.storage.local` | 不翻译 |

## 7. 文件变更

| 文件 | 变更 |
|------|------|
| `_locales/en/messages.json` | 添加4个内置模板的name和prompt |
| `_locales/zh_CN/messages.json` | 添加4个内置模板的中文翻译 |
| `manifest.json` | 无变更 |
| `options.html` | 添加模板管理区块 |
| `options.js` | 添加模板CRUD逻辑 |
| `popup.html` | 添加模板选择下拉框 |
| `popup.js` | 读取并使用选中模板的prompt |

## 8. 状态码

| 状态 | 说明 |
|------|------|
| 0 | 成功 |
| 1 | 模板名称为空 |
| 2 | Prompt为空 |
| 3 | 自定义模板已达上限(10个) |

## 9. 实现顺序

1. 更新 `_locales/messages.json` 添加内置模板
2. 更新 `options.js` 添加模板存储结构和初始化逻辑
3. 更新 `options.html` 添加模板管理UI
4. 更新 `popup.html` 添加模板选择下拉
5. 更新 `popup.js` 使用选中的模板prompt
6. 更新 README 文档
