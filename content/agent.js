(() => {
  'use strict';
  if (window.__cmawAgent) return;
  window.__cmawAgent = true;

  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_\-]/g, '\\$&');
  }

  function visible(el) {
    if (!el.getClientRects || !el.getClientRects().length) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 && r.height < 2) return false;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none' || st.opacity === '0') return false;
    return true;
  }

  function selector(el) {
    if (el.id) return '#' + cssEscape(el.id);
    const path = [];
    let n = el;
    for (let guard = 0; n && n.nodeType === 1 && n !== document.documentElement && guard < 12; guard++) {
      let s = n.tagName.toLowerCase();
      if (n.id) { s = '#' + cssEscape(n.id); path.unshift(s); break; }
      const parent = n.parentElement;
      if (parent) {
        const sameTag = Array.prototype.filter.call(parent.children, c => c.tagName === n.tagName);
        if (sameTag.length > 1) s += ':nth-of-type(' + (sameTag.indexOf(n) + 1) + ')';
      }
      path.unshift(s);
      n = parent;
    }
    let sel = path.join(' > ');
    if (!document.querySelector(sel)) {
      try {
        const r = el.getBoundingClientRect();
        sel = 'body *[style*="' + cssEscape(String(r.left.toFixed(0))) + '"]';
      } catch (e) {}
    }
    return sel;
  }

  function elText(el) {
    return (el.innerText || el.getAttribute('aria-label') || el.title || el.placeholder || '')
      .replace(/\s+/g, ' ').trim().slice(0, 60);
  }

  function snapshot() {
    const nodes = document.querySelectorAll(
      'a, button, input, textarea, select, [role="button"], [role="link"], [tabindex], video, [contenteditable="true"]'
    );
    const elements = [];
    let i = 0;
    for (const el of nodes) {
      if (elements.length >= 100) break;
      if (!visible(el)) continue;
      const name = elText(el) || (el.tagName === 'INPUT' && el.type === 'submit' ? (el.value || '') : '');
      if (!name && !el.getAttribute('aria-label') && !el.title && el.tagName !== 'VIDEO') continue;
      elements.push({
        i: ++i,
        tag: el.tagName.toLowerCase(),
        type: el.type || '',
        role: el.getAttribute('role') || '',
        name: name,
        value: el.value !== undefined ? String(el.value).slice(0, 60) : '',
        placeholder: el.placeholder || '',
        selector: selector(el)
      });
    }
    const bodyText = (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 1200);
    return {
      url: location.href,
      title: document.title,
      viewport: { w: innerWidth, h: innerHeight },
      scrollY: window.scrollY,
      elements,
      text: bodyText
    };
  }

  function safeEval(js) {
    try {
      const fn = new Function(js);
      const r = fn();
      return String(r);
    } catch (e) {
      return 'JS 执行失败: ' + e.message;
    }
  }

  function exec(a) {
    if (!a) return '参数缺失';
    try {
      if (a.action === 'click') {
        const el = document.querySelector(a.selector);
        if (!el) return '未找到元素';
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        el.click();
        return '已点击';
      }
      if (a.action === 'type') {
        const el = document.querySelector(a.selector);
        if (!el) return '未找到元素';
        el.focus();
        const text = String(a.text || '');
        if (el.isContentEditable) {
          el.textContent = text;
          el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
        } else {
          el.value = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return '已输入';
      }
      if (a.action === 'press') {
        const key = String(a.key || 'Enter');
        const t = document.activeElement || document.body;
        t.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
        t.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
        return '已按键 ' + key;
      }
      if (a.action === 'scroll') {
        if (a.direction === 'top') window.scrollTo(0, 0);
        else if (a.direction === 'bottom') window.scrollTo(0, document.body.scrollHeight);
        else if (a.direction === 'up') window.scrollBy(0, -Math.round(innerHeight * 0.8));
        else window.scrollBy(0, Math.round(innerHeight * 0.8));
        return '已滚动';
      }
      if (a.action === 'readText') {
        const el = document.querySelector(a.selector);
        if (!el) return '未找到元素';
        const t = (el.innerText || el.value || '').trim().slice(0, 600);
        return t || '(空)';
      }
      if (a.action === 'evaluate') {
        return safeEval(String(a.js || ''));
      }
      return '未知动作 ' + a.action;
    } catch (e) {
      return '执行异常: ' + e.message;
    }
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'agent-snapshot') {
      sendResponse(snapshot());
      return false;
    }
    if (msg && msg.type === 'agent-exec') {
      sendResponse(exec(msg.action));
      return false;
    }
    return false;
  });
})();
