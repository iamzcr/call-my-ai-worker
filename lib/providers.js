const DEFAULT_PROVIDERS = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    region: 'domestic',
    url: 'https://chat.deepseek.com/',
    inputSelector: 'textarea#chat-input, textarea, [contenteditable="true"]',
    sendBy: 'enter',
    sendButtonSelector: '',
    fileInputSelector: '',
    attachButtonSelector: '',
    stopSelector: 'button[aria-label*="stop" i], button[aria-label*="停止" i], button[data-testid*="stop" i], button[title*="stop" i]',
    regenerateSelector: '',
    answerSelector: '.ds-markdown',
    noLogin: true,
    note: '需 dNR 剥 CSP，实测待验证'
  },
  {
    id: 'qwen',
    name: '千问 Qwen',
    region: 'domestic',
    url: 'https://www.qianwen.com/chat/',
    inputSelector: 'textarea, [contenteditable="true"]',
    sendBy: 'enter',
    sendButtonSelector: '',
    fileInputSelector: '',
    attachButtonSelector: '',
    stopSelector: 'button[aria-label*="stop" i], button[aria-label*="停止" i], button[data-testid*="stop" i], button[title*="stop" i]',
    regenerateSelector: '',
    answerSelector: '[class*="markdown"]',
    noLogin: true,
    note: 'dNR 剥 XFO 后可嵌入'
  },
  {
    id: 'kimi',
    name: 'Kimi',
    region: 'domestic',
    url: 'https://www.kimi.com/chat',
    inputSelector: 'textarea, [contenteditable="true"]',
    sendBy: 'enter',
    sendButtonSelector: '',
    fileInputSelector: '',
    attachButtonSelector: '',
    stopSelector: 'button[aria-label*="stop" i], button[aria-label*="停止" i], button[data-testid*="stop" i], button[title*="stop" i]',
    regenerateSelector: '',
    answerSelector: '[class*="markdown"]',
    noLogin: true,
    note: '允许 iframe'
  },
  {
    id: 'doubao',
    name: '豆包',
    region: 'domestic',
    url: 'https://www.doubao.com/chat/',
    inputSelector: 'textarea, [contenteditable="true"]',
    sendBy: 'enter',
    sendButtonSelector: '',
    fileInputSelector: '',
    attachButtonSelector: '',
    stopSelector: 'button[aria-label*="stop" i], button[aria-label*="停止" i], button[data-testid*="stop" i], button[title*="stop" i]',
    regenerateSelector: '',
    answerSelector: '',
    noLogin: false,
    note: '允许 iframe'
  },
  {
    id: 'chatglm',
    name: '智谱清言',
    region: 'domestic',
    url: 'https://www.chatglm.cn/',
    inputSelector: 'textarea, [contenteditable="true"]',
    sendBy: 'enter',
    sendButtonSelector: '',
    fileInputSelector: '',
    attachButtonSelector: '',
    stopSelector: 'button[aria-label*="stop" i], button[aria-label*="停止" i], button[data-testid*="stop" i], button[title*="stop" i]',
    regenerateSelector: '',
    answerSelector: '',
    noLogin: false,
    note: '允许 iframe'
  },
  {
    id: 'yuanbao',
    name: '腾讯元宝',
    region: 'domestic',
    url: 'https://yuanbao.tencent.com/',
    inputSelector: 'textarea, [contenteditable="true"]',
    sendBy: 'enter',
    sendButtonSelector: '',
    fileInputSelector: '',
    attachButtonSelector: '',
    stopSelector: 'button[aria-label*="stop" i], button[aria-label*="停止" i], button[data-testid*="stop" i], button[title*="stop" i]',
    regenerateSelector: '',
    answerSelector: '',
    noLogin: false,
    note: '允许 iframe'
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    region: 'domestic',
    url: 'https://agent.minimaxi.com/',
    inputSelector: 'textarea, [contenteditable="true"]',
    sendBy: 'enter',
    sendButtonSelector: '',
    fileInputSelector: '',
    attachButtonSelector: '',
    stopSelector: 'button[aria-label*="stop" i], button[aria-label*="停止" i], button[data-testid*="stop" i], button[title*="stop" i]',
    regenerateSelector: '',
    answerSelector: '',
    noLogin: false,
    note: '允许 iframe'
  },
  {
    id: 'zhihu',
    name: '知乎直答',
    region: 'domestic',
    url: 'https://zhida.zhihu.com/',
    inputSelector: 'textarea, [contenteditable="true"]',
    sendBy: 'enter',
    sendButtonSelector: '',
    fileInputSelector: '',
    attachButtonSelector: '',
    stopSelector: 'button[aria-label*="stop" i], button[aria-label*="停止" i], button[data-testid*="stop" i], button[title*="stop" i]',
    regenerateSelector: '',
    answerSelector: '',
    noLogin: false,
    note: '需 dNR 剥 CSP'
  },
  {
    id: 'gemini',
    name: 'Gemini',
    region: 'overseas',
    url: 'https://gemini.google.com/app',
    inputSelector: 'rich-textarea, textarea, [contenteditable="true"]',
    sendBy: 'enter',
    sendButtonSelector: '',
    fileInputSelector: '',
    attachButtonSelector: '',
    stopSelector: 'button[aria-label*="stop" i], button[aria-label*="停止" i], button[data-testid*="stop" i], button[title*="stop" i]',
    regenerateSelector: '',
    answerSelector: '[class*="markdown"]',
    noLogin: false,
    note: '需登录，反嵌入较强'
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    region: 'overseas',
    url: 'https://chatgpt.com/',
    inputSelector: 'textarea, [contenteditable="true"]',
    sendBy: 'enter',
    sendButtonSelector: '',
    fileInputSelector: '',
    attachButtonSelector: '',
    stopSelector: 'button[aria-label*="stop" i], button[aria-label*="停止" i], button[data-testid*="stop" i], button[title*="stop" i]',
    regenerateSelector: '',
    answerSelector: '[class*="markdown"]',
    noLogin: false,
    note: '需登录，反嵌入较强'
  },
  {
    id: 'copilot',
    name: 'Copilot',
    region: 'overseas',
    url: 'https://copilot.microsoft.com/',
    inputSelector: 'textarea, [contenteditable="true"]',
    sendBy: 'enter',
    sendButtonSelector: '',
    fileInputSelector: '',
    attachButtonSelector: '',
    stopSelector: 'button[aria-label*="stop" i], button[aria-label*="停止" i], button[data-testid*="stop" i], button[title*="stop" i]',
    regenerateSelector: '',
    answerSelector: '[class*="markdown"]',
    noLogin: false,
    note: '需登录'
  },
  {
    id: 'grok',
    name: 'Grok',
    region: 'overseas',
    url: 'https://grok.com/',
    inputSelector: 'textarea, [contenteditable="true"]',
    sendBy: 'enter',
    sendButtonSelector: '',
    fileInputSelector: '',
    attachButtonSelector: '',
    stopSelector: 'button[aria-label*="stop" i], button[aria-label*="停止" i], button[data-testid*="stop" i], button[title*="stop" i]',
    regenerateSelector: '',
    answerSelector: '[class*="markdown"]',
    noLogin: false,
    note: '需登录'
  },
  {
    id: 'claude',
    name: 'Claude',
    region: 'overseas',
    url: 'https://claude.ai/',
    inputSelector: 'textarea, [contenteditable="true"]',
    sendBy: 'enter',
    sendButtonSelector: '',
    fileInputSelector: '',
    attachButtonSelector: '',
    stopSelector: 'button[aria-label*="stop" i], button[aria-label*="停止" i], button[data-testid*="stop" i], button[title*="stop" i]',
    regenerateSelector: '',
    answerSelector: '[class*="markdown"]',
    noLogin: false,
    note: '需登录，反嵌入较强'
  }
];

const DEFAULT_SETTINGS = { notifyDone: true };

async function loadProviders() {
  try {
    const { providers } = await chrome.storage.local.get('providers');
    if (providers && Array.isArray(providers) && providers.length) {
      return providers.map(p => ({ ...p }));
    }
  } catch (e) {}
  return DEFAULT_PROVIDERS.map(p => ({ ...p }));
}

async function saveProviders(providers) {
  return chrome.storage.local.set({ providers });
}

async function loadSettings() {
  try {
    const { settings } = await chrome.storage.local.get('settings');
    return Object.assign({}, DEFAULT_SETTINGS, settings || {});
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

async function saveSettings(settings) {
  return chrome.storage.local.set({ settings });
}
