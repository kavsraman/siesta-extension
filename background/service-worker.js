// Siesta - Background Service Worker

// Context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'siesta-ask',
    title: 'Ask Siesta about "%s"',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'siesta-ask') {
    const selectedText = info.selectionText;
    chrome.tabs.sendMessage(tab.id, {
      type: 'OPEN_PANEL',
      query: selectedText
    });
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AI_QUERY') {
    handleAIQuery(message.query, message.targetLanguage)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

async function handleAIQuery(query, targetLanguage) {
  const result = await chrome.storage.local.get(['apiKey']);
  const apiKey = result.apiKey;
  
  if (!apiKey) {
    throw new Error('No API key set. Add your Anthropic API key in Siesta settings.');
  }

  const systemPrompt = `You are Siesta's language learning assistant. You help users learn ${targetLanguage} through immersion. When asked about a word or phrase:
1. Provide the translation and pronunciation
2. Give 1-2 example sentences showing natural usage
3. Note any dialect variations if relevant
4. Share a memorable way to remember it (mnemonic, etymology, or cultural context)
Keep responses concise and friendly. Format for easy scanning.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        { role: 'user', content: query }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'API request failed');
  }

  const data = await response.json();
  return data.content[0].text;
}
