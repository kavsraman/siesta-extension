// Siesta - Popup Logic

const TIERS = {
  10: 'Curious',
  25: 'Exploring',
  40: 'Conversational',
  60: 'Adventurous',
  80: 'Fluent-ish',
  100: 'Native Mode'
};

function getTierName(level) {
  const thresholds = [10, 25, 40, 60, 80, 100];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (level >= thresholds[i]) return TIERS[thresholds[i]];
  }
  return 'Curious';
}

// Load saved settings
async function loadSettings() {
  const result = await chrome.storage.local.get({
    targetLanguage: 'italian',
    immersionLevel: 10,
    apiKey: '',
    enabled: true
  });

  document.getElementById('language').value = result.targetLanguage;
  document.getElementById('immersion').value = result.immersionLevel;
  document.getElementById('immersion-value').textContent = `${result.immersionLevel}%`;
  document.getElementById('immersion-tier').textContent = getTierName(result.immersionLevel);
  document.getElementById('enabled').checked = result.enabled;

  // Try loading API key from desktop app's shared config
  if (!result.apiKey) {
    try {
      const res = await fetch('http://127.0.0.1:7749/api/config');
      const config = await res.json();
      if (config.apiKey) {
        await chrome.storage.local.set({ apiKey: config.apiKey });
        document.getElementById('api-key').value = '••••••••••';
        document.getElementById('key-status').textContent = '✓ Synced from desktop';
        updateStats(result.targetLanguage);
        return;
      }
    } catch {}
  }

  if (result.apiKey) {
    document.getElementById('api-key').value = '••••••••••';
    document.getElementById('key-status').textContent = '✓ Saved';
  }

  updateStats(result.targetLanguage);
}

async function updateStats(language) {
  const result = await chrome.storage.local.get({ wordProgress: {} });
  const stats = { exposed: 0, familiar: 0, acquired: 0 };
  
  Object.entries(result.wordProgress).forEach(([key, entry]) => {
    if (key.startsWith(`${language}:`)) {
      stats[entry.stage]++;
    }
  });

  const total = stats.exposed + stats.familiar + stats.acquired || 1;
  document.getElementById('progress-exposed').style.width = `${(stats.exposed / total) * 100}%`;
  document.getElementById('progress-familiar').style.width = `${(stats.familiar / total) * 100}%`;
  document.getElementById('progress-acquired').style.width = `${(stats.acquired / total) * 100}%`;
  
  document.getElementById('stat-exposed').textContent = stats.exposed;
  document.getElementById('stat-familiar').textContent = stats.familiar;
  document.getElementById('stat-acquired').textContent = stats.acquired;
}

// Event listeners
document.getElementById('language').addEventListener('change', async (e) => {
  await chrome.storage.local.set({ targetLanguage: e.target.value });
  updateStats(e.target.value);
});

document.getElementById('immersion').addEventListener('input', async (e) => {
  const level = parseInt(e.target.value);
  document.getElementById('immersion-value').textContent = `${level}%`;
  document.getElementById('immersion-tier').textContent = getTierName(level);
  await chrome.storage.local.set({ immersionLevel: level });
});

document.getElementById('enabled').addEventListener('change', async (e) => {
  await chrome.storage.local.set({ enabled: e.target.checked });
});

document.getElementById('save-key').addEventListener('click', async () => {
  const key = document.getElementById('api-key').value;
  if (key && key !== '••••••••••') {
    await chrome.storage.local.set({ apiKey: key });
    document.getElementById('api-key').value = '••••••••••';
    document.getElementById('key-status').textContent = '✓ Saved';
    // Sync API key to desktop app's shared config
    fetch('http://127.0.0.1:7749/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key }),
    }).catch(() => {});
  }
});

// Ask Siesta
document.getElementById('ask-btn').addEventListener('click', askSiesta);
document.getElementById('ask-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') askSiesta();
});

async function askSiesta() {
  const input = document.getElementById('ask-input');
  const responseEl = document.getElementById('ask-response');
  const query = input.value.trim();
  
  if (!query) return;
  
  responseEl.textContent = 'Thinking...';
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'AI_QUERY',
      query: query,
      targetLanguage: document.getElementById('language').value
    });
    
    if (response.success) {
      responseEl.textContent = response.data;
    } else {
      responseEl.textContent = response.error;
    }
  } catch (err) {
    responseEl.textContent = 'Error: Could not connect. Check your API key in settings.';
  }
}

// Site-specific toggle
async function loadSiteToggle() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    const url = new URL(tab.url);
    const hostname = url.hostname;
    if (!hostname) return;

    document.getElementById('site-hostname').textContent = hostname;

    const result = await chrome.storage.local.get({ disabledSites: [] });
    const isDisabled = result.disabledSites.includes(hostname);
    document.getElementById('site-enabled').checked = !isDisabled;

    document.getElementById('site-enabled').addEventListener('change', async (e) => {
      const { disabledSites } = await chrome.storage.local.get({ disabledSites: [] });
      if (e.target.checked) {
        const updated = disabledSites.filter(s => s !== hostname);
        await chrome.storage.local.set({ disabledSites: updated });
      } else {
        disabledSites.push(hostname);
        await chrome.storage.local.set({ disabledSites });
      }
    });
  } catch (err) {
    // chrome:// or other restricted pages
    document.getElementById('site-hostname').textContent = 'N/A';
    document.getElementById('site-enabled').disabled = true;
  }
}

// Init
loadSettings();
loadSiteToggle();
