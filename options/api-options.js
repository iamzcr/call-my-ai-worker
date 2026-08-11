'use strict';
// API 供应商配置模块（选项页）：复用 options.js 中的 esc / toast 全局函数。
window.ApiOptions = (() => {
  const apiList = document.getElementById('apiList');
  let providers = [];

  function renderKeys(container, p) {
    container.innerHTML = '';
    const keys = p.keys || [];
    if (!keys.length) {
      const empty = document.createElement('span');
      empty.className = 'key-empty';
      empty.textContent = '尚无 Key';
      container.appendChild(empty);
      return;
    }
    keys.forEach((k, i) => {
      const chip = document.createElement('span');
      chip.className = 'key-chip' + (p.activeKey === k ? ' active' : '');
      chip.title = k;
      const label = document.createElement('span');
      label.className = 'key-chip-label';
      label.textContent = ApiProviders.maskKey(k);
      const x = document.createElement('button');
      x.className = 'key-chip-x';
      x.textContent = '\u00d7';
      x.title = '删除该 Key';
      x.addEventListener('click', () => {
        p.keys.splice(i, 1);
        if (p.activeKey === k) p.activeKey = p.keys[0] || '';
        render();
      });
      chip.append(label, x);
      container.appendChild(chip);
    });
  }

  function apiCard(p, idx) {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div class="row"><label>名称 <input data-f="name" value="${esc(p.name)}"></label></div>
      <div class="row"><label>Base URL <input data-f="baseUrl" value="${esc(p.baseUrl || '')}" placeholder="https://.../v1"></label></div>
      <div class="row"><label>添加 API Key <span class="key-wrap"><input type="password" class="key-new" placeholder="粘贴新 Key" autocomplete="off"><button class="key-eye" data-eye title="显示/隐藏">&#128065;</button><button data-key-add>添加</button></span></label></div>
      <div class="row"><label>已存 Key <span class="key-list" data-keylist></span></label></div>
      <div class="row"><label>模型列表地址（可选）<input data-f="modelsUrl" value="${esc(p.modelsUrl || '')}" placeholder="留空自动 {baseUrl}/models"></label></div>
      <div class="card-actions">
        <button data-test>测试连接</button>
        <button class="del" data-del>删除</button>
      </div>`;

    div.addEventListener('change', (e) => {
      const f = e.target.dataset.f;
      if (f) providers[idx][f] = e.target.value;
    });

    div.querySelector('[data-eye]').addEventListener('click', (e) => {
      const wrap = e.currentTarget.closest('.key-wrap');
      const input = wrap.querySelector('.key-new');
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    div.querySelector('[data-key-add]').addEventListener('click', (e) => {
      const wrap = e.currentTarget.closest('.key-wrap');
      const input = wrap.querySelector('.key-new');
      const k = input.value.trim();
      if (!k) { toast('请先粘贴 Key'); return; }
      const p = providers[idx];
      if (p.keys.indexOf(k) === -1) p.keys.push(k);
      p.activeKey = k;
      input.value = '';
      render();
    });

    div.querySelector('[data-test]').addEventListener('click', () => testProvider(providers[idx]));
    div.querySelector('[data-del]').addEventListener('click', () => {
      providers.splice(idx, 1);
      render();
    });

    renderKeys(div.querySelector('[data-keylist]'), p);
    return div;
  }

  function render() {
    apiList.innerHTML = '';
    providers.forEach((p, i) => apiList.appendChild(apiCard(p, i)));
  }

  async function testProvider(p) {
    if (!p.baseUrl) { toast('请先填写 Base URL'); return; }
    try {
      const models = await ApiProviders.fetchModels(p, { useCache: false });
      toast('拉取成功，共 ' + models.length + ' 个模型', true);
    } catch (e) {
      toast('失败: ' + (e && e.message ? e.message : e));
    }
  }

  document.getElementById('addApiBtn').addEventListener('click', () => {
    providers.push({ id: 'api-' + Date.now(), name: '新供应商', baseUrl: '', keys: [], activeKey: '', modelsUrl: '' });
    render();
  });

  async function persist() {
    return ApiProviders.save(providers);
  }

  async function init() {
    providers = await ApiProviders.load();
    render();
  }

  init();
  return { persist, get providers() { return providers; } };
})();
