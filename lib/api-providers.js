'use strict';
// API 供应商纯逻辑模块（无 DOM），供 app 与 options 复用。
// 供应商 = Base URL + 多个 API Key + 可选模型列表地址；兼容任何 OpenAI 风格接口。

const API_PROVIDER_PRESETS = [
  { id: 'opencode', name: 'opencode', baseUrl: 'https://opencode.ai/zen/v1', keys: [], activeKey: '', modelsUrl: '' },
  { id: 'opencode-go', name: 'opencode-go', baseUrl: 'https://opencode.ai/zen/go/v1', keys: [], activeKey: '', modelsUrl: '' },
  { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', keys: [], activeKey: '', modelsUrl: '' }
];

const API_MODELS_CACHE_KEY = 'apiModelsCache';
const API_CACHE_TTL = 3600 * 1000;

function normalizeProvider(p) {
  if (!p || !p.id) return null;
  let keys = Array.isArray(p.keys) ? p.keys.slice() : [];
  if (!keys.length && p.key) keys = [p.key];
  const activeKey = (p.activeKey && keys.indexOf(p.activeKey) !== -1) ? p.activeKey : (keys[0] || '');
  return { id: p.id, name: p.name || p.id, baseUrl: p.baseUrl || '', keys, activeKey, modelsUrl: p.modelsUrl || '' };
}

const ApiProviders = {
  async load() {
    try {
      const { apiProviders } = await chrome.storage.local.get('apiProviders');
      if (apiProviders && Array.isArray(apiProviders) && apiProviders.length) {
        const merged = [...apiProviders];
        for (const preset of API_PROVIDER_PRESETS) {
          if (!merged.some(p => p && p.id === preset.id)) merged.push({ ...preset });
        }
        return merged.map(normalizeProvider).filter(Boolean);
      }
    } catch (e) {}
    const presets = API_PROVIDER_PRESETS.map(normalizeProvider).filter(Boolean);
    try { await chrome.storage.local.set({ apiProviders: presets }); } catch (e) {}
    return presets;
  },

  async save(list) {
    return chrome.storage.local.set({ apiProviders: list.map(normalizeProvider).filter(Boolean) });
  },

  // 当前使用的 Key：activeKey，回退 keys[0]，再回退旧字段 key
  currentKey(p) {
    if (!p) return '';
    if (p.activeKey) return p.activeKey;
    if (Array.isArray(p.keys) && p.keys.length) return p.keys[0];
    return p.key || '';
  },

  maskKey(k) {
    const s = String(k == null ? '' : k);
    if (s.length <= 8) return s;
    return s.slice(0, 4) + '…' + s.slice(-4);
  },

  modelsUrlFor(p) {
    const url = (p.modelsUrl || '').trim();
    if (url) return url;
    return (p.baseUrl || '').replace(/\/+$/, '') + '/models';
  },

  chatUrl(p) {
    return (p.baseUrl || '').replace(/\/+$/, '') + '/chat/completions';
  },

  async getCache(pid) {
    try {
      const { [API_MODELS_CACHE_KEY]: cache } = await chrome.storage.local.get(API_MODELS_CACHE_KEY);
      if (cache && cache[pid]) return cache[pid];
    } catch (e) {}
    return null;
  },

  async putCache(pid, models) {
    try {
      const { [API_MODELS_CACHE_KEY]: cache } = await chrome.storage.local.get(API_MODELS_CACHE_KEY);
      const obj = cache && typeof cache === 'object' ? { ...cache } : {};
      obj[pid] = { ts: Date.now(), models };
      await chrome.storage.local.set({ [API_MODELS_CACHE_KEY]: obj });
    } catch (e) {}
  },

  // 解析响应错误，返回 { kind, message, link }
  classifyError(status, body) {
    let type = '';
    let message = '';
    let link = '';
    if (body) {
      try {
        const j = JSON.parse(body);
        if (j && j.error) {
          type = j.error.type || '';
          message = j.error.message || j.error.code || '';
        }
        if (j && j.meta && j.meta.usage) message = message || '';
      } catch (e) {}
    }
    const blob = (type + ' ' + message).toLowerCase();
    const urlMatch = message.match(/https?:\/\/[^\s"']+/);
    if (urlMatch) link = urlMatch[0];
    if (/credit|balance|insufficient|余额|billing/i.test(blob)) {
      return {
        kind: 'credits',
        message: '该 Key 对应工作区余额不足，请到 ' + (link || '工作区账单页') + ' 检查 Credits 并充值，或切换其他供应商/Key',
        link
      };
    }
    if (status === 401 || /unauthorized|invalid.*api.?key|authentication/i.test(blob)) {
      return { kind: 'auth', message: 'API Key 无效或已失效，请检查后重新填写或切换其他 Key' };
    }
    if (status === 429 || /rate.?limit/i.test(blob)) {
      return { kind: 'rate', message: '请求过于频繁，请稍后再试' };
    }
    if (/model.*(not found|not support|unavailable)|no such model|does not exist/i.test(blob)) {
      return { kind: 'model', message: '该模型当前不可用或需要其他协议：' + (message || type) };
    }
    return { kind: 'other', message: message || ('HTTP ' + status), link };
  },

  // 拉取模型列表；useCache=false 时强制刷新
  async fetchModels(p, { useCache = true } = {}) {
    if (useCache) {
      const cache = await this.getCache(p.id);
      if (cache && Array.isArray(cache.models) && cache.models.length && cache.ts && Date.now() - cache.ts < API_CACHE_TTL) {
        return cache.models.map(m => ({ ...m }));
      }
    }
    const url = this.modelsUrlFor(p);
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + this.currentKey(p) } });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.text()).slice(0, 400); } catch (e) {}
      const c = this.classifyError(res.status, detail);
      const err = new Error(c.message);
      err.kind = c.kind;
      err.link = c.link;
      err.status = res.status;
      throw err;
    }
    const json = await res.json().catch(() => ({}));
    const raw = Array.isArray(json) ? json : (json.data || []);
    const models = raw
      .filter(m => m && m.id)
      .map(m => ({
        id: m.id,
        name: m.name || m.id,
        contextLength: m.context_length || 0,
        inputModalities: (m.architecture && m.architecture.input_modalities) || (m.modalities && m.modalities.input) || [],
        pricing: m.pricing || null
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    await this.putCache(p.id, models);
    return models;
  },

  // 构建 messages content：文本 + 图片 data URI。
  // 仅当模型明确声明 input_modalities 非空且不含 image 时跳过图片；未知/缺失视为支持。
  buildContent(question, attachments, model) {
    if (!attachments || !attachments.length) return question;
    const mods = model && Array.isArray(model.inputModalities) ? model.inputModalities : [];
    const knownNoImage = mods.length > 0 && mods.indexOf('image') === -1;
    if (knownNoImage) return question;
    const parts = [{ type: 'text', text: question }];
    for (const a of attachments) {
      if (a && a.type && a.type.indexOf('image/') === 0 && a.data) {
        parts.push({ type: 'image_url', image_url: { url: 'data:' + a.type + ';base64,' + a.data } });
      }
    }
    return parts;
  },

  // OpenAI 风格流式对话；onDelta(text) 逐段回调，返回 Promise（resolve 即完成）
  async streamChat({ provider, model, messages, signal, onDelta }) {
    const url = this.chatUrl(provider);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.currentKey(provider)
      },
      body: JSON.stringify({ model, messages, stream: true }),
      signal
    });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.text()).slice(0, 400); } catch (e) {}
      const c = this.classifyError(res.status, detail);
      const err = new Error(c.message);
      err.kind = c.kind;
      err.link = c.link;
      err.status = res.status;
      throw err;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        const t = line.trim();
        if (t.indexOf('data:') !== 0) continue;
        const payload = t.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const j = JSON.parse(payload);
          const d = j.choices && j.choices[0] && j.choices[0].delta ? j.choices[0].delta.content : null;
          if (d) onDelta(d);
        } catch (e) {}
      }
    }
  }
};
