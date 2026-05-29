// i18n helper
function getMessage(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

// Template helpers - using i18n for template names
const BUILT_IN_TEMPLATES = () => ({
  bulletSummary: {
    id: 'bulletSummary',
    name: getMessage('bulletSummaryName'),
    prompt: getMessage('bulletSummaryPrompt')
  },
  detailedSummary: {
    id: 'detailedSummary',
    name: getMessage('detailedSummaryName'),
    prompt: getMessage('detailedSummaryPrompt')
  },
  keyTakeaways: {
    id: 'keyTakeaways',
    name: getMessage('keyTakeawaysName'),
    prompt: getMessage('keyTakeawaysPrompt')
  },
  plainEnglish: {
    id: 'plainEnglish',
    name: getMessage('plainEnglishName'),
    prompt: getMessage('plainEnglishPrompt')
  }
});

async function getTemplates() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['summaryTemplates'], (result) => {
      if (result.summaryTemplates && result.summaryTemplates.builtIn) {
        resolve(result.summaryTemplates);
      } else {
        // Return built-in templates as default
        resolve({
          defaultTemplate: 'plainEnglish',
          builtIn: BUILT_IN_TEMPLATES(),
          custom: {}
        });
      }
    });
  });
}

function getTemplateById(templates, templateId) {
  if (!templates) return null;

  // builtIn might be a function or object
  const builtIn = typeof templates.builtIn === 'function' ? templates.builtIn() : templates.builtIn;

  if (builtIn && builtIn[templateId]) {
    return builtIn[templateId];
  }
  if (templates.custom && templates.custom[templateId]) {
    return templates.custom[templateId];
  }
  // Fallback to default
  if (builtIn && builtIn[templates.defaultTemplate]) {
    return builtIn[templates.defaultTemplate];
  }
  // Last resort fallback
  if (builtIn && builtIn.plainEnglish) {
    return builtIn.plainEnglish;
  }
  return null;
}

document.addEventListener('DOMContentLoaded', () => {
  // Apply i18n to all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = getMessage(key);
  });

  // Apply i18n to title attributes
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = getMessage(key);
  });

  // Initialize template selector
  async function initTemplateSelector() {
    try {
      const templates = await getTemplates();
      const templateSelect = document.getElementById('templateSelect');
      if (!templateSelect || !templates || !templates.builtIn) return;

      const defaultId = templates.defaultTemplate || 'plainEnglish';
      const builtIn = templates.builtIn;

      // Populate options
      let optionsHtml = '';

      // Built-in templates
      if (builtIn && typeof builtIn === 'object') {
        Object.values(builtIn).forEach(t => {
          if (t && t.id && t.name) {
            const selected = t.id === defaultId ? 'selected' : '';
            optionsHtml += `<option value="${t.id}" ${selected}>${t.name}</option>`;
          }
        });
      }

      // Custom templates
      if (templates.custom && typeof templates.custom === 'object') {
        Object.values(templates.custom).forEach(t => {
          if (t && t.id && t.name) {
            const selected = t.id === defaultId ? 'selected' : '';
            optionsHtml += `<option value="${t.id}" ${selected}>${t.name}</option>`;
          }
        });
      }

      if (optionsHtml) {
        templateSelect.innerHTML = optionsHtml;
      }
    } catch (error) {
      console.error('Error initializing template selector:', error);
    }
  }

  const summarizeBtn = document.getElementById('summarizeBtn');
  const loadingState = document.getElementById('loadingState');
  const summaryOutput = document.getElementById('summaryOutput');
  const summaryContent = document.getElementById('summaryContent');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  const retryBtn = document.getElementById('retryBtn');
  const emptyState = document.getElementById('emptyState');
  const copyBtn = document.getElementById('copyBtn');
  const settingsLink = document.getElementById('settingsLink');
  const answerBtn = document.getElementById('answerBtn');
  const answerLoadingState = document.getElementById('answerLoadingState');

  // Copy button handler
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const text = summaryContent.textContent;
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.classList.add('copied');
        const span = copyBtn.querySelector('span');
        const originalText = span.textContent;
        span.textContent = getMessage('copied') || 'Copied!';
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          span.textContent = originalText;
        }, 1500);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    });
  }

  // Call initTemplateSelector after element selections
  initTemplateSelector();

  function showState(state) {
    loadingState.classList.add('hidden');
    answerLoadingState.classList.add('hidden');
    summaryOutput.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    state.classList.remove('hidden');
  }

  function showError(message, showRetry = true, showSettings = false) {
    errorMessage.textContent = message;
    retryBtn.classList.toggle('hidden', !showRetry);
    settingsLink.classList.toggle('hidden', !showSettings);
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
        // Check if it's a connection error (content script not ready)
        if (error.message && (error.message.includes('Extension context') ||
            error.message.includes('Receiving end does not exist') ||
            error.message.includes('Could not establish'))) {
          showError(getMessage('contentScriptNotReady'), true);
        } else {
          showError(getMessage('cannotAccessPage'), true);
        }
        return;
      }

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

      const answerPrompt = `你是一个专业的答题助手。请仔细阅读以下页面内容：

1. 首先判断这个页面内容属于哪个领域（如：数学、物理、化学、历史、地理、生物、编程、经济、法律、医学等）
2. 假设你是该领域的专家
3. 从页面内容中找出所有题目，包括：
   - 单选题（ABCD选项）
   - 多选题（多个正确选项）
   - 判断题（正确/错误）
   - 填空题
   - 问答题/计算题
4. 根据题目类型给出准确答案：
   - 单选题：给出正确选项和简要解释
   - 多选题：列出所有正确选项
   - 判断题：给出正确或错误
   - 填空题/问答题：给出完整答案

返回格式为严格的JSON数组，不要有任何其他文字：
[
  {
    "type": "single_choice",
    "question": "题目完整文本",
    "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
    "answer": "B",
    "explanation": "简要解释为什么B是正确的"
  },
  {
    "type": "multiple_choice",
    "question": "题目完整文本",
    "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
    "answer": "ACD",
    "explanation": "为什么A、C、D是正确答案"
  },
  {
    "type": "true_false",
    "question": "题目完整文本",
    "answer": "正确",
    "explanation": "简要解释"
  },
  {
    "type": "fill_blank",
    "question": "题目完整文本",
    "answer": "填空题的答案",
    "explanation": "简要解释"
  },
  {
    "type": "essay",
    "question": "题目完整文本",
    "answer": "问答题/计算题的完整答案",
    "explanation": "详细解答过程"
  }
]

如果没有找到任何题目，返回空数组：[]`;

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

      // Debug: log raw AI content
      console.log('AI Raw Response:', aiContent);

      // Parse JSON response - robust extraction
      let answerData = { questions: [] };
      try {
        // Strip markdown code blocks if present
        let cleanedContent = aiContent.trim();
        const codeBlockMatch = cleanedContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          cleanedContent = codeBlockMatch[1].trim();
        }

        // Try to fix common JSON issues
        cleanedContent = cleanedContent
          .replace(/,\s*\]/g, ']')  // trailing comma before ]
          .replace(/,\s*\}/g, '}')  // trailing comma before }
          .replace(/[\x00-\x1f]/g, ''); // remove control characters

        // Try direct JSON parse
        try {
          answerData = JSON.parse(cleanedContent);
        } catch (e1) {
          // Find JSON object or array
          const jsonStart = cleanedContent.search(/[\{\[]/);
          if (jsonStart !== -1) {
            // Try to find matching close bracket/brace
            const firstChar = cleanedContent[jsonStart];
            const closeChar = firstChar === '{' ? '}' : ']';
            let depth = 0;
            let endPos = cleanedContent.length;

            for (let i = jsonStart; i < cleanedContent.length; i++) {
              if (cleanedContent[i] === firstChar) depth++;
              else if (cleanedContent[i] === closeChar) {
                depth--;
                if (depth === 0) {
                  endPos = i + 1;
                  break;
                }
              }
            }

            const jsonStr = cleanedContent.substring(jsonStart, endPos);
            console.log('Trying to parse:', jsonStr.substring(0, 200) + '...');
            try {
              answerData = JSON.parse(jsonStr);
            } catch (e2) {
              console.error('All JSON parse attempts failed:', e2);
              // Last resort: try to extract question/answer pairs manually
              const qaPairs = [];
              const qMatches = cleanedContent.matchAll(/"question"\s*:\s*"([^"]+)"/g);
              const aMatches = cleanedContent.matchAll(/"answer"\s*:\s*"([^"]+)"/g);
              const questions = Array.from(qMatches).map(m => m[1]);
              const answers = Array.from(aMatches).map(m => m[1]);
              for (let i = 0; i < Math.min(questions.length, answers.length); i++) {
                qaPairs.push({ question: questions[i], answer: answers[i] });
              }
              if (qaPairs.length > 0) {
                answerData.questions = qaPairs;
                console.log('Extracted', qaPairs.length, 'Q&A pairs via regex');
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse answer JSON:', e);
      }

      console.log('Parsed answerData:', answerData);

      // Handle both array and object formats
      const questions = Array.isArray(answerData) ? answerData : (answerData.questions || []);

      // Send results to content script to display in side panel
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SHOW_ANSWER_PANEL',
          questions: questions
        });
      }

    } catch (error) {
      console.error('Answer questions error:', error);
      showError(getMessage('connectionError', [error.message || 'Unknown error']), true);
    } finally {
      answerBtn.disabled = false;
    }
  }

  answerBtn.addEventListener('click', answerQuestions);
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
