'use strict';
// 网页模式模块：侧边栏复选框站点列表 + iframe 会话 + 分发问题到 background。
// 依赖 app.js 核心全局：els / attachments / sessions / rowEls / setStatus / switchModel /
// removeSession / clearSessions / sessionCount / sessionIds / chrome。
window.WebMode = (() => {
  const MODE = 'web';
  let providers = [];
  let lastIds = [];
  let sessionAsked = false;

  function setBlocked(providerId) {
    const s = sessions[MODE].get(providerId);
    if (s && s.fallback) s.fallback.classList.add('show');
    setStatus(MODE, providerId, 'frame-blocked');
  }

  function clear() {
    clearSessions(MODE);
    sessionAsked = false;
    lastIds = [];
  }

  function ask() {
    const q = els.question.value.trim();
    if (!q) return;
    const ids = [...els.models.querySelectorAll('input:checked')].map(i => i.value);
    if (!ids.length) return;
    const existing = sessionIds(MODE);
    const removeIds = existing.filter(id => !ids.includes(id));
    removeIds.forEach(id => removeSession(MODE, id));
    const followUp = sessionCount(MODE) > 0;
    if (followUp) {
      for (const pid of ids) setStatus(MODE, pid, 'loading');
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
      wrap.className = 'frame-wrap fw-web';
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
      sessions[MODE].set(p.id, { mode: MODE, id: p.id, wrap, iframe, fallback });
      setStatus(MODE, p.id, 'loading');
    }
    if (selected.length) switchModel(MODE, selected[0].id);
  }

  function buildSession(ids) {
    clearSessions(MODE);
    if (!ids.length) return;
    els.emptyHint.style.display = 'none';
    createSessionRows(ids);
    sessionAsked = true;
  }

  function addSessions(ids) {
    if (!ids.length) return;
    els.emptyHint.style.display = 'none';
    createSessionRows(ids);
    sessionAsked = true;
  }

  function stop() {
    chrome.runtime.sendMessage({ type: 'stop-all' });
  }

  function newChat() {
    chrome.runtime.sendMessage({ type: 'reset-session' });
    location.reload();
  }

  function handleMessage(msg) {
    if (msg.type === 'session-reset') {
      clearSessions(MODE);
    } else if (msg.type === 'session-question') {
      if (msg.question) els.question.value = msg.question;
      if (sessionCount(MODE)) {
        const missing = lastIds.filter(id => !sessions[MODE].has(id));
        if (missing.length) addSessions(missing);
      } else if (lastIds.length) {
        buildSession(lastIds);
      }
    } else if (msg.type === 'status-update') {
      setStatus(MODE, msg.providerId, msg.status);
    } else if (msg.type === 'frame-blocked') {
      setBlocked(msg.providerId);
    }
  }

  async function renderModels() {
    providers = await loadProviders();
    const DEF_IDS = ['deepseek', 'qwen', 'kimi'];
    const noLogin = providers.filter(p => p.noLogin === true).map(p => p.id);
    const def = DEF_IDS.filter(id => providers.some(p => p.id === id));
    const defaultIds = def.length ? def : (noLogin.length ? noLogin : providers.map(p => p.id));
    const sel = new Set(defaultIds);
    chrome.storage.local.set({ selectedProviderIds: defaultIds });
    els.models.innerHTML = '';
    rowEls[MODE].clear();
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
        const s = sessions[MODE].get(p.id);
        if (!s) return;
        setStatus(MODE, p.id, 'loading');
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
        if (sessions[MODE].has(p.id)) { switchModel(MODE, p.id); return; }
        cb.checked = !cb.checked;
      });
      els.models.appendChild(row);
      rowEls[MODE].set(p.id, { mode: MODE, chk: cb, name, badge });
    }
  }

  return { init: renderModels, ask, stop, newChat, clear, handleMessage };
})();
