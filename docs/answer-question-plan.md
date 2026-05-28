# ReadPilot 答题功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增答题功能 - 自动分析页面题目并生成答案，以侧边面板展示

**Architecture:** 用户点击 popup 中的"答题"按钮 → content.js 提取页面内容 → popup.js 调用 AI API 分析题目 → content.js 创建侧边面板渲染题目和答案

**Tech Stack:** Chrome Extension (Manifest V3), Vanilla JS, chrome.storage, chrome.scripting

---

## 文件变更概览

| 文件 | 变更内容 |
|------|----------|
| `popup.html` | 新增"答题"按钮 |
| `popup.css` | 新增按钮样式 |
| `popup.js` | 新增 `answerQuestions()` 函数和 AI 调用逻辑 |
| `content.js` | 新增侧边面板 DOM 创建、渲染、关闭逻辑 |
| `_locales/zh_CN/messages.json` | 新增中文 i18n |
| `_locales/en/messages.json` | 新增英文 i18n |

---

## Task 1: 添加 i18n 文本

**Files:**
- Modify: `_locales/zh_CN/messages.json`
- Modify: `_locales/en/messages.json`

- [ ] **Step 1: 添加中文 i18n**

在 `messages.json` 末尾添加：

```json
,
"answerQuestions": {
  "message": "答题",
  "description": "Answer questions button text"
},
"answerQuestionsBtn": {
  "message": "答题",
  "description": "Answer questions button in popup"
},
"analyzingQuestions": {
  "message": "正在分析题目...",
  "description": "Loading state when analyzing questions"
},
"answerResults": {
  "message": "答题结果",
  "description": "Answer results panel title"
},
"noQuestionsFound": {
  "message": "未找到题目",
  "description": "Message when no questions found"
},
"questionsFound": {
  "message": "找到 $COUNT$ 道题目",
  "description": "Number of questions found",
  "placeholders": {
    "count": {
      "content": "$1",
      "example": "5"
    }
  }
},
"closePanel": {
  "message": "关闭",
  "description": "Close panel button"
}
```

- [ ] **Step 2: 添加英文 i18n**

在 `messages.json` 末尾添加：

```json
,
"answerQuestions": {
  "message": "Answer Questions",
  "description": "Answer questions button text"
},
"answerQuestionsBtn": {
  "message": "Answer Questions",
  "description": "Answer questions button in popup"
},
"analyzingQuestions": {
  "message": "Analyzing questions...",
  "description": "Loading state when analyzing questions"
},
"answerResults": {
  "message": "Answer Results",
  "description": "Answer results panel title"
},
"noQuestionsFound": {
  "message": "No questions found",
  "description": "Message when no questions found"
},
"questionsFound": {
  "message": "$COUNT$ questions found",
  "description": "Number of questions found",
  "placeholders": {
    "count": {
      "content": "$1",
      "example": "5"
    }
  }
},
"closePanel": {
  "message": "Close",
  "description": "Close panel button"
}
```

- [ ] **Step 3: Commit**

```bash
git add _locales/zh_CN/messages.json _locales/en/messages.json
git commit -m "feat(i18n): add answer question feature i18n texts"
```

---

## Task 2: Popup 新增答题按钮

**Files:**
- Modify: `popup.html`
- Modify: `popup.css`

- [ ] **Step 1: 在 popup.html 中添加答题按钮**

在 `summarizeBtn` 按钮后添加：

```html
<button id="answerBtn" class="summarize-btn" data-i18n-title="answerQuestionsBtn" title="Answer Questions">
  <svg class="btn-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M9 2L3 6L9 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M11 10L17 6L11 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3 12H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M3 16H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
  <span data-i18n="answerQuestions">Answer Questions</span>
</button>
```

- [ ] **Step 2: 添加 loading 状态元素**

在 `loadingState` 后添加：

```html
<div id="answerLoadingState" class="loading-state hidden">
  <div class="spinner"></div>
  <p data-i18n="analyzingQuestions">Analyzing questions...</p>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add popup.html
git commit -m "feat(popup): add answer questions button"
```

---

## Task 3: Popup.js 实现答题逻辑

**Files:**
- Modify: `popup.js`

- [ ] **Step 1: 获取 DOM 元素**

在 `summarizeBtn` 定义后添加：

```javascript
const answerBtn = document.getElementById('answerBtn');
const answerLoadingState = document.getElementById('answerLoadingState');
```

- [ ] **Step 2: 修改 showState 函数**

更新 `showState` 函数以支持新的 loading 状态：

```javascript
function showState(state) {
  loadingState.classList.add('hidden');
  answerLoadingState.classList.add('hidden');
  summaryOutput.classList.add('hidden');
  errorState.classList.add('hidden');
  emptyState.classList.add('hidden');
  state.classList.remove('hidden');
}
```

- [ ] **Step 3: 添加 answerQuestions 函数**

在 `summarizePage` 函数后添加：

```javascript
async function answerQuestions() {
  showState(answerLoadingState);
  answerBtn.disabled = true;

  try {
    const apiKey = await checkApiKey();
    if (!apiKey) {
      showError(getMessage('apiKeyNotConfigured'), false, true);
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      showError(getMessage('cannotAccessPage'));
      return;
    }

    let results;
    try {
      results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractMainContent
      });
    } catch (error) {
      console.error('Script injection error:', error);
      showError(getMessage('contentScriptNotReady'), true);
      return;
    }

    if (!results || !results[0] || !results[0].result) {
      showError(getMessage('noContentToSummarize'));
      return;
    }

    const content = results[0].result;
    if (content.trim().length === 0) {
      showError(getMessage('noContentToSummarize'));
      return;
    }

    const settings = await new Promise((resolve) => {
      chrome.storage.local.get(['apiBaseUrl', 'apiProvider', 'maxTokens'], (result) => {
        resolve({
          apiBaseUrl: result.apiBaseUrl || 'https://api.deepseek.com',
          apiProvider: result.apiProvider || 'deepseek',
          maxTokens: result.maxTokens || 1000
        });
      });
    });

    const answerPrompt = `你是一个答题助手。请分析以下页面内容，找出所有题目（问句形式）并给出准确答案。
返回格式为 JSON：
{
  "questions": [
    {"question": "题目1", "answer": "答案1"},
    {"question": "题目2", "answer": "答案2"}
  ]
}
如果页面中没有题目，返回空的 questions 数组。
只返回 JSON，不要有其他文字。`;

    const apiResponse = await fetch(`${settings.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: settings.apiProvider === 'openai' ? 'gpt-4' : 'deepseek-chat',
        messages: [
          { role: 'system', content: answerPrompt },
          { role: 'user', content: content }
        ],
        max_tokens: settings.maxTokens,
        temperature: 0.7
      })
    });

    if (!apiResponse.ok) {
      if (apiResponse.status === 429) {
        showError(getMessage('apiRateLimit'), true);
      } else if (apiResponse.status === 401) {
        showError(getMessage('invalidApiKey'));
      } else {
        showError(getMessage('apiError', [apiResponse.status.toString()]), true);
      }
      return;
    }

    const data = await apiResponse.json();
    const aiContent = data.choices?.[0]?.message?.content || '';

    // Parse JSON response
    let answerData;
    try {
      // Extract JSON from response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        answerData = JSON.parse(jsonMatch[0]);
      } else {
        answerData = { questions: [] };
      }
    } catch (e) {
      console.error('Failed to parse answer JSON:', e);
      answerData = { questions: [] };
    }

    // Send results to content script to display in side panel
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_ANSWER_PANEL',
        questions: answerData.questions || []
      });
    }

  } catch (error) {
    console.error('Answer questions error:', error);
    showError(getMessage('connectionError', [error.message || 'Unknown error']), true);
  } finally {
    answerBtn.disabled = false;
  }
}
```

- [ ] **Step 4: 绑定事件**

在文件末尾添加：

```javascript
answerBtn.addEventListener('click', answerQuestions);
```

- [ ] **Step 5: Commit**

```bash
git add popup.js
git commit -m "feat(popup): implement answer questions logic"
```

---

## Task 4: Content.js 实现侧边面板

**Files:**
- Modify: `content.js`

- [ ] **Step 1: 添加面板常量**

在文件顶部常量定义区域添加：

```javascript
const ANSWER_PANEL_ID = 'readpilot-answer-panel';
const ANSWER_PANEL_CLOSE_BTN_ID = 'readpilot-answer-panel-close';
```

- [ ] **Step 2: 添加 createAnswerPanel 函数**

在 `createToastElement` 函数前添加：

```javascript
function createAnswerPanel() {
  const panel = document.createElement('div');
  panel.id = ANSWER_PANEL_ID;
  panel.innerHTML = `
    <div class="answer-panel-header">
      <h3>${getMessage('answerResults')}</h3>
      <button id="${ANSWER_PANEL_CLOSE_BTN_ID}" class="answer-panel-close" title="${getMessage('closePanel')}">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="answer-panel-content"></div>
  `;
  panel.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 360px;
    height: 100vh;
    background: rgba(15, 23, 42, 0.95);
    color: #f1f5f9;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: 2147483647;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    display: flex;
    flex-direction: column;
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.3);
  `;

  const headerStyle = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  `;
  panel.querySelector('.answer-panel-header').style.cssText = headerStyle;

  const titleStyle = `
    font-size: 16px;
    font-weight: 600;
    margin: 0;
  `;
  panel.querySelector('h3').style.cssText = titleStyle;

  const closeBtnStyle = `
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  panel.querySelector('.answer-panel-close').style.cssText = closeBtnStyle;

  const contentStyle = `
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
  `;
  panel.querySelector('.answer-panel-content').style.cssText = contentStyle;

  // Close button handler
  panel.querySelector(`#${ANSWER_PANEL_CLOSE_BTN_ID}`).addEventListener('click', () => {
    closeAnswerPanel();
  });

  document.body.appendChild(panel);
  return panel;
}
```

- [ ] **Step 3: 添加 closeAnswerPanel 函数**

```javascript
function closeAnswerPanel() {
  const panel = document.getElementById(ANSWER_PANEL_ID);
  if (panel) {
    panel.style.transform = 'translateX(100%)';
    setTimeout(() => {
      panel.remove();
    }, 300);
  }
}
```

- [ ] **Step 4: 添加 renderAnswerPanel 函数**

```javascript
function renderAnswerPanel(questions) {
  let panel = document.getElementById(ANSWER_PANEL_ID);

  if (!panel) {
    panel = createAnswerPanel();
  }

  const content = panel.querySelector('.answer-panel-content');
  content.innerHTML = '';

  if (!questions || questions.length === 0) {
    content.innerHTML = `
      <div style="text-align: center; color: #94a3b8; padding: 40px 0;">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="margin-bottom: 16px;">
          <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2"/>
          <path d="M24 16v8M24 28h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p style="margin: 0;">${getMessage('noQuestionsFound')}</p>
      </div>
    `;
  } else {
    const countText = getMessage('questionsFound', [questions.length.toString()]);
    content.innerHTML = `
      <p style="color: #94a3b8; font-size: 13px; margin-bottom: 16px;">${countText}</p>
    `;

    questions.forEach((item, index) => {
      const qaItem = document.createElement('div');
      qaItem.style.cssText = `
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
      `;

      const qTitle = document.createElement('div');
      qTitle.style.cssText = `
        font-weight: 600;
        margin-bottom: 8px;
        color: #e2e8f0;
      `;
      qTitle.textContent = `Q${index + 1}: ${item.question}`;

      const aContent = document.createElement('div');
      aContent.style.cssText = `
        color: #94a3b8;
        font-size: 14px;
        line-height: 1.6;
      `;
      aContent.textContent = `A: ${item.answer}`;

      qaItem.appendChild(qTitle);
      qaItem.appendChild(aContent);
      content.appendChild(qaItem);
    });
  }

  // Show panel with animation
  requestAnimationFrame(() => {
    panel.style.transform = 'translateX(0)';
  });
}
```

- [ ] **Step 5: 添加 ESC 关闭和消息监听**

在文件末尾（最后一个 `});` 前）添加：

```javascript
// ESC key to close answer panel
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAnswerPanel();
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SHOW_ANSWER_PANEL') {
    renderAnswerPanel(message.questions);
    sendResponse({ success: true });
  }
  return true;
});
```

- [ ] **Step 6: Commit**

```bash
git add content.js
git commit -m "feat(content): add answer panel side panel UI"
```

---

## Task 5: 测试与验证

- [ ] **Step 1: 测试 i18n**

刷新扩展，在 popup 中验证"答题"按钮和 loading 文字是否正确显示

- [ ] **Step 2: 测试答题功能**

1. 打开包含题目的网页
2. 点击"答题"按钮
3. 验证侧边面板是否从右侧滑入
4. 验证题目和答案是否正确显示
5. 验证关闭按钮和 ESC 键是否正常工作

- [ ] **Step 3: 验证错误处理**

1. 未配置 API Key 时是否提示
2. 网络错误时是否显示重试

---

## 完整提交

```bash
git add -A
git commit -m "feat: add answer questions feature with side panel"
git push
```

---

## Spec 覆盖检查

- [x] 答题按钮在 popup 中
- [x] 点击后提取页面内容
- [x] AI 检测题目并生成答案
- [x] 侧边面板展示结果
- [x] ESC 键关闭面板
- [x] i18n 支持
- [x] 错误处理

**实现计划完成。**
