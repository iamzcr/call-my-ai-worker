'use strict';
importScripts('../lib/providers.js');

const APP_URL = 'app/app.html';

const state = {
  frameTasks: new Map(), // "tabId:frameId" -> {provider, question, status}
  providers: [],         // selected providers for the current session
  answers: new Map(),    // providerId -> answer text
  injected: new Set(),   // "tabId:frameId" already injected via scripting
  currentQuestion: '',
  currentAttachments: [],
  appWinId: null,
  appTabId: null,
  tasks: new Map(),      // test flow only (tabId -> task)
  winByTab: new Map()    // test flow only
};

// ---------- helpers ----------
function broadcast(msg) {
  try { chrome.runtime.sendMessage(msg, () => { void chrome.runtime.lastError; }); } catch (e) {}
}

function taskKey(sender) {
  const t = sender.tab ? sender.tab.id : 'x';
  const f = sender.frameId != null ? sender.frameId : 0;
  return t + ':' + f;
}

function registrableDomain(hostname) {
  const parts = String(hostname || '').split('.');
  if (parts.length <= 2) return hostname || '';
  return parts.slice(-2).join('.');
}

function matchSelectedByUrl(url, list) {
  if (!url || !list || !list.length) return null;
  for (const p of list) {
    if (!p.url) continue;
    try {
      const origin = new URL(p.url).origin;
      if (url.indexOf(origin) === 0) return p;
    } catch (e) {}
  }
  for (const p of list) {
    if (!p.url) continue;
    try {
      const pd = registrableDomain(new URL(p.url).hostname);
      const sd = registrableDomain(new URL(url).hostname);
      if (pd && sd && pd === sd) return p;
    } catch (e) {}
  }
  return null;
}

function matchProviderByUrl(url) {
  return matchSelectedByUrl(url, state.providers);
}

function setAppTab(id) {
  state.appTabId = id;
  chrome.storage.session.set({ appTabId: id }).catch(() => {});
}

function statusOf(providerId) {
  for (const t of state.frameTasks.values()) {
    if (t.provider && t.provider.id === providerId) return t.status;
  }
  return 'waiting';
}

function persistTasks() {
  const obj = {};
  for (const [tabId, t] of state.tasks) {
    obj[String(tabId)] = { kind: t.kind, provider: t.provider, question: t.question, status: t.status };
  }
  return chrome.storage.session.set({ tasks: obj }).catch(() => {});
}

async function restoreTasks() {
  try {
    const { tasks } = await chrome.storage.session.get('tasks');
    if (tasks) {
      for (const [tid, t] of Object.entries(tasks)) {
        const n = Number(tid);
        if (!state.tasks.has(n)) state.tasks.set(n, t);
      }
    }
  } catch (e) {}
}

function clearSession() {
  state.frameTasks.clear();
  state.providers = [];
  state.answers.clear();
  state.injected.clear();
  state.currentQuestion = '';
  state.currentAttachments = [];
  state.tasks.clear();
  state.winByTab.clear();
}

async function closeSession() {
  const winId = state.appWinId;
  state.appWinId = null;
  setAppTab(null);
  clearSession();
  await persistTasks();
  if (winId != null) chrome.windows.remove(winId).catch(() => {});
}

// ---------- app window ----------
async function ensureAppWindow() {
  if (state.appWinId != null) {
    try {
      await chrome.windows.get(state.appWinId);
      chrome.windows.update(state.appWinId, { focused: true }).catch(() => {});
      return state.appWinId;
    } catch (e) {
      state.appWinId = null;
      state.appTabId = null;
    }
  }
  const wins = await chrome.windows.getAll({ populate: true }).catch(() => []);
  for (const win of wins) {
    for (const tab of (win.tabs || [])) {
      if (((tab.pendingUrl || tab.url) || '').includes('app.html')) {
        state.appWinId = win.id;
        setAppTab(tab.id);
        chrome.windows.update(win.id, { focused: true }).catch(() => {});
        return win.id;
      }
    }
  }
  const win = await chrome.windows.create({
    url: chrome.runtime.getURL(APP_URL),
    type: 'normal',
    state: 'maximized',
    focused: true
  });
  state.appWinId = win.id;
  setAppTab(win.tabs && win.tabs[0] ? win.tabs[0].id : null);
  return win.id;
}

// ---------- ask: app page embeds iframes ----------
async function onAsk({ question, providerIds, followUp, attachments }) {
  const providers = await loadProviders();
  const selected = providers.filter(p => providerIds.includes(p.id));
  if (!selected.length) return { ok: false, error: 'no-provider' };

  if (state.appWinId != null) {
    try { await chrome.windows.get(state.appWinId); }
    catch (e) { state.appWinId = null; setAppTab(null); }
  }
  if (state.appWinId == null) await closeSession();
  let winId = state.appWinId;
  if (winId == null) {
    try { winId = await ensureAppWindow(); }
    catch (e) { return { ok: false, error: String(e) }; }
  }

  state.currentAttachments = attachments || [];

  if (followUp) {
    // keep the current session; push the follow-up question into each live iframe
    state.currentQuestion = question;
    state.providers = selected;
    state.answers.clear();
    const keepIds = new Set(providerIds);
    for (const [key, t] of state.frameTasks) {
      if (t.provider && !keepIds.has(t.provider.id)) state.frameTasks.delete(key);
      else { t.question = question; t.status = 'loading'; }
    }
    broadcast({ type: 'session-question', question, followUp: true });
    let tabId = state.appTabId;
    if (tabId == null) {
      const winId = await ensureAppWindow();
      tabId = state.appTabId;
    }
    if (tabId != null) {
      chrome.webNavigation.getAllFrames({ tabId }).then((frames) => {
        let matched = 0;
        for (const f of (frames || [])) {
          if (f.frameId === 0) continue;
          const p = matchSelectedByUrl(f.url || '', selected);
          if (p) {
            matched++;
            chrome.tabs.sendMessage(tabId, { type: 'ask-question', question, provider: p, attachments: state.currentAttachments }, { frameId: f.frameId }, () => { void chrome.runtime.lastError; });
          }
        }
        if (!matched) {
          broadcast({ type: 'session-question', question, followUp: true });
        }
      }).catch(() => {});
    }
    startFrameSweep();
    return { ok: true, count: selected.length };
  }

  state.currentQuestion = question;
  state.providers = selected;
  state.answers.clear();
  state.frameTasks.clear();
  state.injected.clear();

  broadcast({ type: 'session-reset' });
  broadcast({ type: 'session-question', question });
  startFrameSweep();
  return { ok: true, count: selected.length };
}

// ---------- frame injection ----------
async function injectFrame(tabId, frameId) {
  const key = tabId + ':' + frameId;
  if (state.injected.has(key)) return;
  state.injected.add(key);
  try {
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      files: ['content/lib.js', 'content/fill-watch.js']
    });
  } catch (e) {
    state.injected.delete(key);
  }
}

function startFrameSweep() {
  if (state.appTabId == null) return;
  const tabId = state.appTabId;
  let attempts = 0;
  const timer = setInterval(() => {
    chrome.webNavigation.getAllFrames({ tabId }).then((frames) => {
      for (const f of (frames || [])) {
        if (f.frameId === 0) continue;
        if (matchProviderByUrl(f.url || '')) injectFrame(tabId, f.frameId);
      }
    }).catch(() => {});
    if (++attempts >= 30) clearInterval(timer);
  }, 1000);
}

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) return;
  if (details.tabId !== state.appTabId) return;
  if (matchProviderByUrl(details.url || '')) injectFrame(details.tabId, details.frameId);
});

chrome.webNavigation.onErrorOccurred.addListener((details) => {
  if (details.frameId === 0) return;
  if (details.tabId !== state.appTabId) return;
  const p = matchProviderByUrl(details.url || '');
  if (!p) return;
  const blocked = /ERR_BLOCKED_BY_RESPONSE/i.test(details.error || '');
  broadcast({ type: 'status-update', providerId: p.id, name: p.name, status: blocked ? 'frame-blocked' : 'inject-failed' });
  if (blocked) broadcast({ type: 'frame-blocked', providerId: p.id, name: p.name });
});

// ---------- test flow (options page) ----------
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') injectTask(tabId);
});

async function injectTask(tabId) {
  const task = state.tasks.get(tabId);
  if (!task || task.status !== 'loading') return;
  task.status = 'injecting';
  await persistTasks();
  const files = task.kind === 'test'
    ? ['content/lib.js', 'content/test-selector.js']
    : ['content/lib.js', 'content/fill-watch.js'];
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files });
  } catch (e) {
    task.status = 'inject-failed';
    await persistTasks();
  }
}

async function handleTest(provider) {
  const displays = await chrome.system.display.getInfo();
  const prim = displays.find(d => d.isPrimary) || displays[0];
  const sc = prim.workArea || { left: 0, top: 0, width: 1200, height: 800 };
  const win = await chrome.windows.create({
    url: provider.url,
    type: 'normal',
    left: sc.left,
    top: sc.top,
    width: Math.min(sc.width, 1400),
    height: Math.min(sc.height, 900),
    focused: true
  });
  const tabId = win.tabs[0].id;
  state.tasks.set(tabId, { kind: 'test', provider, status: 'loading' });
  state.winByTab.set(tabId, win.id);
  await chrome.storage.session.set({ pendingTest: provider });
  await persistTasks();
  return { ok: true };
}

// ---------- window / notification ----------
chrome.windows.onRemoved.addListener((winId) => {
  if (winId === state.appWinId) {
    state.appWinId = null;
    setAppTab(null);
    clearSession();
    persistTasks();
    return;
  }
  let changed = false;
  for (const [tabId, wId] of state.winByTab) {
    if (wId === winId) {
      state.winByTab.delete(tabId);
      state.tasks.delete(tabId);
      changed = true;
    }
  }
  if (changed) persistTasks();
});

function handleStopAll() {
  if (state.appTabId != null) {
    chrome.webNavigation.getAllFrames({ tabId: state.appTabId }).then((frames) => {
      for (const f of (frames || [])) {
        if (f.frameId === 0) continue;
        const p = matchProviderByUrl(f.url || '');
        if (p) {
          chrome.tabs.sendMessage(state.appTabId, { type: 'stop-answer', provider: p }, { frameId: f.frameId }, () => { void chrome.runtime.lastError; });
        }
      }
    }).catch(() => {});
  }
  state.answers.clear();
  for (const t of state.frameTasks.values()) {
    t.status = 'stopped';
    broadcast({ type: 'status-update', providerId: t.provider ? t.provider.id : '?', name: t.provider ? t.provider.name : '站点', status: 'stopped' });
  }
}

// ---------- message router ----------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const key = taskKey(sender);
  const tabId = sender.tab ? sender.tab.id : null;

  if (msg.type === 'ask') {
    onAsk(msg).then(sendResponse).catch(e => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
  if (msg.type === 'stop-all') {
    handleStopAll();
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === 'reset-session') {
    state.frameTasks.clear();
    state.providers = [];
    state.answers.clear();
    state.injected.clear();
    state.currentQuestion = '';
    state.currentAttachments = [];
    broadcast({ type: 'session-reset' });
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === 'get-status') {
    const arr = state.providers.map(p => ({
      providerId: p.id,
      name: p.name,
      status: statusOf(p.id),
      answer: state.answers.get(p.id) || ''
    }));
    sendResponse(arr);
    return false;
  }
  if (msg.type === 'get-question') {
    sendResponse(state.currentQuestion || '');
    return false;
  }
  if (msg.type === 'open-site') {
    if (msg.url) chrome.tabs.create({ url: msg.url, active: true }).catch(() => {});
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === 'test') {
    handleTest(msg.provider).then(sendResponse).catch(e => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
  if (msg.type === 'content-ready') {
    if (!(tabId != null && tabId === state.appTabId)) { sendResponse(null); return false; }
    let task = state.frameTasks.get(key);
    if (!task) {
      const p = matchProviderByUrl(sender.url || '');
      if (p) {
        task = { provider: p, question: state.currentQuestion, status: 'loading' };
        state.frameTasks.set(key, task);
      }
    }
    sendResponse(task ? { provider: task.provider, question: task.question, attachments: state.currentAttachments } : null);
    return false;
  }
  if (msg.type === 'fill-status') {
    const task = state.frameTasks.get(key);
    if (task) task.status = msg.status;
    const p = task ? task.provider : matchProviderByUrl(sender.url || '');
    broadcast({ type: 'status-update', providerId: p ? p.id : '?', name: p ? p.name : '站点', status: msg.status });
    return false;
  }
  if (msg.type === 'answer-update') {
    const task = state.frameTasks.get(key);
    const p = task ? task.provider : null;
    if (p && msg.text) state.answers.set(p.id, msg.text);
    broadcast({ type: 'answer-update', providerId: p ? p.id : '?', name: p ? p.name : '站点', text: msg.text || '' });
    return false;
  }
  if (msg.type === 'answer-done') {
    const task = state.frameTasks.get(key);
    const p = task ? task.provider : null;
    if (task) task.status = 'done';
    if (p) {
      if (msg.text) state.answers.set(p.id, msg.text);
      broadcast({ type: 'status-update', providerId: p.id, name: p.name, status: 'done' });
      broadcast({ type: 'answer', providerId: p.id, name: p.name, text: msg.text || '' });
    }
    return false;
  }
  if (msg.type === 'test-result') {
    const winId = tabId != null ? state.winByTab.get(tabId) : null;
    if (winId != null) {
      state.winByTab.delete(tabId);
      state.tasks.delete(tabId);
      chrome.windows.remove(winId).catch(() => {});
    }
    return false;
  }
  if (msg.type === 'heartbeat' || msg.type === 'error') {
    return false;
  }
  return false;
});

// ---------- init ----------
chrome.action.onClicked.addListener(() => {
  ensureAppWindow();
});
if (chrome.storage.session && chrome.storage.session.setAccessLevel) {
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' }).catch(() => {});
}
chrome.storage.session.get('appTabId').then(({ appTabId }) => {
  if (appTabId != null) state.appTabId = appTabId;
}).catch(() => {});
restoreTasks();
