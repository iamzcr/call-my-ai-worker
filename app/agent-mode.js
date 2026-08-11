'use strict';
// Agent 模式模块：让模型读取当前标签页 → 工具调用循环 → 操作浏览器页面。
// 依赖 app.js 核心全局：$ / els / chrome，以及 lib/api-providers.js 的 ApiProviders。
window.AgentMode = (() => {
  const u = {
    modelSel: $('#agentModelSel'),
    loadBtn: $('#agentLoadBtn'),
    noKey: $('#agentNoKey'),
    goOpts: $('#agentGoOpts'),
    status: $('#agentStatus'),
    log: $('#agentLog')
  };

  const state = {
    providers: [],
    provider: null,
    models: [],
    running: false,
    ac: null,
    step: 0,
    lastSnap: null
  };

  const MAX_STEPS = 10;

  const AGENT_TOOLS = [
    { type: 'function', function: { name: 'click', description: '点击页面上编号为 X 的元素', parameters: { type: 'object', properties: { index: { type: 'integer', description: '元素编号' } }, required: ['index'] } } },
    { type: 'function', function: { name: 'type', description: '在编号为 X 的输入框输入文本', parameters: { type: 'object', properties: { index: { type: 'integer' }, text: { type: 'string' } }, required: ['index', 'text'] } } },
    { type: 'function', function: { name: 'press', description: '按键盘键，如 Enter / Tab / Escape / ArrowDown / ArrowUp', parameters: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] } } },
    { type: 'function', function: { name: 'scroll', description: '滚动页面', parameters: { type: 'object', properties: { direction: { type: 'string', enum: ['up', 'down', 'top', 'bottom'] } }, required: ['direction'] } } },
    { type: 'function', function: { name: 'readText', description: '读取编号为 X 的元素的文本', parameters: { type: 'object', properties: { index: { type: 'integer' } }, required: ['index'] } } },
    { type: 'function', function: { name: 'navigate', description: '跳转到新的 URL（谨慎使用）', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } } },
    { type: 'function', function: { name: 'downloadCurrentVideo', description: '下载当前页面上的视频（B站视频播放页）。进入视频播放页（URL 含 /video/）后调用，无需参数。', parameters: { type: 'object', properties: {} } } },
    { type: 'function', function: { name: 'done', description: '任务完成，给出总结', parameters: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'] } } }
  ];

  const SYSTEM_PROMPT =
    '你是浏览器操作助手。根据页面快照中的元素编号，调用工具完成用户目标。规则：' +
    '1) 优先点击有明确文案的元素；2) 输入前可先 click 聚焦；3) 每次执行动作后观察页面反馈再决定下一步；' +
    '4) 在 B站：可用 navigate 打开 https://search.bilibili.com/all?keyword=... 直接搜索；' +
    '进入视频播放页（URL 含 /video/）后调用 downloadCurrentVideo 下载视频；' +
    '5) 完成任务或无法继续时调用 done 并给出总结。请只调用我提供的工具。';

  function esc(s) {
    return String(s == null ? '' : s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function setStatus(text) {
    u.status.textContent = text || '';
  }

  function appendLog(text, cls) {
    const div = document.createElement('div');
    div.className = 'a-line ' + (cls || '');
    div.textContent = text;
    u.log.appendChild(div);
    u.log.scrollTop = u.log.scrollHeight;
  }

  function clearLog() {
    u.log.innerHTML = '';
  }

  function updateKeyHint() {
    const hasKey = !!(state.provider && ApiProviders.currentKey(state.provider));
    u.noKey.classList.toggle('hidden', hasKey);
  }

  function fillModelSel() {
    u.modelSel.innerHTML = '';
    if (!state.models.length) {
      const o = document.createElement('option');
      o.value = '';
      o.textContent = '暂无模型，点击 ↻ 拉取';
      u.modelSel.appendChild(o);
      return;
    }
    for (const m of state.models) {
      const o = document.createElement('option');
      o.value = m.id;
      o.textContent = m.name;
      u.modelSel.appendChild(o);
    }
  }

  async function loadModels(force) {
    if (!state.provider) return;
    const models = await ApiProviders.fetchModels(state.provider, { useCache: !force })
      .catch(() => []);
    state.models = models;
    fillModelSel();
  }

  u.loadBtn.addEventListener('click', () => loadModels(true));
  u.goOpts.addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });

  function throwIfAborted(signal) {
    if (signal && signal.aborted) {
      const err = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    }
  }

  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(t);
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        }, { once: true });
      }
    });
  }

  async function ensureAgentInjected(tabId) {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content/agent.js'] });
  }

  async function snapshotTab(tabId) {
    await ensureAgentInjected(tabId);
    const resp = await chrome.tabs.sendMessage(tabId, { type: 'agent-snapshot' }).catch(() => null);
    if (resp) { state.lastSnap = resp; return resp; }
    await ensureAgentInjected(tabId);
    const resp2 = await chrome.tabs.sendMessage(tabId, { type: 'agent-snapshot' }).catch(() => null);
    if (resp2) state.lastSnap = resp2;
    return resp2;
  }

  function indexSelector(index) {
    const n = Number(index);
    const els = state.lastSnap && state.lastSnap.elements ? state.lastSnap.elements : [];
    const hit = els.find(e => e.i === n);
    if (!hit) return '';
    return hit.selector;
  }

  function snapToText(snap) {
    if (!snap) return '（无法获取页面快照）';
    let s = 'URL: ' + snap.url + '\n标题: ' + snap.title + '\n视口: ' + snap.viewport.w + 'x' + snap.viewport.h + '\n';
    s += '可交互元素:\n';
    for (const el of snap.elements) {
      let line = '[' + el.i + '] <' + el.tag + '>';
      if (el.type) line += ' type=' + el.type;
      if (el.role) line += ' role=' + el.role;
      if (el.name) line += ' name="' + el.name + '"';
      if (el.value) line += ' value="' + el.value + '"';
      if (el.placeholder) line += ' placeholder="' + el.placeholder + '"';
      s += line + '\n';
    }
    if (snap.text) s += '页面文本(节选): ' + snap.text + '\n';
    return s.slice(0, 7000);
  }

  function sanitizeFilename(s) {
    return String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(0, 80) || 'video';
  }

  // 下载当前标签页上的视频（B站：在页面上下文内 fetch 流并 blob 保存，
  // 浏览器自动带上页面 Referer 与 Cookie，避免 chrome.downloads 禁止头限制）
  async function downloadCurrentVideo(tabId) {
    const tabInfo = await chrome.tabs.get(tabId).catch(() => null);
    const pageTitle = tabInfo ? (tabInfo.title || '') : '';
    const title = sanitizeFilename(pageTitle.replace(/[-_]\s*哔哩哔哩.*$/i, ''));

    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      args: [title],
      func: async (baseName) => {
        const jobs = [];
        try {
          const info = window.__playinfo__;
          if (!info || !info.data) return '未找到视频流信息，请确认已在 B站视频播放页（URL 含 /video/）';
          const data = info.data;
          if (Array.isArray(data.durl) && data.durl.length) {
            jobs.push({ url: data.durl[0].url, filename: baseName + '.mp4' });
          } else if (data.dash) {
            const vids = (data.dash.video || []).slice().sort((a, b) => (b.bandwidth || 0) - (a.bandwidth || 0));
            const auds = (data.dash.audio || []).slice().sort((a, b) => (b.bandwidth || 0) - (a.bandwidth || 0));
            if (vids.length) jobs.push({ url: vids[0].baseUrl, filename: baseName + '_video.mp4' });
            if (auds.length) jobs.push({ url: auds[0].baseUrl, filename: baseName + '_audio.m4a' });
          }
        } catch (e) {
          return '读取视频流失败: ' + e.message;
        }
        if (!jobs.length) return '未找到可下载的视频流';
        const started = [];
        for (const j of jobs) {
          try {
            const r = await fetch(j.url);
            if (!r.ok) { started.push(j.filename + ' HTTP ' + r.status); continue; }
            const blob = await r.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = j.filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 60000);
            started.push(j.filename);
          } catch (e) {
            started.push(j.filename + ' 失败: ' + e.message);
          }
        }
        const extra = jobs.length > 1 ? '（DASH 音视频已分开下载，需用工具合并）' : '';
        return '已开始下载: ' + started.join(', ') + extra;
      }
    }).catch(() => []);
    return res && res.result ? res.result : '下载执行失败';
  }

  async function executeTool(tabId, name, args, signal) {
    throwIfAborted(signal);
    if (name === 'navigate') {
      const url = String(args.url || '').trim();
      if (!/^https?:\/\//i.test(url)) return 'URL 无效';
      await chrome.tabs.update(tabId, { url });
      await sleep(2500, signal);
      await ensureAgentInjected(tabId);
      return '已跳转到 ' + url;
    }
    const action = { action: name };
    if (name === 'click' || name === 'readText') {
      action.selector = indexSelector(args.index);
      if (!action.selector) return '元素编号无效';
    } else if (name === 'type') {
      action.selector = indexSelector(args.index);
      if (!action.selector) return '元素编号无效';
      action.text = String(args.text || '');
    } else if (name === 'press') {
      action.key = String(args.key || 'Enter');
    } else if (name === 'scroll') {
      action.direction = String(args.direction || 'down');
    } else if (name === 'evaluate') {
      action.js = String(args.js || '');
    } else if (name === 'downloadCurrentVideo') {
      throwIfAborted(signal);
      return await downloadCurrentVideo(tabId);
    } else {
      return '未知工具 ' + name;
    }
    throwIfAborted(signal);
    const r = await chrome.tabs.sendMessage(tabId, { type: 'agent-exec', action }).catch(() => '内容脚本不可用');
    return String(r);
  }

  async function runLoop(tabId, goal, modelId, signal) {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: '目标: ' + goal + '\n\n请根据页面快照采取行动。' }
    ];
    const snap0 = await snapshotTab(tabId);
    messages.push({ role: 'user', content: '页面初始状态:\n' + snapToText(snap0) });

    for (state.step = 1; state.step <= MAX_STEPS; state.step++) {
      throwIfAborted(signal);
      appendLog('第 ' + state.step + ' 步：模型思考中…', 'a-step');
      const resp = await ApiProviders.chatTools({ provider: state.provider, model: modelId, messages, tools: AGENT_TOOLS, signal });
      if (!resp.tool_calls || !resp.tool_calls.length) {
        appendLog('完成：' + (resp.content || '(无内容)'), 'a-done');
        setStatus('已完成');
        return;
      }
      messages.push({ role: 'assistant', content: resp.content || '', tool_calls: resp.tool_calls });
      for (const tc of resp.tool_calls) {
        if (!tc || !tc.function) continue;
        throwIfAborted(signal);
        const name = tc.function.name;
        let args = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch (e) { args = {}; }
        appendLog('▶ ' + name + ' ' + JSON.stringify(args), 'a-act');
        if (name === 'done') {
          appendLog('完成：' + String(args.summary || args.text || ''), 'a-done');
          setStatus('已完成');
          return;
        }
        const result = await executeTool(tabId, name, args, signal);
        appendLog('  ⇦ ' + String(result).slice(0, 200), 'a-res');
        messages.push({ role: 'tool', tool_call_id: tc.id, content: String(result) });
      }
      throwIfAborted(signal);
      await sleep(800, signal);
      const snap = await snapshotTab(tabId);
      messages.push({ role: 'user', content: '执行上述动作后，页面状态:\n' + snapToText(snap) });
    }
    appendLog('已达最大步数，自动停止。', 'a-err');
    setStatus('已达步数上限');
  }

  // 从 storage 重新读取供应商与 Key（用户在 API 模式/选项页改动后生效），并按需加载模型
  async function refresh() {
    state.providers = await ApiProviders.load();
    const pid = state.provider
      ? state.provider.id
      : (state.providers.some(p => p.id === 'opencode-go') ? 'opencode-go' : (state.providers[0] || {}).id);
    state.provider = state.providers.find(p => p.id === pid) || null;
    if (state.provider && ApiProviders.currentKey(state.provider) && !state.models.length) {
      await loadModels(false);
    }
    updateKeyHint();
  }

  async function start() {
    if (state.running) return;
    await refresh();
    const goal = els.question.value.trim();
    if (!goal) { setStatus('请先输入目标'); return; }
    if (!state.provider || !ApiProviders.currentKey(state.provider)) { updateKeyHint(); setStatus('请先配置 API Key'); return; }
    if (!state.models.length) { setStatus('请先加载模型'); return; }
    const modelId = u.modelSel.value;
    if (!modelId) { setStatus('请选择模型'); return; }

    const wins = await chrome.windows.getAll({ populate: true }).catch(() => []);
    let focusedId = null;
    try { focusedId = (await chrome.windows.getLastFocused()).id; } catch (e) {}
    const candidates = [];
    for (const w of wins) {
      for (const tb of (w.tabs || [])) {
        if (tb.id == null) continue;
        if (!/^https?:/i.test(tb.url || '')) continue;
        candidates.push({
          tab: tb,
          score: (w.id === focusedId ? 2 : 0) + (tb.active ? 1 : 0)
        });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    if (!candidates.length) { setStatus('未找到可操作的网页标签页'); return; }
    const tab = candidates[0].tab;
    const url = tab.url || '';

    state.running = true;
    state.lastSnap = null;
    clearLog();
    appendLog('目标: ' + goal);
    appendLog('模型: ' + modelId);
    appendLog('将操作页面: ' + (tab.title || '') + ' (' + url + ')', 'a-res');
    const ac = new AbortController();
    state.ac = ac;
    setStatus('运行中…');
    try {
      await runLoop(tab.id, goal, modelId, ac.signal);
    } catch (e) {
      if (e && e.name === 'AbortError') {
        appendLog('已停止。', 'a-err');
        setStatus('已停止');
      } else {
        appendLog('失败: ' + (e && e.message ? e.message : e), 'a-err');
        setStatus('失败');
      }
    } finally {
      state.running = false;
      state.ac = null;
    }
  }

  function stop() {
    if (state.ac) {
      try { state.ac.abort(); } catch (e) {}
    }
  }

  function clear() {
    stop();
    state.lastSnap = null;
    clearLog();
    setStatus('');
  }

  async function init() {
    await refresh();
  }

  return { init, start, stop, clear, refresh };
})();
