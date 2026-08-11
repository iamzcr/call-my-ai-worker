'use strict';
const $ = (s) => document.querySelector(s);
const list = $('#list');
let providers = [];
let testSeq = 0;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toast(msg, ok) {
  const t = $('#toast');
  t.textContent = msg;
  t.style.background = ok ? '#0f2e22' : '#111418';
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

function card(p, idx) {
  const div = document.createElement('div');
  div.className = 'card';
  div.innerHTML = `
    <div class="row"><label>名称 <input data-f="name" value="${esc(p.name)}"></label></div>
    <div class="row"><label>URL <input data-f="url" value="${esc(p.url)}" placeholder="https://"></label></div>
    <div class="row"><label>输入框选择器 <input data-f="inputSelector" value="${esc(p.inputSelector || '')}" placeholder="textarea, [contenteditable=true]"></label></div>
    <div class="row inline">
      <label>提交方式
        <select data-f="sendBy">
          <option value="enter" ${p.sendBy === 'button' ? '' : 'selected'}>回车 Enter</option>
          <option value="button" ${p.sendBy === 'button' ? 'selected' : ''}>点击按钮</option>
        </select>
      </label>
      <label>发送按钮选择器 <input data-f="sendButtonSelector" value="${esc(p.sendButtonSelector || '')}" placeholder="仅按钮模式"></label>
    </div>
    <div class="row"><label>停止按钮选择器 <input data-f="stopSelector" value="${esc(p.stopSelector || '')}" placeholder="生成时出现、消失即完成"></label></div>
    <div class="row"><label>附件输入框选择器 <input data-f="fileInputSelector" value="${esc(p.fileInputSelector || '')}" placeholder="如 input[type=file]，留空自动探测"></label></div>
    <div class="row"><label>附件按钮选择器 <input data-f="attachButtonSelector" value="${esc(p.attachButtonSelector || '')}" placeholder="点开后创建文件输入框的按钮（可选）"></label></div>
    <div class="row"><label>重新生成选择器 <input data-f="regenerateSelector" value="${esc(p.regenerateSelector || '')}" placeholder="出现即完成（可选）"></label></div>
    <div class="row"><label>答案选择器 <input data-f="answerSelector" value="${esc(p.answerSelector || '')}" placeholder="看板模式抓取答案的容器，如 .ds-markdown"></label></div>
    <div class="row"><label>备注 <input data-f="note" value="${esc(p.note || '')}"></label></div>
    <div class="card-actions">
      <button class="test" data-test>测试选择器</button>
      <button class="del" data-del>删除</button>
    </div>`;
  div.addEventListener('change', (e) => {
    const f = e.target.dataset.f;
    if (f) providers[idx][f] = e.target.value;
  });
  div.querySelector('[data-test]').addEventListener('click', () => testProvider(providers[idx]));
  div.querySelector('[data-del]').addEventListener('click', () => {
    providers.splice(idx, 1);
    render();
  });
  return div;
}

function render() {
  list.innerHTML = '';
  providers.forEach((p, i) => list.appendChild(card(p, i)));
}

function testProvider(p) {
  if (!p.url) { toast('请先填写 URL'); return; }
  const seq = ++testSeq;
  chrome.runtime.sendMessage({ type: 'test', provider: { ...p } }, (resp) => {
    if (chrome.runtime.lastError) return;
    if (seq !== testSeq) return;
    if (resp && resp.ok) toast('已打开测试窗口，请查看高亮区域');
    else toast('测试失败: ' + (resp && resp.error ? resp.error : '无法打开'));
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'test-result') {
    if (msg.ok) toast('找到输入框: ' + msg.found, true);
    else toast('未找到输入框，请调整选择器');
  }
});

function add() {
  providers.push({
    id: 'custom-' + Date.now(),
    name: '新站点',
    url: '',
    inputSelector: 'textarea, [contenteditable="true"]',
    sendBy: 'enter',
    sendButtonSelector: '',
    fileInputSelector: '',
    attachButtonSelector: '',
    stopSelector: '',
    regenerateSelector: '',
    answerSelector: '',
    note: ''
  });
  render();
}

async function save() {
  await saveProviders(providers);
  if (window.ApiOptions) await window.ApiOptions.persist();
  toast('已保存', true);
}

$('#addBtn').addEventListener('click', add);
$('#saveBtn').addEventListener('click', save);

$('#exportBtn').addEventListener('click', () => {
  $('#ioText').value = JSON.stringify(providers, null, 2);
  $('#ioBox').classList.remove('hidden');
  $('#ioApply').textContent = '复制到剪贴板';
  $('#ioApply').dataset.mode = 'copy';
});
$('#importBtn').addEventListener('click', () => {
  $('#ioText').value = '';
  $('#ioBox').classList.remove('hidden');
  $('#ioApply').textContent = '应用导入';
  $('#ioApply').dataset.mode = 'import';
});
$('#ioCancel').addEventListener('click', () => $('#ioBox').classList.add('hidden'));
$('#ioApply').addEventListener('click', () => {
  const mode2 = $('#ioApply').dataset.mode;
  if (mode2 === 'copy') {
    navigator.clipboard.writeText($('#ioText').value).then(() => toast('已复制', true));
  } else {
    try {
      const arr = JSON.parse($('#ioText').value);
      if (!Array.isArray(arr)) throw new Error('not-array');
      providers = arr;
      render();
      save();
    } catch (e) {
      toast('JSON 解析失败');
    }
  }
  $('#ioBox').classList.add('hidden');
});

async function init() {
  providers = await loadProviders();
  render();
}

init();
