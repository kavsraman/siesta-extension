# Siesta Chrome Extension

A Chrome extension that helps you learn languages through immersion. Siesta replaces words on any webpage with their translations in your target language, so you pick up vocabulary naturally as you browse.

## Features

- **Word Replacement** — swaps common English words with target language translations as you browse
- **Adjustable Immersion** — control what percentage of words get replaced (10%–100%)
- **Hover Tooltips** — hover any replaced word to see the original, pronunciation, and a "Mark as known" button
- **Vocabulary Tracking** — words progress through exposed → familiar → acquired stages based on your interactions
- **Ask Siesta** — ask about any word or phrase directly from the popup (requires Anthropic API key)
- **Per-site Toggle** — disable Siesta on specific websites
- **Multi-language** — Italian, Spanish, French, German, Hindi, Tamil, Mandarin
- **Desktop Sync** — shares vocabulary with the [Siesta desktop app](https://github.com/kavsraman/siesta-desktop) via `localhost:7749`

## Installation

1. Clone this repository
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select this folder

## Usage

1. Click the Siesta icon in your toolbar to open the popup
2. Choose your target language
3. Adjust the immersion slider to control replacement density
4. Browse the web — replaced words appear with a subtle underline
5. Hover any replaced word to see the original and pronunciation
6. Click "Mark as known" to advance a word to the acquired stage

## How It Works

Siesta scans text nodes on every page and probabilistically replaces English words with translations from its built-in word lists. Word interactions are tracked across sessions:

| Stage | Criteria |
|-------|----------|
| **Exposed** | Word has been seen on a page |
| **Familiar** | Seen 6+ times, or seen 3+ times and hovered |
| **Acquired** | Seen 16+ times without hovering, or manually marked as known |

## Desktop App Sync

When the [Siesta desktop app](https://github.com/kavsraman/siesta-desktop) is running, the extension automatically syncs vocabulary progress to `~/.siesta/vocabulary.json` via a local server on `localhost:7749`. API keys saved in either app are shared through `~/.siesta/config.json`.

## Project Structure

```
background/service-worker.js   # Context menu and AI query handler
content/content.js             # Word replacement engine
content/content.css            # Tooltip and replaced word styles
content/side-panel.js          # Side panel UI
popup/                         # Extension popup (settings, stats, Ask Siesta)
utils/storage.js               # Chrome storage helpers and sync server bridge
languages/*.json               # Word dictionaries (7 languages)
```

## License

MIT
