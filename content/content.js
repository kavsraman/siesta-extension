// Siesta - Content Script: Word Replacement Engine

let currentLanguageData = null;
let currentSettings = {};
let replacedWords = new Map(); // Track replaced word elements

// Elements to skip
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'CODE', 'PRE', 
  'KBD', 'SAMP', 'VAR', 'NOSCRIPT', 'IFRAME', 'SVG', 'MATH'
]);

async function init() {
  const settings = await SiestaStorage.getAll();
  currentSettings = settings;

  if (!settings.enabled) return;

  // Check if site is disabled
  const hostname = window.location.hostname;
  if (settings.disabledSites.includes(hostname)) return;

  // Load language data
  const langUrl = chrome.runtime.getURL(`languages/${settings.targetLanguage}.json`);
  const response = await fetch(langUrl);
  currentLanguageData = await response.json();

  // Run replacement
  replaceWords();

  // Watch for dynamic content
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          replaceWordsInNode(node);
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function replaceWords() {
  replaceWordsInNode(document.body);
}

function replaceWordsInNode(rootNode) {
  const walker = document.createTreeWalker(
    rootNode,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.isContentEditable) return NodeFilter.FILTER_REJECT;
        if (parent.classList.contains('siesta-replaced')) return NodeFilter.FILTER_REJECT;
        if (node.textContent.trim().length === 0) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach(processTextNode);
}

function processTextNode(textNode) {
  const text = textNode.textContent;
  const words = text.split(/(\s+|[.,;:!?'"()\[\]{}])/);
  
  if (words.length === 0) return;

  let hasReplacement = false;
  const fragment = document.createDocumentFragment();

  words.forEach(word => {
    const cleanWord = word.toLowerCase().trim();
    const translation = currentLanguageData?.[cleanWord];

    if (translation && shouldReplace()) {
      hasReplacement = true;
      const span = createReplacedWordSpan(word, translation, cleanWord);
      fragment.appendChild(span);

      // Record word seen
      SiestaStorage.recordWordSeen(cleanWord, currentSettings.targetLanguage, translation.word, translation.pronunciation);
    } else {
      fragment.appendChild(document.createTextNode(word));
    }
  });

  if (hasReplacement && textNode.parentNode) {
    textNode.parentNode.replaceChild(fragment, textNode);
  }
}

function shouldReplace() {
  return Math.random() * 100 < currentSettings.immersionLevel;
}

function createReplacedWordSpan(originalWord, translation, cleanWord) {
  const span = document.createElement('span');
  span.className = 'siesta-replaced';
  span.textContent = preserveCase(originalWord, translation.word);
  span.dataset.original = originalWord;
  span.dataset.word = cleanWord;
  span.dataset.pronunciation = translation.pronunciation || '';
  span.dataset.native = translation.native || translation.word;

  // Hover tooltip
  span.addEventListener('mouseenter', showTooltip);
  span.addEventListener('mouseleave', hideTooltip);

  return span;
}

function preserveCase(original, replacement) {
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

// Tooltip
let tooltipEl = null;

function showTooltip(e) {
  const span = e.target;
  
  // Record hover
  SiestaStorage.recordWordHovered(span.dataset.word, currentSettings.targetLanguage, span.dataset.native, span.dataset.pronunciation);

  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'siesta-tooltip';
    document.body.appendChild(tooltipEl);
  }

  const native = span.dataset.native !== span.textContent.toLowerCase() 
    ? `<div class="siesta-tooltip-native">${span.dataset.native}</div>` 
    : '';

  tooltipEl.innerHTML = `
    <div class="siesta-tooltip-original">${span.dataset.original}</div>
    ${native}
    <div class="siesta-tooltip-pronunciation">${span.dataset.pronunciation}</div>
    <button class="siesta-tooltip-known" data-word="${span.dataset.word}">✓ Mark as known</button>
  `;

  // Position
  const rect = span.getBoundingClientRect();
  tooltipEl.style.left = `${rect.left + window.scrollX}px`;
  tooltipEl.style.top = `${rect.bottom + window.scrollY + 6}px`;
  tooltipEl.style.display = 'block';

  // Mark as known button
  tooltipEl.querySelector('.siesta-tooltip-known').addEventListener('click', (ev) => {
    ev.stopPropagation();
    SiestaStorage.markAsKnown(span.dataset.word, currentSettings.targetLanguage, span.dataset.native, span.dataset.pronunciation);
    hideTooltip();
  });
}

function hideTooltip() {
  if (tooltipEl) {
    tooltipEl.style.display = 'none';
  }
}

// Listen for settings changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.targetLanguage || changes.immersionLevel || changes.enabled || changes.disabledSites) {
    window.location.reload();
  }
});

// Initialize
init();
