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
  const ANSWER_PANEL_ID = 'readpilot-answer-panel';
  const ANSWER_PANEL_CLOSE_BTN_ID = 'readpilot-answer-panel-close';

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

    panel.querySelector('.answer-panel-header').style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;

    panel.querySelector('h3').style.cssText = `
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    `;

    panel.querySelector('.answer-panel-close').style.cssText = `
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

    panel.querySelector('.answer-panel-close').addEventListener('click', () => {
      closeAnswerPanel();
    });

    panel.querySelector('.answer-panel-content').style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px;
    `;

    document.body.appendChild(panel);
    return panel;
  }

  function closeAnswerPanel() {
    const panel = document.getElementById(ANSWER_PANEL_ID);
    if (panel) {
      panel.style.transform = 'translateX(100%)';
      setTimeout(() => {
        panel.remove();
      }, 300);
    }
  }

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

      const typeLabels = {
        'single_choice': '单选题',
        'multiple_choice': '多选题',
        'true_false': '判断题',
        'fill_blank': '填空题',
        'essay': '问答题'
      };

      questions.forEach((item, index) => {
        const qaItem = document.createElement('div');
        qaItem.style.cssText = `
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
        `;

        // Type badge
        const typeBadge = document.createElement('span');
        const typeLabel = typeLabels[item.type] || item.type || '题目';
        typeBadge.textContent = typeLabel;
        typeBadge.style.cssText = `
          display: inline-block;
          background: rgba(37, 99, 235, 0.3);
          color: #60a5fa;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 4px;
          margin-bottom: 8px;
        `;

        // Question
        const qTitle = document.createElement('div');
        qTitle.style.cssText = `
          font-weight: 600;
          margin-bottom: 8px;
          color: #e2e8f0;
        `;
        qTitle.textContent = `Q${index + 1}: ${item.question || item.q || ''}`;

        // Options (for choice questions)
        let optionsHtml = '';
        if (item.options && Array.isArray(item.options)) {
          optionsHtml = `<div style="margin: 8px 0; padding-left: 8px;">`;
          item.options.forEach(opt => {
            optionsHtml += `<div style="color: #94a3b8; font-size: 13px; margin-bottom: 4px;">${opt}</div>`;
          });
          optionsHtml += `</div>`;
        }

        // Answer
        const answerLabel = document.createElement('div');
        answerLabel.style.cssText = `
          color: #22c55e;
          font-weight: 600;
          font-size: 14px;
          margin-top: 8px;
        `;
        answerLabel.textContent = `答案: ${item.answer || item.a || ''}`;

        // Explanation
        let explanationHtml = '';
        if (item.explanation) {
          explanationHtml = `<div style="color: #64748b; font-size: 13px; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">${item.explanation}</div>`;
        }

        qaItem.appendChild(typeBadge);
        qaItem.appendChild(qTitle);
        if (optionsHtml) {
          qaItem.innerHTML += optionsHtml;
        }
        qaItem.appendChild(answerLabel);
        if (explanationHtml) {
          qaItem.innerHTML += explanationHtml;
        }
        content.appendChild(qaItem);
      });
    }

    requestAnimationFrame(() => {
      panel.style.transform = 'translateX(0)';
    });
  }

  function renderSummaryPanel(summary) {
    let panel = document.getElementById(ANSWER_PANEL_ID);

    if (!panel) {
      panel = createAnswerPanel();
    }

    const content = panel.querySelector('.answer-panel-content');
    content.innerHTML = '';

    // Update header title
    panel.querySelector('h3').textContent = getMessage('summary') || '摘要';

    if (!summary) {
      content.innerHTML = `
        <div style="text-align: center; color: #94a3b8; padding: 40px 0;">
          <p style="margin: 0;">${getMessage('noContentToSummarize') || 'No content'}</p>
        </div>
      `;
    } else {
      const summaryDiv = document.createElement('div');
      summaryDiv.style.cssText = `
        white-space: pre-wrap;
        word-wrap: break-word;
        line-height: 1.7;
        font-size: 14px;
        color: #e2e8f0;
      `;
      summaryDiv.textContent = summary;
      content.appendChild(summaryDiv);
    }

    requestAnimationFrame(() => {
      panel.style.transform = 'translateX(0)';
    });
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
        <button class="toast-close" title="${getMessage('closeButton')}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="toast-body">
        <div class="toast-content"></div>
        <button class="toast-copy" title="Copy">
          <svg class="icon-copy" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <path d="M2 10V3a1 1 0 011-1h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <svg class="icon-check" width="14" height="14" viewBox="0 0 14 14" fill="none" style="display:none">
            <path d="M3 7l3 3 5-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <a class="toast-settings-link" href="#" target="_blank" style="pointer-events: auto;" title="${getMessage('goToSettings')}">
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M16.5 10a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" stroke="currentColor" stroke-width="1.5"/>
          <path d="M10 3v1.5M10 15.5V17M3 10h1.5M15.5 10H17M4.93 4.93l1.06 1.06M14.01 14.01l1.06 1.06M4.93 15.07l1.06-1.06M14.01 5.99l1.06-1.06" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span data-i18n="goToSettings">${getMessage('goToSettings')}</span>
      </a>
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
      .toast-settings-link {
        display: none;
        align-items: center;
        gap: 4px;
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid rgba(255,255,255,0.1);
        color: #94a3b8;
        text-decoration: none;
        font-size: 12px;
        transition: color 0.2s;
      }
      .toast-settings-link:hover {
        color: #f1f5f9;
      }
      .toast-settings-link.show {
        display: flex;
      }
    `;
    toast.appendChild(style);

    // Close button handler
    toast.querySelector('.toast-close').addEventListener('click', () => {
      hideToast(toastId);
    });

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

    return toast;
  }

  function generateToastId() {
    return ++toastIdCounter;
  }

  function getToastTopByIndex(index) {
    return TOAST_BASE_TOP + index * (ESTIMATED_TOAST_HEIGHT + TOAST_SPACING);
  }

  function positionToasts() {
    let cumulativeTop = TOAST_BASE_TOP;
    toastQueue.forEach((toast) => {
      toast.element.style.top = `${cumulativeTop}px`;
      // Get actual height after positioning (use offsetHeight)
      const toastHeight = toast.element.offsetHeight || ESTIMATED_TOAST_HEIGHT;
      toast.actualHeight = toastHeight;
      cumulativeTop += toastHeight + TOAST_SPACING;
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

  async function showToast(message, isError = false, showCountdown = true, showSettingsLink = false) {
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

    // Show/hide settings link
    const settingsLink = toastElement.querySelector('.toast-settings-link');
    if (showSettingsLink) {
      settingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'openOptions' });
      });
      settingsLink.classList.add('show');
    }

    // Add to DOM
    document.body.appendChild(toastElement);

    // Create toast data object
    const toastData = {
      id: toastId,
      element: toastElement,
      countdownInterval: null,
      remainingSeconds: TOAST_DURATION,
      isError: isError,
      actualHeight: ESTIMATED_TOAST_HEIGHT
    };

    // Enqueue and position (initial position with estimated height)
    toastQueue.push(toastData);
    positionToasts();

    // Show animation and then re-position with actual height
    requestAnimationFrame(() => {
      toastElement.style.transform = 'translateX(0)';
      toastElement.style.opacity = '1';
      // Re-position after toast is rendered to get actual height
      requestAnimationFrame(() => {
        positionToasts();
      });
    });

    // Start countdown if needed (including error toasts)
    if (showCountdown) {
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
      showToast(getMessage('apiKeyNotConfigured'), true, true, true);
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
          showToast(getMessage('invalidApiKey'), true, true, true);
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
      closeAnswerPanel();
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

  // Listen for SHOW_ANSWER_PANEL from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SHOW_ANSWER_PANEL') {
      renderAnswerPanel(message.questions);
      sendResponse({ success: true });
    } else if (message.type === 'SHOW_SUMMARY_PANEL') {
      renderSummaryPanel(message.summary);
      sendResponse({ success: true });
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
