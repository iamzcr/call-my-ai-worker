'use strict';
// 核心壳：元素引用、附件、状态/徽标/面板切换共用机制、模式切换、公共事件分发。
// 模式模块 web-mode.js / api-mode.js 挂到 window.WebMode / window.ApiMode。
const $ = (s) => document.querySelector(s);

const els = {
  question: $('#question'),
  askBtn: $('#askBtn'),
  newChat: $('#newChat'),
  stopBtn: $('#stopBtn'),
  optsLink: $('#optsLink'),
  contactBtn: $('#contactBtn'),
  qrPop: $('#qrPop'),
  models: $('#models'),
  modelsLabel: $('#modelsLabel'),
  frames: $('#frames'),
  emptyHint: $('#emptyHint'),
  attachBtn: $('#attachBtn'),
  fileInput: $('#fileInput'),
  attachList: $('#attachList'),
  attachCount: $('#attachCount'),
  attachNote: $('#attachNote'),
  modeWeb: $('#modeWeb'),
  modeApi: $('#modeApi'),
  apiPanel: $('#apiPanel')
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
  done: '已答完',
  failed: '失败'
};

const rowEls = { web: new Map(), api: new Map() };   // mode -> id -> {name, badge, ...}
const sessions = { web: new Map(), api: new Map() }; // mode -> id -> {wrap, body, ...}
const activeId = { web: null, api: null };
let mode = 'web';

function statusText(s) { return STATUS_TEXT[s] || s || '等待'; }

function badgeClass(s) {
  if (s === 'done') return 'done';
  if (s === 'stopped') return 'stopped';
  if (s === 'failed') return 'failed';
  if (s === 'submitted' || s === 'loading' || s === 'injecting') return 'working';
  return 'waiting';
}

function sessionCount(m) { return sessions[m].size; }
function sessionIds(m) { return [...sessions[m].keys()]; }

function refreshEmptyHint() {
  els.emptyHint.style.display = sessionCount(mode) ? 'none' : 'flex';
}

function setStatus(m, id, status) {
  const r = rowEls[m].get(id);
  if (!r) return;
  r.badge.className = 'badge ' + badgeClass(status);
  r.badge.textContent = statusText(status);
}

function switchModel(m, id) {
  activeId[m] = id;
  for (const [pid, s] of sessions[m]) {
    s.wrap.classList.toggle('active', pid === id);
  }
  for (const [pid, r] of rowEls[m]) {
    if (r.name) r.name.classList.toggle('active', pid === id);
  }
}

function removeSession(m, id) {
  const s = sessions[m].get(id);
  if (s) {
    s.wrap.remove();
    sessions[m].delete(id);
  }
}

function clearSessions(m) {
  for (const [, s] of sessions[m]) s.wrap.remove();
  sessions[m].clear();
  activeId[m] = null;
  for (const [, r] of rowEls[m]) {
    r.badge.className = 'badge';
    r.badge.textContent = '';
    if (r.name) r.name.classList.remove('active');
  }
  refreshEmptyHint();
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
  const hasNonImage = attachments.some(a => !(a.type && a.type.indexOf('image/') === 0));
  els.attachNote.classList.toggle('hidden', !hasNonImage);
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

// ---------- 公共事件：按模式分发 ----------
function ask() {
  if (mode === 'web') WebMode.ask();
  else ApiMode.ask();
}
function stopAll() {
  if (mode === 'web') WebMode.stop();
  else ApiMode.stop();
}
function newChat() {
  if (mode === 'web') WebMode.newChat();
  else ApiMode.newChat();
}

els.askBtn.addEventListener('click', ask);
els.question.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); }
});
els.stopBtn.addEventListener('click', stopAll);
els.newChat.addEventListener('click', newChat);
els.optsLink.addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });

// ---------- 模式切换 ----------
function setMode(m) {
  if (m === mode) return;
  mode = m;
  document.body.classList.toggle('mode-api', m === 'api');
  els.modeWeb.classList.toggle('on', m === 'web');
  els.modeApi.classList.toggle('on', m === 'api');
  try { chrome.storage.local.set({ mode: m }); } catch (e) {}
  refreshEmptyHint();
}

els.modeWeb.addEventListener('click', () => setMode('web'));
els.modeApi.addEventListener('click', () => setMode('api'));

// ---------- 消息监听（网页模式来自 background 的广播） ----------
chrome.runtime.onMessage.addListener((msg) => {
  if (window.WebMode && typeof WebMode.handleMessage === 'function') WebMode.handleMessage(msg);
});

// ---------- 联系我们 ----------
let qrHideTimer = null;
function showQr() {
  clearTimeout(qrHideTimer);
  els.qrPop.classList.add('show');
}
function hideQr() {
  clearTimeout(qrHideTimer);
  qrHideTimer = setTimeout(() => els.qrPop.classList.remove('show'), 150);
}
els.contactBtn.addEventListener('mouseenter', showQr);
els.contactBtn.addEventListener('mouseleave', hideQr);
els.qrPop.addEventListener('mouseenter', showQr);
els.qrPop.addEventListener('mouseleave', hideQr);

// ---------- 启动 ----------
async function initApp() {
  await WebMode.init();
  await ApiMode.init();
  const { mode: savedMode } = await chrome.storage.local.get('mode');
  if (savedMode === 'api') setMode('api');
}

window.initApp = initApp;
