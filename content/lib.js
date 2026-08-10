(() => {
  'use strict';
  if (window.__allAiAskLib) return;

  const lib = {
    isVisible(el) {
      if (!el || !el.getBoundingClientRect) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      if (el.disabled || el.readOnly) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 4 && r.height < 4) return false;
      return true;
    },

    findBestInput(provider) {
      if (provider && provider.inputSelector) {
        try {
          const nodes = document.querySelectorAll(provider.inputSelector);
          for (const el of nodes) if (lib.isVisible(el)) return el;
        } catch (e) {}
      }
      const all = document.querySelectorAll(
        'textarea, input[type="text"], input:not([type]), [contenteditable="true"], [contenteditable=""]'
      );
      for (const el of all) {
        if (lib.isVisible(el)) {
          const r = el.getBoundingClientRect();
          if (r.width > 120 && r.height > 30) return el;
        }
      }
      for (const el of all) if (lib.isVisible(el)) return el;
      return null;
    },

    extractAnswer(provider) {
      let node = null;
      if (provider && provider.answerSelector) {
        try {
          const nodes = document.querySelectorAll(provider.answerSelector);
          for (const el of nodes) if (lib.isVisible(el)) node = el;
        } catch (e) {}
      }
      if (!node) {
        const all = document.querySelectorAll('[class*="markdown"], [class*="answer"], [class*="response"], [class*="message"]');
        for (const el of all) {
          if (lib.isVisible(el)) {
            const r = el.getBoundingClientRect();
            if (r.height > 40 && r.width > 200) { node = el; break; }
          }
        }
      }
      if (!node) return '';
      return node.innerText || node.textContent || '';
    },

    waitForInput(provider, timeoutMs) {
      return new Promise((resolve) => {
        const start = Date.now();
        const poll = () => {
          const el = lib.findBestInput(provider);
          if (el) return resolve(el);
          if (Date.now() - start > (timeoutMs || 20000)) return resolve(null);
          setTimeout(poll, 500);
        };
        poll();
      });
    },

    focusInput(el) {
      try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) {} }
      if (document.activeElement !== el) {
        try { el.focus(); } catch (e) {}
      }
    },

    fillText(el, text) {
      let proto = null;
      if (el.tagName === 'TEXTAREA') proto = HTMLTextAreaElement.prototype;
      else if (el.tagName === 'INPUT') proto = HTMLInputElement.prototype;
      if (proto) {
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, text);
      } else {
        el.value = text;
      }
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },

    async fillEditable(el, text, provider) {
      lib.pasteText(el, text);
      await new Promise(r => setTimeout(r, 500));
      const ready = lib.sendReady(provider);
      const hasText = (lib.inputValue(el) || '').indexOf(text) !== -1;
      if (ready === true || (ready === null && hasText)) return true;
      return false;
    },

    pasteText(el, text) {
      lib.focusInput(el);
      try {
        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
        el.dispatchEvent(ev);
        return true;
      } catch (e) { return false; }
    },

    submit(el, provider) {
      lib.focusInput(el);
      if (provider && provider.sendBy === 'button' && provider.sendButtonSelector) {
        try {
          const btn = document.querySelector(provider.sendButtonSelector);
          if (btn && !btn.disabled) { lib.realClick(btn); return true; }
        } catch (e) {}
      }
      const opts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
      el.dispatchEvent(new KeyboardEvent('keydown', opts));
      el.dispatchEvent(new KeyboardEvent('keypress', opts));
      el.dispatchEvent(new KeyboardEvent('keyup', opts));
      return false;
    },

    realClick(el) {
      try {
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      } catch (e) {}
      el.click();
    },

    sendButtonCandidates(provider) {
      let selectors = [];
      if (provider && provider.sendButtonSelector) selectors.push(provider.sendButtonSelector);
      selectors = selectors.concat([
        'button[aria-label*="发送" i]',
        'button[aria-label*="send" i]',
        'button[title*="发送" i]',
        'button[data-testid*="send" i]',
        'button[class*="send" i]'
      ]);
      const seen = new Set();
      const out = [];
      for (const sel of selectors) {
        try {
          const nodes = document.querySelectorAll(sel);
          for (const el of nodes) {
            if (seen.has(el)) continue;
            seen.add(el);
            out.push(el);
          }
        } catch (e) {}
      }
      return out;
    },

    sendReady(provider) {
      const btns = lib.sendButtonCandidates(provider);
      if (!btns.length) return null;
      let anyVisible = false;
      for (const b of btns) {
        const cs = getComputedStyle(b);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = b.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        anyVisible = true;
        const disabled = b.disabled || b.getAttribute('aria-disabled') === 'true';
        if (!disabled) return true;
      }
      return anyVisible ? false : null;
    },

    clickSendButton(provider) {
      for (const b of lib.sendButtonCandidates(provider)) {
        if (b.disabled || b.getAttribute('aria-disabled') === 'true') continue;
        const cs = getComputedStyle(b);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = b.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        lib.realClick(b);
        return true;
      }
      return false;
    },

    inputValue(el) {
      if (!el) return '';
      if (el.isContentEditable) return el.innerText || el.textContent || '';
      return el.value || '';
    },

    clickStopButton(provider) {
      if (!provider || !provider.stopSelector) return false;
      try {
        const btn = document.querySelector(provider.stopSelector);
        if (btn && lib.isVisible(btn)) { lib.realClick(btn); return true; }
      } catch (e) {}
      return false;
    },

    base64ToBlob(b64, type) {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Blob([bytes], { type: type || 'application/octet-stream' });
    },

    attachFiles(attachments, composerEl, provider) {
      if (!attachments || !attachments.length) return false;
      try {
        const files = attachments.map(a => new File([lib.base64ToBlob(a.data, a.type)], a.name, { type: a.type || 'application/octet-stream' }));
        const dt = new DataTransfer();
        files.forEach(f => dt.items.add(f));
        const targets = new Set();

        const fileInputs = [];
        if (provider && provider.fileInputSelector) {
          try { document.querySelectorAll(provider.fileInputSelector).forEach(el => fileInputs.push(el)); } catch (e) {}
        }
        try { document.querySelectorAll('input[type="file"]').forEach(el => fileInputs.push(el)); } catch (e) {}
        fileInputs.forEach(el => {
          if (el.multiple || !el.multiple) targets.add(el);
        });
        if (composerEl) targets.add(composerEl);

        let done = false;
        for (const t of targets) {
          if (t.tagName === 'INPUT' && t.type === 'file') {
            try {
              t.files = dt.files;
              t.dispatchEvent(new Event('change', { bubbles: true }));
              t.dispatchEvent(new Event('input', { bubbles: true }));
              done = true;
            } catch (e) {}
          }
        }
        for (const t of targets) {
          try {
            const ev = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true });
            t.dispatchEvent(ev);
            done = true;
          } catch (e) {}
        }
        if (provider && provider.attachButtonSelector) {
          try {
            const btn = document.querySelector(provider.attachButtonSelector);
            if (btn) lib.realClick(btn);
          } catch (e) {}
        }
        return done;
      } catch (e) { return false; }
    },

    debugDump(stage, provider, input, current) {
      try {
        const info = {
          stage,
          provider: provider && provider.id,
          inputTag: input && input.tagName,
          inputClass: input && (typeof input.className === 'string' ? input.className : ''),
          contentEditable: input ? input.isContentEditable : false,
          value: (current || '').slice(0, 80)
        };
        const btns = [];
        try {
          lib.sendButtonCandidates(provider).forEach(b => {
            const cs = getComputedStyle(b);
            const r = b.getBoundingClientRect();
            btns.push({
              tag: b.tagName,
              cls: typeof b.className === 'string' ? b.className.slice(0, 60) : '',
              disabled: b.disabled,
              ariaDisabled: b.getAttribute('aria-disabled'),
              visible: !(cs.display === 'none' || cs.visibility === 'hidden') && r.width > 0 && r.height > 0
            });
          });
        } catch (e) {}
        console.log('[all-ai-ask]', info, 'sendBtns:', btns);
      } catch (e) {}
    },

    watchDone(provider, timeoutMs) {
      return new Promise((resolve) => {
        const stopSel = provider.stopSelector;
        const regenSel = provider.regenerateSelector;
        const start = Date.now();
        let generating = false;
        let stableText = '';
        let stableCount = 0;
        const timer = setInterval(() => {
          if (regenSel) {
            try {
              if (document.querySelector(regenSel)) { clearInterval(timer); resolve(); return; }
            } catch (e) {}
          }
          if (stopSel) {
            try {
              const found = !!document.querySelector(stopSel);
              if (found) generating = true;
              if (generating && !found) { clearInterval(timer); resolve(); return; }
            } catch (e) {}
          }
          const text = lib.extractAnswer(provider) || '';
          if (text && text === stableText) {
            stableCount++;
            if (stableCount >= 4 && Date.now() - start > 8000) { clearInterval(timer); resolve(); return; }
          } else {
            stableText = text;
            stableCount = 0;
          }
          if (Date.now() - start > (timeoutMs || 240000)) { clearInterval(timer); resolve(); }
        }, 1500);
      });
    }
  };

  window.__allAiAskLib = lib;
})();
