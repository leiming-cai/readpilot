document.addEventListener('DOMContentLoaded', () => {
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
        showError('API key not configured. Please set it in Settings.');
        return;
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Use message passing to get content from content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractContent' });
      
      if (!response || !response.content) {
        showState(emptyState);
        return;
      }

      const { content } = response;

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
          showError('API rate limit exceeded. Please wait and try again.', true);
        } else if (apiResponse.status === 401) {
          showError('Invalid API key. Please check your Settings.');
        } else {
          showError(`API error: ${apiResponse.status}`, true);
        }
        return;
      }

      const data = await apiResponse.json();
      const summary = data.choices?.[0]?.message?.content || 'Unable to generate summary.';

      summaryContent.textContent = summary;
      showState(summaryOutput);
    } catch (error) {
      console.error('Summarize error:', error);
      if (error.message?.includes('Extension context invalidated')) {
        showError('Extension reloaded. Please try again.', false);
      } else {
        showError(`Connection error: ${error.message || 'Unknown error'}`, true);
      }
    } finally {
      summarizeBtn.disabled = false;
    }
  }

  summarizeBtn.addEventListener('click', summarizePage);
  retryBtn.addEventListener('click', summarizePage);
});
