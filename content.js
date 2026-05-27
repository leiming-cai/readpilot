(function() {
  'use strict';

  // i18n helper for content script
  function getMessage(key, substitutions) {
    return chrome.i18n.getMessage(key, substitutions) || key;
  }

  const MIN_SELECTION_LENGTH = 5;
  const TOAST_DURATION = 60; // seconds
  const BUTTON_ID = 'readpilot-explain-btn';
  const TOAST_ID = 'readpilot-explain-toast';

  const MAX_TOASTS = 3;
  const TOAST_SPACING = 16;
  const TOAST_BASE_TOP = 24;
  const ESTIMATED_TOAST_HEIGHT = 120;

let toastQueue = [];
let toastIdCounter = 0;
let loadingToastId = null; // Track loading toast ID

  let explainButton = null;
  let toastElement = null;
  let savedSelection = null; // Save selection when button is shown

  function createExplainButton() {
    const button = document.createElement('div');
    button.id = BUTTON_ID;
    button.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1v6M7 9v1M5 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
      </svg>
      <span>${getMessage('explainButton')}</span>
    `;
    button.style.cssText = `
      position: absolute;
      display: none;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      background: rgba(37, 99, 235, 0.95);
      color: white;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-weight: 500;
      border-radius: 16px;
      cursor: pointer;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: none;
    `;

    // Add click listener immediately when button is created
    button.addEventListener('click', () => {
      console.log('ReadPilot button clicked, savedSelection:', savedSelection);
      if (savedSelection) {
        const textToExplain = savedSelection;
        savedSelection = null; // Clear after use
        hideButton();
        handleExplain(textToExplain);
      }
    });

    document.body.appendChild(button);
    return button;
  }

  function createToastElement(toastId) {
    const toast = document.createElement('div');
    toast.id = TOAST_ID + '-' + toastId;
    toast.style.cssText = `
      position: fixed;
      top: 0;
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
      hideToast(toastId);
    });

    return toast;
  }

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

  function stopCountdownForToast(toast) {
    if (toast.countdownInterval) {
      clearInterval(toast.countdownInterval);
      toast.countdownInterval = null;
    }
  }

  function hideToast(toastId) {
    const index = toastQueue.findIndex(t => t.id === toastId);
    if (index === -1) return;

    // Clear loading toast reference if hiding loading toast
    if (loadingToastId === toastId) {
      loadingToastId = null;
    }

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

  function hideAllToasts() {
    while (toastQueue.length > 0) {
      dequeueToast();
    }
  }

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

  function getApiSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['apiKey', 'apiBaseUrl', 'maxTokens'], (result) => {
        resolve({
          apiKey: result.apiKey || '',
          apiBaseUrl: result.apiBaseUrl || 'https://api.deepseek.com',
          maxTokens: result.maxTokens || 500
        });
      });
    });
  }

  async function showToast(message, isError = false, showCountdown = true) {
    // If showing result (non-loading) and there's a loading toast, remove it first
    if (showCountdown && loadingToastId !== null) {
      hideToast(loadingToastId);
      loadingToastId = null;
    }

    // If queue full, remove oldest
    if (toastQueue.length >= MAX_TOASTS) {
      dequeueToast();
    }

    // Generate ID and create toast element
    const toastId = generateToastId();
    const toastElement = createToastElement(toastId);

    // Set content
    const contentEl = toastElement.querySelector('.toast-content');
    contentEl.textContent = message;
    toastElement.style.background = isError
      ? 'rgba(239, 68, 68, 0.95)'
      : 'rgba(15, 23, 42, 0.95)';

    // Hide countdown for loading state
    const countdownEl = toastElement.querySelector('.toast-countdown');
    if (!showCountdown) {
      countdownEl.style.display = 'none';
      loadingToastId = toastId; // Track this as loading toast
    }

    // Add to DOM
    document.body.appendChild(toastElement);

    // Create toast data object
    const toastData = {
      id: toastId,
      element: toastElement,
      countdownInterval: null,
      remainingSeconds: TOAST_DURATION,
      isError: isError
    };

    // Enqueue and position
    toastQueue.push(toastData);
    positionToasts();

    // Show animation
    requestAnimationFrame(() => {
      toastElement.style.transform = 'translateX(0)';
      toastElement.style.opacity = '1';
    });

    // Start countdown if needed
    if (showCountdown && !isError) {
      startCountdownForToast(toastData);
    }

    return toastId;
  }

  async function handleExplain(selectedText) {
    console.log('ReadPilot handleExplain called with:', selectedText?.substring(0, 50));
    if (!selectedText || selectedText.trim().length < MIN_SELECTION_LENGTH) {
      showToast(getMessage('selectionTooShort'), true);
      return;
    }

    const settings = await getApiSettings();
    console.log('ReadPilot settings:', settings);

    if (!settings.apiKey) {
      showToast(getMessage('apiKeyNotConfigured'), true);
      return;
    }

    showToast(getMessage('gettingExplanation'), false, false); // loading state, no countdown

    try {
      const response = await fetch(`${settings.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a knowledgeable assistant. Explain the following term or text briefly and clearly. If it\'s a technical term, give a definition. If it\'s a concept, explain it in simple terms. Language: match the input language.'
            },
            {
              role: 'user',
              content: selectedText.trim()
            }
          ],
          max_tokens: settings.maxTokens,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          showToast(getMessage('apiRateLimit'), true);
        } else if (response.status === 401) {
          showToast(getMessage('invalidApiKey'), true);
        } else {
          showToast(getMessage('apiError', [response.status.toString()]), true);
        }
        return;
      }

      const data = await response.json();
      const explanation = data.choices?.[0]?.message?.content || getMessage('unableToGenerateExplanation');

      showToast(explanation);
    } catch (error) {
      showToast(getMessage('connectionError', [error.message]), true);
    }
  }

  function showButton(x, y) {
    if (!explainButton) {
      explainButton = createExplainButton();
    }

    const buttonRect = explainButton.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y + window.scrollY - 36;

    if (adjustedX + 100 > viewportWidth) {
      adjustedX = viewportWidth - 110;
    }
    if (adjustedX < 10) {
      adjustedX = 10;
    }

    if (adjustedY + 30 > viewportHeight + window.scrollY) {
      adjustedY = y + window.scrollY + 24;
    }
    if (adjustedY < window.scrollY) {
      adjustedY = window.scrollY;
    }

    explainButton.style.left = `${adjustedX}px`;
    explainButton.style.top = `${adjustedY}px`;
    explainButton.style.display = 'flex';
    explainButton.style.pointerEvents = 'auto';
    
    requestAnimationFrame(() => {
      explainButton.style.opacity = '1';
      explainButton.style.transform = 'translateY(0)';
    });
  }

  function hideButton() {
    savedSelection = null;
    if (explainButton) {
      explainButton.style.opacity = '0';
      explainButton.style.transform = 'translateY(4px)';
      explainButton.style.pointerEvents = 'none';
      setTimeout(() => {
        if (explainButton) {
          explainButton.style.display = 'none';
        }
      }, 200);
    }
  }

  let hideTimeout = null;

  document.addEventListener('mouseup', (e) => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }

    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      if (selectedText && selectedText.length >= MIN_SELECTION_LENGTH) {
        savedSelection = selectedText; // Save for later use
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        showButton(rect.left, rect.top);
      } else {
        savedSelection = null;
        hideButton();
      }
    }, 10);
  });

  document.addEventListener('mousedown', (e) => {
    if (explainButton && !explainButton.contains(e.target)) {
      hideButton();
    }
  });

  document.addEventListener('scroll', () => {
    hideButton();
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideButton();
      hideAllToasts();
    }
  });

  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      hideTimeout = setTimeout(hideButton, 300);
    }
  });

  // Message listener for popup communication
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractContent') {
      const content = extractMainContent();
      sendResponse({ content: content });
    }
    return true;
  });

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
})();
