# 多模板摘要功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在设置页面提供4个内置摘要模板 + 自定义模板支持，弹窗支持快速切换模板

**Architecture:** 使用 chrome.storage.local 存储模板配置，初始化时从 _locales 加载内置模板到本地存储，自定义模板以 custom_ 前缀存储

**Tech Stack:** Chrome Extension Manifest V3, Vanilla JS, Chrome i18n API

---

## 文件变更概览

| 文件 | 变更 |
|------|------|
| `_locales/en/messages.json` | 添加4个内置模板的name和prompt |
| `_locales/zh_CN/messages.json` | 添加4个内置模板的中文翻译 |
| `options.html` | 添加模板管理区块 |
| `options.js` | 添加模板存储结构、初始化、CRUD逻辑 |
| `popup.html` | 添加模板选择下拉框 |
| `popup.js` | 读取并使用选中模板的prompt |

---

## Task 1: 更新 i18n 消息文件

**Files:**
- Modify: `C:\Users\蔡雷鸣\ReadPilot\_locales\en\messages.json`
- Modify: `C:\Users\蔡雷鸣\ReadPilot\_locales\zh_CN\messages.json`

- [ ] **Step 1: 在 messages.json 中添加模板相关消息**

在 `settingsTitle` 条目后添加：

```json
,
"templateSection": {
  "message": "Summary Templates",
  "description": "Template section header"
},
"defaultTemplate": {
  "message": "Default Template",
  "description": "Default template selection label"
},
"customTemplates": {
  "message": "Custom Templates",
  "description": "Custom templates section header"
},
"addCustomTemplate": {
  "message": "Add Custom Template",
  "description": "Add custom template button"
},
"edit": {
  "message": "Edit",
  "description": "Edit button"
},
"delete": {
  "message": "Delete",
  "description": "Delete button"
},
"reset": {
  "message": "Reset",
  "description": "Reset button"
},
"save": {
  "message": "Save",
  "description": "Save button"
},
"cancel": {
  "message": "Cancel",
  "description": "Cancel button"
},
"templateName": {
  "message": "Template Name",
  "description": "Template name label"
},
"promptContent": {
  "message": "Prompt",
  "description": "Prompt content label"
},
"customTemplateLimit": {
  "message": "Maximum 10 custom templates allowed",
  "description": "Limit warning"
},
"templateDeleted": {
  "message": "Template deleted",
  "description": "Delete success message"
},
"templateSaved": {
  "message": "Template saved",
  "description": "Save success message"
},
"bulletSummaryName": {
  "message": "Bullet Summary",
  "description": "Bullet summary template name"
},
"bulletSummaryPrompt": {
  "message": "You are a professional summarizer. Read the following article and write a concise summary in 3-5 bullet points. Focus on the main points and key takeaways. Language: match the input language.",
  "description": "Bullet summary prompt"
},
"detailedSummaryName": {
  "message": "Detailed Summary",
  "description": "Detailed summary template name"
},
"detailedSummaryPrompt": {
  "message": "You are a professional summarizer. Please write a detailed summary of 100-200 words covering the main topic, key arguments, and conclusions. Language: match the input language.",
  "description": "Detailed summary prompt"
},
"keyTakeawaysName": {
  "message": "Key Takeaways",
  "description": "Key takeaways template name"
},
"keyTakeawaysPrompt": {
  "message": "You are a professional reading assistant. From the following article, extract: 1) What is the main topic 2) The 3 most important points or findings 3) Conclusions or recommendations. Language: match the input language.",
  "description": "Key takeaways prompt"
},
"plainEnglishName": {
  "message": "Plain English",
  "description": "Plain English template name"
},
"plainEnglishPrompt": {
  "message": "You are a professional summarizer. Explain the core content of the following article in plain, easy-to-understand language. Assume the reader knows nothing about this topic. Avoid or explain technical jargon. Language: match the input language.",
  "description": "Plain English prompt"
},
"selectTemplate": {
  "message": "Select Template",
  "description": "Template selector label in popup"
}
```

- [ ] **Step 2: 在 zh_CN/messages.json 中添加对应中文翻译**

```json
,
"templateSection": {
  "message": "摘要模板",
  "description": "Template section header"
},
"defaultTemplate": {
  "message": "默认模板",
  "description": "Default template selection label"
},
"customTemplates": {
  "message": "自定义模板",
  "description": "Custom templates section header"
},
"addCustomTemplate": {
  "message": "添加自定义模板",
  "description": "Add custom template button"
},
"edit": {
  "message": "编辑",
  "description": "Edit button"
},
"delete": {
  "message": "删除",
  "description": "Delete button"
},
"reset": {
  "message": "重置",
  "description": "Reset button"
},
"save": {
  "message": "保存",
  "description": "Save button"
},
"cancel": {
  "message": "取消",
  "description": "Cancel button"
},
"templateName": {
  "message": "模板名称",
  "description": "Template name label"
},
"promptContent": {
  "message": "提示词",
  "description": "Prompt content label"
},
"customTemplateLimit": {
  "message": "最多支持10个自定义模板",
  "description": "Limit warning"
},
"templateDeleted": {
  "message": "模板已删除",
  "description": "Delete success message"
},
"templateSaved": {
  "message": "模板已保存",
  "description": "Save success message"
},
"bulletSummaryName": {
  "message": "简洁要点",
  "description": "Bullet summary template name"
},
"bulletSummaryPrompt": {
  "message": "你是一个专业的摘要助手。阅读以下文章，用3-5个简洁的要点总结核心内容。每个要点一句话。语言与原文一致。",
  "description": "Bullet summary prompt"
},
"detailedSummaryName": {
  "message": "段落详摘",
  "description": "Detailed summary template name"
},
"detailedSummaryPrompt": {
  "message": "你是一个专业的摘要助手。请为以下文章写一段100-200字的详细摘要，包含文章的核心主题、主要论点和结论。语言与原文一致。",
  "description": "Detailed summary prompt"
},
"keyTakeawaysName": {
  "message": "关键信息",
  "description": "Key takeaways template name"
},
"keyTakeawaysPrompt": {
  "message": "你是一个专业的阅读助手。从以下文章中提取：1) 文章主题是什么 2) 最重要的3个观点或发现 3) 结论或建议。语言与原文一致。",
  "description": "Key takeaways prompt"
},
"plainEnglishName": {
  "message": "通俗解释",
  "description": "Plain English template name"
},
"plainEnglishPrompt": {
  "message": "你是一个专业的摘要助手。用通俗易懂的语言解释以下文章的核心内容。假设读者对该主题一无所知。避免使用专业术语或解释术语。语言与原文一致。",
  "description": "Plain English prompt"
},
"selectTemplate": {
  "message": "选择模板",
  "description": "Template selector label in popup"
}
```

- [ ] **Step 3: Commit**

```bash
git add _locales/en/messages.json _locales/zh_CN/messages.json
git commit -m "feat: add template messages to i18n files"
```

---

## Task 2: 更新 options.js 添加模板管理逻辑

**Files:**
- Modify: `C:\Users\蔡雷鸣\ReadPilot\options.js`

- [ ] **Step 1: 添加模板相关的常量和获取消息的辅助函数**

在文件顶部添加：

```javascript
// i18n helper
function getMessage(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

// Template IDs
const TEMPLATE_IDS = {
  BULLET_SUMMARY: 'bulletSummary',
  DETAILED_SUMMARY: 'detailedSummary',
  KEY_TAKEAWAYS: 'keyTakeaways',
  PLAIN_ENGLISH: 'plainEnglish'
};

// Get built-in template definitions from i18n
function getBuiltInTemplates() {
  return {
    [TEMPLATE_IDS.BULLET_SUMMARY]: {
      id: TEMPLATE_IDS.BULLET_SUMMARY,
      name: getMessage('bulletSummaryName'),
      prompt: getMessage('bulletSummaryPrompt'),
      isBuiltIn: true
    },
    [TEMPLATE_IDS.DETAILED_SUMMARY]: {
      id: TEMPLATE_IDS.DETAILED_SUMMARY,
      name: getMessage('detailedSummaryName'),
      prompt: getMessage('detailedSummaryPrompt'),
      isBuiltIn: true
    },
    [TEMPLATE_IDS.KEY_TAKEAWAYS]: {
      id: TEMPLATE_IDS.KEY_TAKEAWAYS,
      name: getMessage('keyTakeawaysName'),
      prompt: getMessage('keyTakeawaysPrompt'),
      isBuiltIn: true
    },
    [TEMPLATE_IDS.PLAIN_ENGLISH]: {
      id: TEMPLATE_IDS.PLAIN_ENGLISH,
      name: getMessage('plainEnglishName'),
      prompt: getMessage('plainEnglishPrompt'),
      isBuiltIn: true
    }
  };
}
```

- [ ] **Step 2: 添加模板存储结构初始化和加载逻辑**

在 `loadSettings()` 函数之前添加：

```javascript
const DEFAULT_SUMMARY_TEMPLATES = {
  defaultTemplate: TEMPLATE_IDS.PLAIN_ENGLISH,
  builtIn: getBuiltInTemplates(),
  custom: {}
};

function initializeTemplates() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['summaryTemplates'], (result) => {
      if (!result.summaryTemplates) {
        // First time - initialize with built-in templates
        chrome.storage.local.set({ summaryTemplates: DEFAULT_SUMMARY_TEMPLATES }, () => {
          resolve(DEFAULT_SUMMARY_TEMPLATES);
        });
      } else {
        // Merge built-in templates from i18n (in case they changed)
        const existing = result.summaryTemplates;
        existing.builtIn = getBuiltInTemplates();
        resolve(existing);
      }
    });
  });
}

function saveTemplates(templates) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ summaryTemplates: templates }, resolve);
  });
}

function getAllTemplates() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['summaryTemplates'], (result) => {
      resolve(result.summaryTemplates || DEFAULT_SUMMARY_TEMPLATES);
    });
  });
}
```

- [ ] **Step 3: 添加模板渲染和编辑UI的函数**

在 `showStatus` 函数后添加：

```javascript
function renderTemplateSection(templates) {
  const container = document.getElementById('templateSection');
  if (!container) return;

  container.innerHTML = '';

  // Default template selector
  const defaultGroup = document.createElement('div');
  defaultGroup.className = 'form-group';
  defaultGroup.innerHTML = `
    <label for="defaultTemplateSelect">${getMessage('defaultTemplate')}</label>
    <select id="defaultTemplateSelect" class="template-select">
      ${Object.values(templates.builtIn).map(t => `
        <option value="${t.id}" ${t.id === templates.defaultTemplate ? 'selected' : ''}>
          ${t.name}
        </option>
      `).join('')}
      ${Object.values(templates.custom).map(t => `
        <option value="${t.id}">${t.name}</option>
      `).join('')}
    </select>
  `;
  container.appendChild(defaultGroup);

  // Built-in templates (read-only display)
  const builtInHeader = document.createElement('h3');
  builtInHeader.className = 'section-title';
  builtInHeader.style.marginTop = '24px';
  builtInHeader.textContent = getMessage('templateSection');
  container.appendChild(builtInHeader);

  Object.values(templates.builtIn).forEach(template => {
    const card = createTemplateCard(template, true);
    container.appendChild(card);
  });

  // Custom templates section
  const customHeader = document.createElement('h3');
  customHeader.className = 'section-title';
  customHeader.style.marginTop = '24px';
  customHeader.textContent = getMessage('customTemplates');
  container.appendChild(customHeader);

  Object.values(templates.custom).forEach(template => {
    const card = createTemplateCard(template, false);
    container.appendChild(card);
  });

  // Add custom template button
  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-secondary';
  addBtn.style.marginTop = '12px';
  addBtn.textContent = getMessage('addCustomTemplate');
  addBtn.addEventListener('click', () => showTemplateEditor(null, templates));
  container.appendChild(addBtn);
}

function createTemplateCard(template, isBuiltIn) {
  const card = document.createElement('div');
  card.className = 'template-card';
  card.style.cssText = `
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
  `;

  const truncatedPrompt = template.prompt.length > 100
    ? template.prompt.substring(0, 100) + '...'
    : template.prompt;

  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <strong>${template.name}</strong>
      <div class="template-actions">
        <button class="btn-edit" data-id="${template.id}" style="margin-right: 8px; cursor: pointer;">
          ${getMessage('edit')}
        </button>
        ${!isBuiltIn ? `
          <button class="btn-delete" data-id="${template.id}" style="margin-right: 8px; cursor: pointer; color: var(--error);">
            ${getMessage('delete')}
          </button>
        ` : `
          <button class="btn-reset" data-id="${template.id}" style="margin-right: 8px; cursor: pointer;">
            ${getMessage('reset')}
          </button>
        `}
      </div>
    </div>
    <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">${truncatedPrompt}</p>
  `;

  card.querySelector('.btn-edit').addEventListener('click', () => editTemplate(template.id));
  if (isBuiltIn) {
    card.querySelector('.btn-reset').addEventListener('click', () => resetTemplate(template.id));
  } else {
    card.querySelector('.btn-delete').addEventListener('click', () => deleteTemplate(template.id));
  }

  return card;
}

async function editTemplate(templateId) {
  const templates = await getAllTemplates();
  const template = templates.builtIn[templateId] || templates.custom[templateId];
  if (template) {
    showTemplateEditor(template, templates);
  }
}

async function resetTemplate(templateId) {
  const builtIn = getBuiltInTemplates()[templateId];
  const templates = await getAllTemplates();
  templates.builtIn[templateId] = builtIn;
  await saveTemplates(templates);
  renderTemplateSection(templates);
  showStatus(getMessage('templateSaved'), false);
}

async function deleteTemplate(templateId) {
  const templates = await getAllTemplates();
  delete templates.custom[templateId];
  if (templates.defaultTemplate === templateId) {
    templates.defaultTemplate = TEMPLATE_IDS.PLAIN_ENGLISH;
  }
  await saveTemplates(templates);
  renderTemplateSection(templates);
  showStatus(getMessage('templateDeleted'), false);
}

function showTemplateEditor(template, templates) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;

  const isNew = !template;
  const name = template?.name || '';
  const prompt = template?.prompt || '';
  const nameDisabled = template?.isBuiltIn && !isNew;

  modal.innerHTML = `
    <div style="background: var(--bg); border-radius: 12px; padding: 24px; width: 500px; max-width: 90%;">
      <h3 style="margin-bottom: 16px;">${isNew ? getMessage('addCustomTemplate') : getMessage('edit')}</h3>
      <div class="form-group">
        <label>${getMessage('templateName')}</label>
        <input type="text" id="templateNameInput" value="${name}" ${nameDisabled ? 'disabled' : ''}
          style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px;
                 background: ${nameDisabled ? 'var(--bg-secondary)' : 'var(--bg)'};
                 color: ${nameDisabled ? 'var(--text-secondary)' : 'var(--text)'};">
      </div>
      <div class="form-group">
        <label>${getMessage('promptContent')}</label>
        <textarea id="templatePromptInput" rows="6"
          style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px;
                 font-family: inherit; resize: vertical;">${prompt}</textarea>
      </div>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="cancelEditBtn" class="btn btn-secondary">${getMessage('cancel')}</button>
        <button id="saveEditBtn" class="btn btn-primary">${getMessage('save')}</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#cancelEditBtn').addEventListener('click', () => modal.remove());
  modal.querySelector('#saveEditBtn').addEventListener('click', async () => {
    const nameInput = modal.querySelector('#templateNameInput').value.trim();
    const promptInput = modal.querySelector('#templatePromptInput').value.trim();

    if (!nameInput) {
      alert(getMessage('templateName') + ' is required');
      return;
    }
    if (!promptInput) {
      alert(getMessage('promptContent') + ' is required');
      return;
    }

    const currentTemplates = await getAllTemplates();

    if (isNew) {
      // Check limit
      const customCount = Object.keys(currentTemplates.custom).length;
      if (customCount >= 10) {
        showStatus(getMessage('customTemplateLimit'), true);
        modal.remove();
        return;
      }
      const newId = 'custom_' + Date.now();
      currentTemplates.custom[newId] = { name: nameInput, prompt: promptInput };
    } else {
      if (template.isBuiltIn) {
        currentTemplates.builtIn[template.id] = { ...currentTemplates.builtIn[template.id], name: nameInput, prompt: promptInput };
      } else {
        currentTemplates.custom[template.id] = { name: nameInput, prompt: promptInput };
      }
    }

    await saveTemplates(currentTemplates);
    renderTemplateSection(currentTemplates);
    modal.remove();
    showStatus(getMessage('templateSaved'), false);
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}
```

- [ ] **Step 4: 修改 loadSettings 函数，添加模板初始化**

将现有的 `loadSettings` 函数改为 async，并在末尾调用 `initializeTemplates` 和 `renderTemplateSection`：

```javascript
async function loadSettings() {
  // ... 现有的 API settings 加载逻辑保持不变 ...

  // Initialize templates
  const templates = await initializeTemplates();
  renderTemplateSection(templates);

  // Handle default template selector change
  const defaultSelect = document.getElementById('defaultTemplateSelect');
  if (defaultSelect) {
    defaultSelect.addEventListener('change', async (e) => {
      const currentTemplates = await getAllTemplates();
      currentTemplates.defaultTemplate = e.target.value;
      await saveTemplates(currentTemplates);
    });
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add options.js
git commit -m "feat(options): add template management logic"
```

---

## Task 3: 更新 options.html 添加模板管理UI

**Files:**
- Modify: `C:\Users\蔡雷鸣\ReadPilot\options.html`

- [ ] **Step 1: 在 API Configuration section 后添加模板区块**

在 `</div>` (API Configuration section结尾) 后，`</div>` (btn-row之前) 添加：

```html
  <div class="section" id="templateSection">
    <!-- Templates will be rendered here by JavaScript -->
  </div>
```

完整位置示例（确保在btn-row之前）：

```html
    </div>
  </div>

  <div class="section" id="templateSection">
    <!-- Templates will be rendered here by JavaScript -->
  </div>

  <div class="btn-row">
```

- [ ] **Step 2: 添加模板编辑弹窗的样式**

在 `<style>` 标签末尾添加：

```css
    .template-select {
      width: 100%;
      padding: 12px 16px;
      font-size: 14px;
      font-family: inherit;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      cursor: pointer;
    }

    .template-select:focus {
      outline: none;
      border-color: var(--primary);
    }
```

- [ ] **Step 3: Commit**

```bash
git add options.html
git commit -m "feat(options): add template management UI"
```

---

## Task 4: 更新 popup.html 添加模板选择下拉框

**Files:**
- Modify: `C:\Users\蔡雷鸣\ReadPilot\popup.html`

- [ ] **Step 1: 在 summarizeBtn 按钮前添加模板选择下拉框**

找到：
```html
<div class="actions">
  <button id="summarizeBtn" class="btn btn-primary">
```

改为：
```html
<div class="form-group">
  <label for="templateSelect" data-i18n="selectTemplate">Select Template</label>
  <select id="templateSelect" class="template-select"></select>
</div>
<div class="actions">
  <button id="summarizeBtn" class="btn btn-primary">
```

- [ ] **Step 2: 添加模板选择器的样式**

在 `<style>` 标签中添加：

```css
    .template-select {
      width: 100%;
      padding: 10px 12px;
      font-size: 13px;
      font-family: inherit;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      cursor: pointer;
      margin-bottom: 12px;
    }

    .template-select:focus {
      outline: none;
      border-color: var(--primary);
    }
```

- [ ] **Step 3: Commit**

```bash
git add popup.html
git commit -m "feat(popup): add template selector dropdown"
```

---

## Task 5: 更新 popup.js 使用选中的模板

**Files:**
- Modify: `C:\Users\蔡雷鸣\ReadPilot\popup.js`

- [ ] **Step 1: 添加模板相关的辅助函数**

在 `getMessage` 函数后添加：

```javascript
async function getTemplates() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['summaryTemplates'], (result) => {
      resolve(result.summaryTemplates || null);
    });
  });
}

function getTemplateById(templates, templateId) {
  if (!templates) return null;
  if (templates.builtIn && templates.builtIn[templateId]) {
    return templates.builtIn[templateId];
  }
  if (templates.custom && templates.custom[templateId]) {
    return templates.custom[templateId];
  }
  // Fallback to default
  if (templates.builtIn && templates.builtIn[templates.defaultTemplate]) {
    return templates.builtIn[templates.defaultTemplate];
  }
  return null;
}
```

- [ ] **Step 2: 修改 summarizePage 函数，使用选中的模板**

找到现有的 summarizePage 函数中的 system message 部分，将：

```javascript
const apiResponse = await fetch(`${settings.apiBaseUrl}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: 'You are a professional summarizer. Read the following article and write a concise summary in 3-5 bullet points. Focus on the main points and key takeaways. Language: match the input language.'
      },
      {
        role: 'user',
        content: content
      }
    ],
    max_tokens: settings.maxTokens,
    temperature: 0.7
  })
});
```

改为：

```javascript
// Get selected template
const templates = await getTemplates();
const templateSelect = document.getElementById('templateSelect');
const selectedTemplateId = templateSelect?.value || templates?.defaultTemplate;
const selectedTemplate = getTemplateById(templates, selectedTemplateId);
const systemPrompt = selectedTemplate?.prompt || getMessage('bulletSummaryPrompt');

const apiResponse = await fetch(`${settings.apiBaseUrl}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: content
      }
    ],
    max_tokens: settings.maxTokens,
    temperature: 0.7
  })
});
```

- [ ] **Step 3: 在 DOMContentLoaded 中初始化模板选择下拉框**

在 `document.addEventListener('DOMContentLoaded', ...)` 中，在 `const summarizeBtn = ...` 之前添加：

```javascript
// Initialize template selector
async function initTemplateSelector() {
  const templates = await getTemplates();
  const templateSelect = document.getElementById('templateSelect');
  if (!templateSelect || !templates) return;

  const defaultId = templates.defaultTemplate;

  // Populate options
  let optionsHtml = '';

  // Built-in templates
  Object.values(templates.builtIn).forEach(t => {
    const selected = t.id === defaultId ? 'selected' : '';
    optionsHtml += `<option value="${t.id}" ${selected}>${t.name}</option>`;
  });

  // Custom templates
  Object.values(templates.custom).forEach(t => {
    const selected = t.id === defaultId ? 'selected' : '';
    optionsHtml += `<option value="${t.id}" ${selected}>${t.name}</option>`;
  });

  templateSelect.innerHTML = optionsHtml;
}
```

然后在 `loadSettings()` 调用之前添加：

```javascript
initTemplateSelector();
```

- [ ] **Step 4: Commit**

```bash
git add popup.js
git commit -m "feat(popup): use selected template prompt for summarization"
```

---

## Task 6: 最终测试和README更新

- [ ] **Step 1: 测试完整流程**

1. 打开 `chrome://extensions/`
2. 重新加载 ReadPilot 扩展
3. 点击扩展图标，检查模板下拉框是否显示
4. 进入设置页面，检查模板管理区块是否正常显示
5. 测试编辑、重置、删除自定义模板功能

- [ ] **Step 2: 更新 README**

在 README.md 的 `## 功能特性` 部分，在页面摘要描述后添加：

```markdown
### 📄 页面摘要
- 点击扩展图标 → 弹出窗口 → 选择摘要模板 → 点击 **"Summarize Page"** 按钮
- 支持4种内置摘要模板 + 自定义模板
  - **简洁要点**：3-5个bullet points概括要点
  - **段落详摘**：段落式详细总结
  - **关键信息**：主题+观点+结论
  - **通俗解释**：用通俗易懂的语言解释
- 支持在设置页面管理模板
```

在 `## 文件结构` 部分，添加 `_locales/` 目录说明：

```markdown
├── _locales/          # 国际化文件
│   ├── en/
│   │   └── messages.json
│   └── zh_CN/
│       └── messages.json
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README with template feature"
git push
```

---

## 验证清单

- [ ] 模板下拉框正确显示4个内置模板
- [ ] 选择不同模板后点击Summarize使用对应prompt
- [ ] 设置页面正确显示所有模板
- [ ] 可以编辑内置模板并保存
- [ ] 可以重置内置模板到默认内容
- [ ] 可以添加自定义模板
- [ ] 可以删除自定义模板
- [ ] 可以设置默认模板
- [ ] 切换Chrome语言后模板名称正确切换
- [ ] 所有toast消息使用i18n
