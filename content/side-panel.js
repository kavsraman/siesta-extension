// Siesta - AI Query Side Panel

const SiestaPanel = {
  panelEl: null,
  bodyEl: null,
  inputEl: null,
  conversationHistory: [],

  create() {
    if (this.panelEl) return;

    this.panelEl = document.createElement('div');
    this.panelEl.className = 'siesta-panel';
    this.panelEl.innerHTML = `
      <div class="siesta-panel-header">
        <span class="siesta-panel-title">Ask Siesta</span>
        <button class="siesta-panel-close">&times;</button>
      </div>
      <div class="siesta-panel-body"></div>
      <div class="siesta-panel-input-area">
        <input type="text" class="siesta-panel-input" placeholder="Ask about a word or phrase...">
      </div>
    `;

    document.body.appendChild(this.panelEl);

    this.bodyEl = this.panelEl.querySelector('.siesta-panel-body');
    this.inputEl = this.panelEl.querySelector('.siesta-panel-input');

    this.panelEl.querySelector('.siesta-panel-close').addEventListener('click', () => this.close());
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = this.inputEl.value.trim();
        if (query) this.ask(query);
      }
    });

    // Prevent page interactions from closing panel
    this.panelEl.addEventListener('mouseenter', () => {
      if (tooltipEl) tooltipEl.style.display = 'none';
    });
  },

  open(query) {
    this.create();
    this.panelEl.style.display = 'flex';
    // Re-trigger animation
    this.panelEl.style.animation = 'none';
    this.panelEl.offsetHeight; // force reflow
    this.panelEl.style.animation = '';

    if (query) {
      this.inputEl.value = '';
      this.ask(query);
    } else {
      this.inputEl.focus();
    }
  },

  close() {
    if (this.panelEl) {
      this.panelEl.style.display = 'none';
    }
  },

  async ask(query) {
    this.inputEl.value = '';

    // Add user message
    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'siesta-panel-message siesta-panel-user';
    userMsgEl.textContent = query;
    this.bodyEl.appendChild(userMsgEl);

    // Add loading indicator
    const loadingEl = document.createElement('div');
    loadingEl.className = 'siesta-panel-loading';
    loadingEl.innerHTML = '<div class="siesta-pulse"></div> Thinking...';
    this.bodyEl.appendChild(loadingEl);
    this.bodyEl.scrollTop = this.bodyEl.scrollHeight;

    // Track in conversation history
    this.conversationHistory.push({ role: 'user', content: query });

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'AI_QUERY',
        query: query,
        targetLanguage: currentSettings.targetLanguage || 'italian'
      });

      loadingEl.remove();

      const responseMsgEl = document.createElement('div');
      responseMsgEl.className = 'siesta-panel-message siesta-panel-response';

      if (response.success) {
        responseMsgEl.innerHTML = this.formatResponse(response.data);
        this.conversationHistory.push({ role: 'assistant', content: response.data });
      } else {
        responseMsgEl.textContent = response.error;
        responseMsgEl.classList.add('siesta-panel-error');
      }

      this.bodyEl.appendChild(responseMsgEl);
    } catch (err) {
      loadingEl.remove();
      const errorEl = document.createElement('div');
      errorEl.className = 'siesta-panel-message siesta-panel-error';
      errorEl.textContent = 'Add your Anthropic API key in Siesta settings to use AI features.';
      this.bodyEl.appendChild(errorEl);
    }

    this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
  },

  formatResponse(text) {
    // Basic markdown-like formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background:#f0f0f0;padding:1px 4px;border-radius:3px;font-size:12px;">$1</code>')
      .replace(/\n/g, '<br>');
  }
};

// Listen for messages from background script (context menu)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_PANEL') {
    SiestaPanel.open(message.query || null);
  }
});
