chrome.runtime.onInstalled.addListener(() => {
  console.log('ReadPilot extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarize') {
    handleSummarize(request.data)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'explain') {
    handleExplain(request.data)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
    return true;
  }
});

async function handleSummarize({ content, apiKey, apiBaseUrl, maxTokens }) {
  const response = await fetch(`${apiBaseUrl}/chat/completions`, {
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
      max_tokens: maxTokens || 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return { summary: data.choices?.[0]?.message?.content || 'Unable to generate summary.' };
}

async function handleExplain({ text, apiKey, apiBaseUrl, maxTokens }) {
  const response = await fetch(`${apiBaseUrl}/chat/completions`, {
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
          content: 'You are a knowledgeable assistant. Explain the following term or text briefly and clearly. If it\'s a technical term, give a definition. If it\'s a concept, explain it in simple terms. Language: match the input language.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: maxTokens || 500,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return { explanation: data.choices?.[0]?.message?.content || 'Unable to generate explanation.' };
}
