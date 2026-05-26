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

  const summarizeBtn = document.getElementById('summarizeBtn');
  const loadingState = document.getElementById('loadingState');
  const summaryOutput = document.getElementById('summaryOutput');
  const summaryContent = document.getElementById('summaryContent');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  const retryBtn = document.getElementById('retryBtn');
  const emptyState = document.getElementById('emptyState');

  function showState(state) {
    loadingState.classList.add('hidden');
    summaryOutput.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    state.classList.remove('hidden');
  }

  function showError(message, showRetry = true) {
    errorMessage.textContent = message;
    retryBtn.classList.toggle('hidden', !showRetry);
    showState(errorState);
  }

  async function checkApiKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['apiKey'], (result) => {
        resolve(result.apiKey || null);
      });
    });
  }

  async function summarizePage() {
    showState(loadingState);
    summarizeBtn.disabled = true;

    try {
      const apiKey = await checkApiKey();
      if (!apiKey) {
        showError(getMessage('apiKeyNotConfigured'));
        return;
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        showError(getMessage('cannotAccessPage'));
        return;
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractMainContent
      });

      if (!results || !results[0] || !results[0].result) {
        showState(emptyState);
        return;
      }

      const content = results[0].result;

      if (content.trim().length === 0) {
        showState(emptyState);
        return;
      }

      const settings = await new Promise((resolve) => {
        chrome.storage.local.get(['apiBaseUrl', 'maxTokens'], (result) => {
          resolve({
            apiBaseUrl: result.apiBaseUrl || 'https://api.deepseek.com',
            maxTokens: result.maxTokens || 1000
          });
        });
      });

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
      const summary = data.choices?.[0]?.message?.content || 'Unable to generate summary.';

      summaryContent.textContent = summary;
      showState(summaryOutput);
    } catch (error) {
      console.error('Summarize error:', error);
      const errorMsg = error.message || '';
      if (errorMsg.includes('Extension context invalidated') || errorMsg.includes('no reason')) {
        showError(getMessage('extensionReloaded'), false);
      } else if (errorMsg.includes('Cannot access')) {
        showError(getMessage('cannotAccessPage'), true);
      } else {
        showError(getMessage('connectionError', [errorMsg || 'Unknown error']), true);
      }
    } finally {
      summarizeBtn.disabled = false;
    }
  }

  summarizeBtn.addEventListener('click', summarizePage);
  retryBtn.addEventListener('click', summarizePage);
});

// This function is injected and executed in the target page context
function extractMainContent() {
  const MAX_CHARS = 5000;
  const unwantedTags = ['script', 'style', 'nav', 'footer', 'aside', 'iframe', 'img', 'figure', 'noscript', 'svg', 'button', 'input', 'textarea', 'select'];

  function cloneAndClean(element) {
    const clone = element.cloneNode(true);
    unwantedTags.forEach(tag => {
      const elements = clone.querySelectorAll(tag);
      elements.forEach(el => el.remove());
    });
    ['onclick', 'onload', 'onerror', 'onmouseover'].forEach(attr => {
      clone.querySelectorAll(`[${attr}]`).forEach(el => el.removeAttribute(attr));
    });
    return clone;
  }

  function getTextContent(element) {
    const clone = cloneAndClean(element);
    return clone.textContent || '';
  }

  let mainElement = document.querySelector('article') || 
                    document.querySelector('main') || 
                    document.querySelector('[role="main"]') ||
                    document.querySelector('.post-content') ||
                    document.querySelector('.article-content') ||
                    document.querySelector('.entry-content') ||
                    document.querySelector('#content') ||
                    document.body;

  let bestElement = mainElement;
  let maxParagraphs = 0;

  const containers = document.querySelectorAll('div, section, article');
  containers.forEach(container => {
    const paragraphs = container.querySelectorAll('p').length;
    if (paragraphs > maxParagraphs) {
      maxParagraphs = paragraphs;
      bestElement = container;
    }
  });

  if (maxParagraphs > 0) {
    mainElement = bestElement;
  }

  let text = getTextContent(mainElement);
  text = text.replace(/\s+/g, ' ').trim();

  if (text.length > MAX_CHARS) {
    text = text.substring(0, MAX_CHARS);
    const lastSpace = text.lastIndexOf(' ');
    if (lastSpace > MAX_CHARS * 0.8) {
      text = text.substring(0, lastSpace);
    }
    text += '...';
  }

  return text;
}
