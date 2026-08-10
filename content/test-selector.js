(() => {
  'use strict';
  const lib = window.__allAiAskLib;
  if (!lib) return;
  const SEND = (m) => { try { chrome.runtime.sendMessage(m, () => { void chrome.runtime.lastError; }); } catch (e) {} };

  chrome.storage.session.get('pendingTest').then(({ pendingTest }) => {
    if (!pendingTest) return;
    chrome.storage.session.remove('pendingTest').catch(() => {});
    lib.waitForInput(pendingTest, 25000).then((input) => {
      if (!input) {
        SEND({ type: 'test-result', ok: false, found: null });
        return;
      }
      input.style.outline = '4px solid #ff3b30';
      input.style.outlineOffset = '2px';
      input.scrollIntoView({ block: 'center' });
      input.focus();
      SEND({
        type: 'test-result',
        ok: true,
        found: input.tagName + (input.className ? '.' + String(input.className).slice(0, 40) : '')
      });
    });
  });
})();
