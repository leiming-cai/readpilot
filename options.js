// i18n helper
function getMessage(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

// ============================================
// Template Management - Core Functions
// ============================================

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

// Default template storage structure
const DEFAULT_SUMMARY_TEMPLATES = {
  defaultTemplate: TEMPLATE_IDS.PLAIN_ENGLISH,
  builtIn: getBuiltInTemplates(),
  custom: {}
};

// Initialize templates in storage
function initializeTemplates() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['summaryTemplates'], (result) => {
      if (!result.summaryTemplates) {
        chrome.storage.local.set({ summaryTemplates: DEFAULT_SUMMARY_TEMPLATES }, () => {
          resolve(DEFAULT_SUMMARY_TEMPLATES);
        });
      } else {
        const existing = result.summaryTemplates;
        existing.builtIn = getBuiltInTemplates();
        resolve(existing);
      }
    });
  });
}

// Save templates to storage
function saveTemplates(templates) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ summaryTemplates: templates }, resolve);
  });
}

// Get all templates from storage
function getAllTemplates() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['summaryTemplates'], (result) => {
      resolve(result.summaryTemplates || DEFAULT_SUMMARY_TEMPLATES);
    });
  });
}

// ============================================
// End Core Template Functions
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Apply i18n to all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = getMessage(key);
  });

  // Apply i18n to placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = getMessage(key);
  });

  const apiKeyInput = document.getElementById('apiKey');
  const apiBaseUrlInput = document.getElementById('apiBaseUrl');
  const apiProviderInput = document.getElementById('apiProvider');
  const maxTokensSlider = document.getElementById('maxTokens');
  const maxTokensValue = document.getElementById('maxTokensValue');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const status = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  const checkIcon = document.querySelector('.check');
  const errorIcon = document.querySelector('.error-x');
  const spinner = document.querySelector('.spinner');

  // Provider selection handler
  apiProviderInput.addEventListener('change', () => {
    selectedProvider = apiProviderInput.value;
    if (selectedProvider === 'custom') {
      apiBaseUrlInput.removeAttribute('readonly');
      apiBaseUrlInput.value = '';
      apiBaseUrlInput.focus();
    } else {
      apiBaseUrlInput.setAttribute('readonly', true);
      apiBaseUrlInput.value = API_PROVIDERS[selectedProvider].url;
    }
  });

  const DEFAULT_BASE_URL = 'https://api.deepseek.com';
  const DEFAULT_MAX_TOKENS = 1000;

  // API Provider presets
  const API_PROVIDERS = {
    deepseek: { url: 'https://api.deepseek.com', name: 'DeepSeek' },
    openai: { url: 'https://api.openai.com/v1', name: 'OpenAI' },
    anthropic: { url: 'https://api.anthropic.com', name: 'Anthropic' },
    custom: { url: '', name: 'Custom' }
  };

  let selectedProvider = 'deepseek';

  // Show status message
  function showStatus(message, isError) {
    statusText.textContent = message;
    status.classList.remove('success', 'error');
    status.classList.add('show', isError ? 'error' : 'success');

    checkIcon.style.display = isError ? 'none' : 'block';
    errorIcon.style.display = isError ? 'block' : 'none';
    spinner.style.display = 'none';

    if (!isError) {
      setTimeout(() => {
        status.classList.remove('show');
      }, 3000);
    }
  }

  function loadSettings() {
    chrome.storage.local.get(['apiKey', 'apiBaseUrl', 'maxTokens'], (result) => {
      apiKeyInput.value = result.apiKey || '';
      maxTokensSlider.value = result.maxTokens || DEFAULT_MAX_TOKENS;
      maxTokensValue.textContent = result.maxTokens || DEFAULT_MAX_TOKENS;

      // Detect provider from URL
      const savedUrl = result.apiBaseUrl || DEFAULT_BASE_URL;
      let detectedProvider = 'custom';
      for (const [key, provider] of Object.entries(API_PROVIDERS)) {
        if (key !== 'custom' && savedUrl.startsWith(provider.url)) {
          detectedProvider = key;
          break;
        }
      }

      selectedProvider = detectedProvider;
      apiProviderInput.value = detectedProvider;

      if (detectedProvider === 'custom') {
        apiBaseUrlInput.removeAttribute('readonly');
        apiBaseUrlInput.value = savedUrl;
      } else {
        apiBaseUrlInput.setAttribute('readonly', true);
        apiBaseUrlInput.value = API_PROVIDERS[detectedProvider].url;
      }
    });
  }

  function setLoading(loading) {
    saveBtn.disabled = loading;
    spinner.style.display = loading ? 'block' : 'none';
    checkIcon.style.display = 'none';
    errorIcon.style.display = 'none';
  }

  // ============================================
  // Template UI Functions
  // ============================================

  // Render template section in the UI
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
        ${Object.values(templates.custom || {}).map(t => `
          <option value="${t.id}">${t.name}</option>
        `).join('')}
      </select>
    `;
    container.appendChild(defaultGroup);

    // Built-in templates section
    Object.values(templates.builtIn).forEach(template => {
      const card = createTemplateCard(template, true);
      container.appendChild(card);
    });

    // Custom templates section header
    const customHeader = document.createElement('h3');
    customHeader.className = 'section-title';
    customHeader.style.marginTop = '24px';
    customHeader.textContent = getMessage('customTemplates');
    container.appendChild(customHeader);

    Object.values(templates.custom || {}).forEach(template => {
      const card = createTemplateCard(template, false);
      container.appendChild(card);
    });

    // Add custom template button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-secondary';
    addBtn.style.marginTop = '12px';
    addBtn.textContent = getMessage('addCustomTemplate');
    addBtn.addEventListener('click', () => showTemplateEditor(null));
    container.appendChild(addBtn);

    // Handle default template selector change
    const defaultSelect = document.getElementById('defaultTemplateSelect');
    defaultSelect.addEventListener('change', async (e) => {
      const currentTemplates = await getAllTemplates();
      currentTemplates.defaultTemplate = e.target.value;
      await saveTemplates(currentTemplates);
    });
  }

  // Create a template card element
  function createTemplateCard(template, isBuiltIn) {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.style.cssText = 'background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 12px;';

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
      <p style="font-size: 13px; color: var(--text-secondary); margin: 0; white-space: pre-wrap;">${truncatedPrompt}</p>
    `;

    card.querySelector('.btn-edit').addEventListener('click', () => editTemplate(template.id));
    if (isBuiltIn) {
      card.querySelector('.btn-reset').addEventListener('click', () => resetTemplate(template.id));
    } else {
      card.querySelector('.btn-delete').addEventListener('click', () => deleteTemplate(template.id));
    }

    return card;
  }

  // Edit an existing template
  async function editTemplate(templateId) {
    const templates = await getAllTemplates();
    const template = templates.builtIn[templateId] || templates.custom[templateId];
    if (template) {
      showTemplateEditor(template);
    }
  }

  // Reset a built-in template to default
  async function resetTemplate(templateId) {
    const builtIn = getBuiltInTemplates()[templateId];
    const templates = await getAllTemplates();
    templates.builtIn[templateId] = builtIn;
    await saveTemplates(templates);
    renderTemplateSection(templates);
    showStatus(getMessage('templateSaved'), false);
  }

  // Delete a custom template
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

  // Show template editor modal
  function showTemplateEditor(template) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';

    const isNew = !template;
    const name = template?.name || '';
    const prompt = template?.prompt || '';
    const nameDisabled = isNew ? false : (template?.isBuiltIn || false);

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
        const customCount = Object.keys(currentTemplates.custom || {}).length;
        if (customCount >= 10) {
          showStatus(getMessage('customTemplateLimit'), true);
          modal.remove();
          return;
        }
        const newId = 'custom_' + Date.now();
        currentTemplates.custom = currentTemplates.custom || {};
        currentTemplates.custom[newId] = { id: newId, name: nameInput, prompt: promptInput };
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

  // ============================================
  // End Template UI Functions
  // ============================================

  maxTokensSlider.addEventListener('input', () => {
    maxTokensValue.textContent = maxTokensSlider.value;
  });

  async function testApiConnection(apiKey, baseUrl, provider = 'deepseek') {
    // Model mapping by provider
    const providerModels = {
      deepseek: 'deepseek-chat',
      openai: 'gpt-3.5-turbo',
      anthropic: 'claude-3-haiku-20240307',
      custom: 'deepseek-chat' // fallback for custom
    };

    const model = providerModels[provider] || 'deepseek-chat';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: 'Hi' }
        ],
        max_tokens: 10
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    return true;
  }

  async function saveSettings() {
    const apiKey = apiKeyInput.value.trim();
    let apiBaseUrl = apiBaseUrlInput.value.trim();

    // Use provider preset URL if not custom
    if (selectedProvider !== 'custom') {
      apiBaseUrl = API_PROVIDERS[selectedProvider].url;
    }

    if (!apiBaseUrl) {
      apiBaseUrl = DEFAULT_BASE_URL;
    }

    const maxTokens = parseInt(maxTokensSlider.value, 10);

    if (!apiKey) {
      showStatus(getMessage('enterApiKey'), true);
      return;
    }

    if (!apiBaseUrl.startsWith('http')) {
      showStatus(getMessage('invalidUrlFormat'), true);
      return;
    }

    setLoading(true);

    try {
      await testApiConnection(apiKey, apiBaseUrl, selectedProvider);

      chrome.storage.local.set({
        apiKey: apiKey,
        apiBaseUrl: apiBaseUrl,
        maxTokens: maxTokens,
        apiProvider: selectedProvider
      }, () => {
        showStatus(getMessage('settingsSaved'), false);
      });
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('Incorrect API key')) {
        showStatus(getMessage('invalidApiKey'), true);
      } else if (error.message.includes('429')) {
        showStatus(getMessage('rateLimitHit'), true);
      } else if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
        showStatus(getMessage('networkError'), true);
      } else {
        showStatus(getMessage('connectionFailed', [error.message]), true);
      }
    } finally {
      setLoading(false);
    }
  }

  function resetSettings() {
    apiKeyInput.value = '';
    apiProviderInput.value = 'deepseek';
    selectedProvider = 'deepseek';
    apiBaseUrlInput.setAttribute('readonly', true);
    apiBaseUrlInput.value = API_PROVIDERS.deepseek.url;
    maxTokensSlider.value = DEFAULT_MAX_TOKENS;
    maxTokensValue.textContent = DEFAULT_MAX_TOKENS;

    chrome.storage.local.remove(['apiKey', 'apiBaseUrl', 'maxTokens', 'apiProvider'], () => {
      showStatus(getMessage('settingsReset'), false);
    });
  }

  saveBtn.addEventListener('click', saveSettings);
  resetBtn.addEventListener('click', resetSettings);

  apiKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveSettings();
    }
  });

  // Load settings
  loadSettings();

  // Initialize and render templates
  initializeTemplates().then(templates => {
    renderTemplateSection(templates);
  });
});