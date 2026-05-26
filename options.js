// i18n helper
function getMessage(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

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
  const maxTokensSlider = document.getElementById('maxTokens');
  const maxTokensValue = document.getElementById('maxTokensValue');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const status = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  const checkIcon = document.querySelector('.check');
  const errorIcon = document.querySelector('.error-x');
  const spinner = document.querySelector('.spinner');

  const DEFAULT_BASE_URL = 'https://api.deepseek.com';
  const DEFAULT_MAX_TOKENS = 1000;

  function loadSettings() {
    chrome.storage.local.get(['apiKey', 'apiBaseUrl', 'maxTokens'], (result) => {
      apiKeyInput.value = result.apiKey || '';
      apiBaseUrlInput.value = result.apiBaseUrl || DEFAULT_BASE_URL;
      maxTokensSlider.value = result.maxTokens || DEFAULT_MAX_TOKENS;
      maxTokensValue.textContent = result.maxTokens || DEFAULT_MAX_TOKENS;
    });
  }

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

  function setLoading(loading) {
    saveBtn.disabled = loading;
    spinner.style.display = loading ? 'block' : 'none';
    checkIcon.style.display = 'none';
    errorIcon.style.display = 'none';
  }

  maxTokensSlider.addEventListener('input', () => {
    maxTokensValue.textContent = maxTokensSlider.value;
  });

  async function testApiConnection(apiKey, baseUrl) {
    const testResponse = `You are a helpful assistant.`;
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
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
    const apiBaseUrl = apiBaseUrlInput.value.trim() || DEFAULT_BASE_URL;
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
      await testApiConnection(apiKey, apiBaseUrl);
      
      chrome.storage.local.set({
        apiKey: apiKey,
        apiBaseUrl: apiBaseUrl,
        maxTokens: maxTokens
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
    apiBaseUrlInput.value = DEFAULT_BASE_URL;
    maxTokensSlider.value = DEFAULT_MAX_TOKENS;
    maxTokensValue.textContent = DEFAULT_MAX_TOKENS;
    
    chrome.storage.local.remove(['apiKey', 'apiBaseUrl', 'maxTokens'], () => {
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

  loadSettings();
});
