'use strict';
const $ = (s) => document.querySelector(s);
const els = {
  question: $('#question'),
  askBtn: $('#askBtn'),
  newChat: $('#newChat'),
  stopBtn: $('#stopBtn'),
  optsLink: $('#optsLink'),
  models: $('#models'),
  frames: $('#frames'),
  emptyHint: $('#emptyHint'),
  attachBtn: $('#attachBtn'),
  fileInput: $('#fileInput'),
  attachList: $('#attachList'),
  attachCount: $('#attachCount')
};

const attachments = []; // {name, type, size, data}  data=base64

const STATUS_TEXT = {
  waiting: '等待',
  loading: '加载中',
  injecting: '注入中',
  submitted: '生成中',
  'input-not-found': '',
  'inject-failed': '',
  'frame-blocked': '禁止嵌入',
  'fill-failed': '',
  'submit-failed': '',
  stopped: '已停止',
  done: '已答完'
};

const rowEls = new Map();   // providerId -> {chk, name, badge}
const sessions = new Map(); // providerId -> {wrap, iframe, fallback}
let providers = [];
let activeId = null;
let lastIds = [];
let sessionAsked = false;

function statusText(s) { return STATUS_TEXT[s] || s || '等待'; }

function badgeClass(s) {
  if (s === 'done') return 'done';
  if (s === 'stopped') return 'stopped';
  if (s === 'submitted' || s === 'loading' || s === 'injecting') return 'working';
  return 'waiting';
}

function setStatus(providerId, status) {
  const r = rowEls.get(providerId);
  if (!r) return;
  r.badge.className = 'badge ' + badgeClass(status);
  r.badge.textContent = statusText(status);
}

function switchModel(providerId) {
  activeId = providerId;
  for (const [pid, s] of sessions) {
    s.wrap.classList.toggle('active', pid === providerId);
  }
  for (const [pid, r] of rowEls) {
    r.name.classList.toggle('active', pid === providerId);
  }
}

function setBlocked(providerId) {
  const s = sessions.get(providerId);
  if (s) s.fallback.classList.add('show');
  setStatus(providerId, 'frame-blocked');
}

function clearSession() {
  sessions.clear();
  els.frames.innerHTML = '';
  activeId = null;
  sessionAsked = false;
  els.emptyHint.style.display = 'flex';
  for (const [, r] of rowEls) {
    r.badge.className = 'badge';
    r.badge.textContent = '';
    r.name.classList.remove('active');
  }
}

function fmtSize(n) {
  if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
  if (n >= 1024) return Math.round(n / 1024) + ' KB';
  return n + ' B';
}

function readFileAsBase64(file) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result;
      const i = s.indexOf(',');
      resolve(i >= 0 ? s.slice(i + 1) : '');
    };
    r.onerror = () => resolve('');
    r.readAsDataURL(file);
  });
}

async function addFiles(files) {
  for (const f of files) {
    const data = await readFileAsBase64(f);
    if (!data) continue;
    attachments.push({ name: f.name, type: f.type || 'application/octet-stream', size: f.size, data });
  }
  renderAttachments();
}

function renderAttachments() {
  els.attachList.innerHTML = '';
  els.attachCount.textContent = attachments.length ? `已选 ${attachments.length} 个文件` : '';
  attachments.forEach((a, i) => {
    const item = document.createElement('div');
    item.className = 'attach-item';
    const name = document.createElement('span');
    name.className = 'a-name';
    name.textContent = a.name;
    name.title = a.name;
    const size = document.createElement('span');
    size.className = 'a-size';
    size.textContent = fmtSize(a.size);
    const del = document.createElement('button');
    del.className = 'a-del';
    del.textContent = '\u00d7';
    del.addEventListener('click', () => {
      attachments.splice(i, 1);
      renderAttachments();
    });
    item.append(name, size, del);
    els.attachList.appendChild(item);
  });
}

els.attachBtn.addEventListener('click', () => els.fileInput.click());
els.fileInput.addEventListener('change', () => {
  addFiles(els.fileInput.files);
  els.fileInput.value = '';
});

function ask() {
  const q = els.question.value.trim();
  if (!q) return;
  const ids = [...els.models.querySelectorAll('input:checked')].map(i => i.value);
  if (!ids.length) return;
  const existing = [...sessions.keys()];
  const removeIds = existing.filter(id => !ids.includes(id));
  removeIds.forEach(id => removeSession(id));
  const followUp = sessions.size > 0;
  if (followUp) {
    for (const pid of ids) setStatus(pid, 'loading');
  }
  lastIds = ids;
  sessionAsked = true;
  chrome.storage.local.set({ selectedProviderIds: ids });
  const atts = attachments.map(a => ({ name: a.name, type: a.type, size: a.size, data: a.data }));
  chrome.runtime.sendMessage({ type: 'ask', question: q, providerIds: ids, followUp, source: 'app', attachments: atts }, () => { void chrome.runtime.lastError; });
}

async function createSessionRows(ids) {
  const selected = providers.filter(p => ids.includes(p.id));
  for (const p of selected) {
    const wrap = document.createElement('div');
    wrap.className = 'frame-wrap';
    const iframe = document.createElement('iframe');
    iframe.title = p.name;
    iframe.dataset.url = p.url;
    iframe.src = p.url;
    wrap.appendChild(iframe);
    const fallback = document.createElement('div');
    fallback.className = 'fallback';
    fallback.innerHTML = '<div class="fb-tip">该站点禁止 iframe 嵌入，无法在此显示</div><button class="fb-open">在新标签页打开</button>';
    fallback.querySelector('.fb-open').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'open-site', url: p.url }));
    wrap.appendChild(fallback);
    els.frames.appendChild(wrap);
    sessions.set(p.id, { wrap, iframe, fallback });
    setStatus(p.id, 'loading');
  }
  if (selected.length) switchModel(selected[0].id);
}

async function buildSession(ids) {
  clearSession();
  if (!ids.length) return;
  els.emptyHint.style.display = 'none';
  await createSessionRows(ids);
  sessionAsked = true;
}

function addSessions(ids) {
  if (!ids.length) return;
  els.emptyHint.style.display = 'none';
  createSessionRows(ids);
  sessionAsked = true;
}

function removeSession(id) {
  const s = sessions.get(id);
  if (s) {
    s.wrap.remove();
    sessions.delete(id);
  }
}

els.askBtn.addEventListener('click', ask);
els.question.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); }
});
els.newChat.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'reset-session' });
  location.reload();
});
els.stopBtn.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'stop-all' }));
els.optsLink.addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'session-reset') {
    clearSession();
  } else if (msg.type === 'session-question') {
    if (msg.question) els.question.value = msg.question;
    if (sessions.size) {
      const missing = lastIds.filter(id => !sessions.has(id));
      if (missing.length) addSessions(missing);
    } else if (lastIds.length) {
      buildSession(lastIds);
    }
  } else if (msg.type === 'status-update') {
    setStatus(msg.providerId, msg.status);
  } else if (msg.type === 'frame-blocked') {
    setBlocked(msg.providerId);
  }
});

async function renderModels() {
  providers = await loadProviders();
  const DEF_IDS = ['deepseek', 'qwen', 'kimi'];
  const noLogin = providers.filter(p => p.noLogin === true).map(p => p.id);
  const def = DEF_IDS.filter(id => providers.some(p => p.id === id));
  const defaultIds = def.length ? def : (noLogin.length ? noLogin : providers.map(p => p.id));
  const sel = new Set(defaultIds);
  chrome.storage.local.set({ selectedProviderIds: defaultIds });
  els.models.innerHTML = '';
  rowEls.clear();
  let lastRegion = '';
  for (const p of providers) {
    const region = p.region === 'overseas' ? '海外' : '国内';
    if (region !== lastRegion) {
      const label = document.createElement('div');
      label.className = 'models-label';
      label.textContent = region;
      els.models.appendChild(label);
      lastRegion = region;
    }
    const row = document.createElement('div');
    row.className = 'model';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'chk';
    cb.value = p.id;
    cb.checked = sel.has(p.id);
    const name = document.createElement('span');
    name.className = 'm-name';
    name.textContent = p.name;
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = '';
    const refresh = document.createElement('button');
    refresh.className = 'm-open m-refresh';
    refresh.title = '刷新并重问';
    refresh.textContent = '\u21bb';
    const open = document.createElement('button');
    open.className = 'm-open';
    open.title = '在新标签页打开';
    open.textContent = '\u2197';
    row.append(cb, name, badge, refresh, open);
    cb.addEventListener('click', (e) => e.stopPropagation());
    refresh.addEventListener('click', (e) => {
      e.stopPropagation();
      const s = sessions.get(p.id);
      if (!s) return;
      setStatus(p.id, 'loading');
      try { s.iframe.contentWindow.location.reload(); }
      catch (e2) {
        const url = s.iframe.dataset.url || p.url;
        s.iframe.src = 'about:blank';
        s.iframe.src = url;
      }
    });
    open.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: 'open-site', url: p.url });
    });
    row.addEventListener('click', () => {
      if (sessions.has(p.id)) { switchModel(p.id); return; }
      cb.checked = !cb.checked;
    });
    els.models.appendChild(row);
    rowEls.set(p.id, { chk: cb, name, badge });
  }
}

function restore() {
  chrome.runtime.sendMessage({ type: 'get-question' }, (q) => {
    if (chrome.runtime.lastError) return;
    if (q) els.question.value = q;
  });
}

renderModels();
restore();
