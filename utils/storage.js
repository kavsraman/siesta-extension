// Siesta - Chrome Storage Helpers

const SiestaStorage = {
  defaults: {
    targetLanguage: 'italian',
    immersionLevel: 10,
    apiKey: '',
    enabled: true,
    disabledSites: [],
    wordProgress: {}  // { "hello": { stage: "exposed", seenCount: 0, lastSeen: null, hoveredCount: 0 } }
  },

  async get(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        const merged = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        keyList.forEach(key => {
          merged[key] = result[key] !== undefined ? result[key] : this.defaults[key];
        });
        resolve(merged);
      });
    });
  },

  async set(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  },

  async getAll() {
    return this.get(Object.keys(this.defaults));
  },

  // Progression tracking
  async recordWordSeen(word, language, translation, pronunciation) {
    const { wordProgress } = await this.get(['wordProgress']);
    const key = `${language}:${word}`;
    const entry = wordProgress[key] || { stage: 'exposed', seenCount: 0, lastSeen: null, hoveredCount: 0 };

    entry.seenCount++;
    entry.lastSeen = Date.now();

    // Stage transitions
    if (entry.stage === 'exposed' && entry.seenCount >= 6) {
      entry.stage = 'familiar';
    }
    if (entry.stage === 'familiar' && entry.seenCount >= 16 && entry.hoveredCount === 0) {
      entry.stage = 'acquired';
    }

    wordProgress[key] = entry;
    await this.set({ wordProgress });
    this.syncToServer(language, word, entry, translation, pronunciation);
    return entry;
  },

  async recordWordHovered(word, language, translation, pronunciation) {
    const { wordProgress } = await this.get(['wordProgress']);
    const key = `${language}:${word}`;
    const entry = wordProgress[key] || { stage: 'exposed', seenCount: 0, lastSeen: null, hoveredCount: 0 };

    entry.hoveredCount++;
    if (entry.stage === 'exposed' && entry.seenCount >= 3) {
      entry.stage = 'familiar';
    }

    wordProgress[key] = entry;
    await this.set({ wordProgress });
    this.syncToServer(language, word, entry, translation, pronunciation);
    return entry;
  },

  async markAsKnown(word, language, translation, pronunciation) {
    const { wordProgress } = await this.get(['wordProgress']);
    const key = `${language}:${word}`;
    const entry = wordProgress[key] || { stage: 'acquired', seenCount: 0, lastSeen: null, hoveredCount: 0 };
    entry.stage = 'acquired';
    entry.lastSeen = Date.now();
    wordProgress[key] = entry;
    await this.set({ wordProgress });
    this.syncToServer(language, word, entry, translation, pronunciation);
  },

  async getStats(language) {
    const { wordProgress } = await this.get(['wordProgress']);
    const stats = { exposed: 0, familiar: 0, acquired: 0 };
    Object.entries(wordProgress).forEach(([key, entry]) => {
      if (key.startsWith(`${language}:`)) {
        stats[entry.stage]++;
      }
    });
    return stats;
  },

  // Fire-and-forget sync to local server (desktop app bridge)
  syncToServer(language, word, entry, translation, pronunciation) {
    fetch('http://127.0.0.1:7749/api/vocabulary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: language,
        word: word,
        stage: entry.stage,
        seenCount: entry.seenCount,
        lastSeen: entry.lastSeen,
        translation: translation || '',
        pronunciation: pronunciation || '',
      }),
    }).catch(() => {}); // Silently fail if server not running
  }
};
