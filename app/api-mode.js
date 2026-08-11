'use strict';
// API 模式模块：选择供应商 → 拉取模型 → 搜索+多选 → 流式文字面板。
// 完全在页面内自持（AbortController + SSE 渲染），不依赖 background。
// 依赖 app.js 核心全局：$ / els / attachments / sessions / rowEls / setStatus / switchModel /
// removeSession / clearSessions / chrome，以及 lib/api-providers.js 的 ApiProviders。
window.ApiMode = (() => {
  const MODE = 'api';
  const u = {
    provSel: $('#apiProviderSel'),
    loadBtn: $('#apiLoadBtn'),
    keyRow: $('#apiKeyRow'),
    keySel: $('#apiKeySel'),
    keyDel: $('#apiKeyDel'),
    keyInput: $('#apiKeyInput'),
    keyEye: $('#apiKeyEye'),
    keyAdd: $('#apiKeyAdd'),
    dropBtn: $('#apiDropBtn'),
    dropPanel: $('#apiDropPanel'),
    search: $('#apiSearch'),
    dropList: $('#apiDropList'),
    selAll: $('#apiSelAll'),
    clearAll: $('#apiClearAll'),
    noProv: $('#apiNoProvider'),
    goOpts2: $('#apiGoOpts2'),
    rows: $('#apiRows')
  };

  const state = {
    providers: [],
    current: null,
    currentId: null,
    models: [],
    selected: [],        // 选中的模型 id
    rowIds: new Set(),   // 当前行占用的 id（用于清理 rowEls 中已取消的项）
    history: new Map(),  // modelId -> messages[]
    aborts: new Map(),   // modelId -> AbortController
    rawAnswers: new Map(), // modelId -> 原始 Markdown 文本
    lastQuestion: ''
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function flashDropBtn(text, ms) {
    const prev = u.dropBtn.textContent;
    u.dropBtn.textContent = text;
    setTimeout(() => { if (u.dropBtn.textContent === text) u.dropBtn.textContent = prev; }, ms || 1800);
  }

  // ---------- 供应商 ----------
  function fillProvSel() {
    u.provSel.innerHTML = '';
    for (const p of state.providers) {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.name;
      u.provSel.appendChild(o);
    }
  }

  function updateHints() {
    const hasProv = !!state.current;
    u.noProv.classList.toggle('hidden', hasProv);
    u.keyRow.classList.toggle('hidden', !hasProv);
    if (hasProv) renderKeyRow();
  }

  // 按当前供应商 keys 填充 Key 下拉，选中项为 activeKey
  function renderKeyRow() {
    const p = state.current;
    if (!p) return;
    u.keySel.innerHTML = '';
    const keys = p.keys || [];
    if (keys.length) {
      for (const k of keys) {
        const o = document.createElement('option');
        o.value = k;
        o.textContent = ApiProviders.maskKey(k);
        o.title = k;
        u.keySel.appendChild(o);
      }
      const active = ApiProviders.currentKey(p);
      if (active && keys.indexOf(active) !== -1) u.keySel.value = active;
      else if (keys.length) { p.activeKey = keys[0]; }
    } else {
      const o = document.createElement('option');
      o.value = '';
      o.textContent = '尚无 Key，在下方添加';
      u.keySel.appendChild(o);
    }
  }

  async function loadModels(force) {
    if (!state.current) return [];
    const models = await ApiProviders.fetchModels(state.current, { useCache: !force })
      .catch((e) => {
        u.dropList.innerHTML = '<div class="api-empty">模型加载失败: ' + esc(e && e.message ? e.message : e) + '</div>';
        return [];
      });
    return models;
  }

  async function selectProvider(pid) {
    const changed = pid !== state.currentId;
    state.current = state.providers.find(p => p.id === pid) || null;
    if (changed) {
      for (const [, ac] of state.aborts) ac.abort();
      state.aborts.clear();
      state.history.clear();
      clearSessions(MODE);
      state.selected = [];
      chrome.storage.local.set({ apiModelIds: [] });
    }
    state.currentId = pid;
    chrome.storage.local.set({ apiProviderId: pid });
    u.provSel.value = pid;
    state.models = [];
    updateHints();
    if (state.current && ApiProviders.currentKey(state.current)) {
      state.models = await loadModels(false);
      state.selected = state.selected.filter(id => state.models.some(m => m.id === id));
    }
    updateSelectionUI();
    renderDrop();
    if (state.current && !ApiProviders.currentKey(state.current)) u.keyInput.focus();
  }

  async function addKey() {
    const key = u.keyInput.value.trim();
    if (!state.current || !key) return;
    const p = state.current;
    if (p.keys.indexOf(key) === -1) p.keys.push(key);
    p.activeKey = key;
    await ApiProviders.save(state.providers);
    renderKeyRow();
    u.keyInput.value = '';
    if (!state.models.length) {
      state.models = await loadModels(true);
      state.selected = state.selected.filter(id => state.models.some(m => m.id === id));
      updateSelectionUI();
      renderDrop();
    }
  }

  async function switchKey() {
    const p = state.current;
    if (!p) return;
    p.activeKey = u.keySel.value || '';
    await ApiProviders.save(state.providers);
    if (!state.models.length) {
      state.models = await loadModels(true);
      state.selected = state.selected.filter(id => state.models.some(m => m.id === id));
      updateSelectionUI();
      renderDrop();
    }
  }

  async function delKey() {
    const p = state.current;
    if (!p) return;
    const k = u.keySel.value;
    if (!k) return;
    p.keys = p.keys.filter(x => x !== k);
    if (p.activeKey === k) p.activeKey = p.keys[0] || '';
    await ApiProviders.save(state.providers);
    renderKeyRow();
  }

  u.keyEye.addEventListener('click', () => {
    u.keyInput.type = u.keyInput.type === 'password' ? 'text' : 'password';
  });
  u.keyAdd.addEventListener('click', addKey);
  u.keySel.addEventListener('change', switchKey);
  u.keyDel.addEventListener('click', delKey);
  u.keyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addKey(); }
  });
  u.provSel.addEventListener('change', () => selectProvider(u.provSel.value));
  u.loadBtn.addEventListener('click', async () => {
    if (!state.current) return;
    if (!ApiProviders.currentKey(state.current)) { updateHints(); u.keyInput.focus(); return; }
    state.models = await loadModels(true);
    state.selected = state.selected.filter(id => state.models.some(m => m.id === id));
    updateSelectionUI();
    renderDrop();
  });

  // ---------- 模型多选下拉 ----------
  function toggleModel(id, on) {
    const set = new Set(state.selected);
    if (on) set.add(id); else set.delete(id);
    state.selected = [...set];
    updateSelectionUI();
    chrome.storage.local.set({ apiModelIds: state.selected });
  }

  function updateSelectionUI() {
    u.dropBtn.textContent = '选择模型（' + state.selected.length + '）';
    renderRows();
  }

  function renderDrop() {
    const q = u.search.value.trim().toLowerCase();
    const list = state.models.filter(m =>
      !q ||
      (m.name && m.name.toLowerCase().indexOf(q) !== -1) ||
      (m.id && m.id.toLowerCase().indexOf(q) !== -1)
    );
    u.dropList.innerHTML = '';
    if (!state.models.length) {
      u.dropList.innerHTML = '<div class="api-empty">暂无模型，点击「加载模型」拉取</div>';
      return;
    }
    if (!list.length) {
      u.dropList.innerHTML = '<div class="api-empty">无匹配模型</div>';
      return;
    }
    const selectedSet = new Set(state.selected);
    for (const m of list) {
      const label = document.createElement('label');
      label.className = 'api-opt';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = selectedSet.has(m.id);
      cb.addEventListener('change', () => toggleModel(m.id, cb.checked));
      const name = document.createElement('span');
      name.textContent = m.name;
      name.title = m.id;
      const idTxt = document.createElement('span');
      idTxt.className = 'api-opt-id';
      idTxt.textContent = m.id;
      label.append(cb, name, idTxt);
      u.dropList.appendChild(label);
    }
  }

  u.dropBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    u.dropPanel.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!u.dropPanel.classList.contains('open')) return;
    if (u.dropPanel.contains(e.target) || e.target === u.dropBtn) return;
    u.dropPanel.classList.remove('open');
  });
  u.search.addEventListener('input', renderDrop);
  u.selAll.addEventListener('click', () => {
    const q = u.search.value.trim().toLowerCase();
    const ids = state.models
      .filter(m => !q || (m.name && m.name.toLowerCase().indexOf(q) !== -1) || (m.id && m.id.toLowerCase().indexOf(q) !== -1))
      .map(m => m.id);
    state.selected = [...new Set([...state.selected, ...ids])];
    updateSelectionUI();
    renderDrop();
    chrome.storage.local.set({ apiModelIds: state.selected });
  });
  u.clearAll.addEventListener('click', () => {
    state.selected = [];
    updateSelectionUI();
    renderDrop();
    chrome.storage.local.set({ apiModelIds: state.selected });
  });
  u.goOpts2.addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });

  // ---------- 已选模型状态行 ----------
  function renderRows() {
    u.rows.innerHTML = '';
    const selectedSet = new Set(state.selected);
    for (const id of [...state.rowIds]) {
      if (!selectedSet.has(id)) rowEls[MODE].delete(id);
    }
    state.rowIds = new Set(state.selected);
    if (!state.selected.length) {
      u.rows.innerHTML = '<div class="api-empty">尚未选择模型</div>';
      return;
    }
    for (const id of state.selected) {
      const m = state.models.find(x => x.id === id);
      const row = document.createElement('div');
      row.className = 'model';
      const name = document.createElement('span');
      name.className = 'm-name';
      name.textContent = m ? m.name : id;
      name.title = id;
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = '';
      const refresh = document.createElement('button');
      refresh.className = 'm-open m-refresh';
      refresh.title = '刷新并重问';
      refresh.textContent = '\u21bb';
      const copy = document.createElement('button');
      copy.className = 'm-open';
      copy.title = '复制答案';
      copy.textContent = '\u29c9';
      row.append(name, badge, refresh, copy);
      refresh.addEventListener('click', (e) => { e.stopPropagation(); reask(id); });
      copy.addEventListener('click', (e) => { e.stopPropagation(); copyAnswer(id); });
      row.addEventListener('click', () => { if (sessions[MODE].has(id)) switchModel(MODE, id); });
      u.rows.appendChild(row);
      rowEls[MODE].set(id, { mode: MODE, name, badge, copy, refresh });
    }
  }

  // ---------- 面板与流式 ----------
  function createPanel(id) {
    const m = state.models.find(x => x.id === id);
    const wrap = document.createElement('div');
    wrap.className = 'frame-wrap fw-api';
    const inner = document.createElement('div');
    inner.className = 'api-panel';
    const head = document.createElement('div');
    head.className = 'api-panel-head';
    const nm = document.createElement('span');
    nm.className = 'api-panel-name';
    nm.textContent = m ? m.name : id;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'api-view-toggle';
    toggle.title = '切换 渲染 Markdown / 原文源码';
    toggle.textContent = '原文';
    head.append(nm, toggle);
    const body = document.createElement('div');
    body.className = 'api-body';
    const q = document.createElement('div');
    q.className = 'api-q';
    const ans = document.createElement('div');
    ans.className = 'api-ans';
    body.append(q, ans);
    inner.append(head, body);
    wrap.appendChild(inner);
    els.frames.appendChild(wrap);
    sessions[MODE].set(id, { mode: MODE, id, wrap, body, q, ans, toggle, view: 'md' });
    toggle.addEventListener('click', () => {
      const s = sessions[MODE].get(id);
      if (!s) return;
      s.view = s.view === 'md' ? 'src' : 'md';
      s.toggle.textContent = s.view === 'md' ? '原文' : '渲染';
      renderAnswer(id);
    });
  }

  // 按面板当前视图渲染：md → DOMPurify 清洗后的 HTML；src → 原文
  function renderAnswer(id) {
    const s = sessions[MODE].get(id);
    if (!s) return;
    const raw = state.rawAnswers.get(id) || '';
    if (s.view === 'src') {
      s.ans.textContent = raw;
      s.ans.classList.add('src');
    } else {
      s.ans.innerHTML = DOMPurify.sanitize(marked.parse(raw || ''));
      s.ans.classList.remove('src');
    }
  }

  function resetPanel(id, question) {
    const s = sessions[MODE].get(id);
    if (!s) return;
    s.q.textContent = '问：' + question;
    state.rawAnswers.delete(id);
    s.ans.classList.remove('src');
    s.ans.innerHTML = '';
    s.ans.textContent = '正在等待响应…';
    s.ans.classList.add('waiting');
  }

  async function stream(id, hist, signal) {
    let acc = '';
    let timer = null;
    const sess = () => sessions[MODE].get(id);
    const setAns = (t) => { const s = sess(); if (s) s.ans.textContent = t; };
    const render = () => {
      const s = sess();
      if (!s) return;
      if (acc) {
        state.rawAnswers.set(id, acc);
        s.ans.classList.remove('waiting');
        renderAnswer(id);
      }
    };
    try {
      setAns('正在等待响应…');
      await ApiProviders.streamChat({
        provider: state.current,
        model: id,
        messages: hist,
        signal,
        onDelta: (d) => {
          acc += d;
          if (!timer) timer = setTimeout(() => { timer = null; render(); }, 150);
        }
      });
      if (timer) { clearTimeout(timer); timer = null; }
      render();
      if (!acc) { const s = sess(); if (s) { s.ans.classList.remove('waiting'); s.ans.textContent = ''; } }
      hist.push({ role: 'assistant', content: acc });
      setStatus(MODE, id, 'done');
    } catch (e) {
      if (timer) { clearTimeout(timer); timer = null; }
      if (e && e.name === 'AbortError') {
        render();
        if (!acc) setAns('已停止');
        setStatus(MODE, id, 'stopped');
      } else {
        setStatus(MODE, id, 'failed');
        const msg = (e && e.message) ? e.message : String(e);
        const link = e && e.link ? e.link : '';
        const s = sess();
        if (s) {
          s.ans.classList.remove('waiting');
          const errText = acc ? acc + '\n\n[错误] ' + msg : '请求失败: ' + msg;
          s.ans.textContent = '';
          const err = document.createElement('div');
          err.className = 'api-err';
          err.textContent = errText;
          if (link) {
            const a = document.createElement('a');
            a.className = 'api-err-link';
            a.href = link;
            a.target = '_blank';
            a.rel = 'noopener';
            a.textContent = '打开账单页检查';
            err.appendChild(document.createTextNode(' '));
            err.appendChild(a);
          }
          s.ans.appendChild(err);
        }
      }
    } finally {
      state.aborts.delete(id);
    }
  }

  function ask() {
    const q = els.question.value.trim();
    if (!q) return;
    if (!state.current) { updateHints(); flashDropBtn('请先配置供应商', 1800); return; }
    if (!ApiProviders.currentKey(state.current)) { updateHints(); u.keyInput.focus(); flashDropBtn('请先添加 API Key', 1800); return; }
    const ids = state.selected;
    if (!ids.length) { flashDropBtn('请先选择模型', 1800); return; }

    state.lastQuestion = q;

    const existing = sessionIds(MODE);
    const removeIds = existing.filter(id => !ids.includes(id));
    removeIds.forEach(id => {
      removeSession(MODE, id);
      state.history.delete(id);
      state.rawAnswers.delete(id);
      const ac = state.aborts.get(id);
      if (ac) { ac.abort(); state.aborts.delete(id); }
    });

    for (const id of ids) {
      if (!sessions[MODE].has(id)) createPanel(id);
      resetPanel(id, q);
      const m = state.models.find(x => x.id === id);
      const hist = state.history.get(id) || [];
      hist.push({ role: 'user', content: ApiProviders.buildContent(q, []) }); // 附件功能暂屏蔽
      state.history.set(id, hist);
      setStatus(MODE, id, 'loading');
      const ac = new AbortController();
      state.aborts.set(id, ac);
      stream(id, hist, ac.signal);
    }
    els.emptyHint.style.display = 'none';
    if (ids.length) switchModel(MODE, ids[0]);
  }

  async function reask(id) {
    const q = state.lastQuestion;
    if (!q) return;
    const ac = state.aborts.get(id);
    if (ac) ac.abort();
    state.history.delete(id);
    if (!sessions[MODE].has(id)) createPanel(id);
    resetPanel(id, q);
    const m = state.models.find(x => x.id === id);
    const hist = [{ role: 'user', content: ApiProviders.buildContent(q, []) }]; // 附件功能暂屏蔽
    state.history.set(id, hist);
    setStatus(MODE, id, 'loading');
    const a = new AbortController();
    state.aborts.set(id, a);
    stream(id, hist, a.signal);
    els.emptyHint.style.display = 'none';
    switchModel(MODE, id);
  }

  function copyAnswer(id) {
    const text = state.rawAnswers.get(id) || '';
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const r = rowEls[MODE].get(id);
      if (r && r.copy) {
        r.copy.textContent = '\u2713';
        setTimeout(() => { if (r.copy) r.copy.textContent = '\u29c9'; }, 1200);
      }
    }).catch(() => {});
  }

  function stop() {
    for (const [, ac] of state.aborts) ac.abort();
    state.aborts.clear();
  }

  function clear() {
    state.history.clear();
    state.rawAnswers.clear();
    for (const [, ac] of state.aborts) ac.abort();
    state.aborts.clear();
    clearSessions(MODE);
  }

  async function init() {
    state.providers = await ApiProviders.load();
    fillProvSel();
    const { apiProviderId, apiModelIds } = await chrome.storage.local.get(['apiProviderId', 'apiModelIds']);
    let pid = (apiProviderId && state.providers.some(p => p.id === apiProviderId))
      ? apiProviderId
      : (state.providers.some(p => p.id === 'opencode-go')
        ? 'opencode-go'
        : ((state.providers[0] || {}).id));
    if (pid) await selectProvider(pid);
    if (Array.isArray(apiModelIds)) {
      state.selected = apiModelIds.filter(id => state.models.some(m => m.id === id));
    }
    updateSelectionUI();
    renderDrop();
    updateHints();
  }

  return { init, ask, stop, newChat: clear, clear };
})();
