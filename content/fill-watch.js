(() => {
  'use strict';
  if (window.__allAiAskFilled) return;
  window.__allAiAskFilled = true;
  const lib = window.__allAiAskLib;
  if (!lib) return;
  const SEND = (m) => { try { chrome.runtime.sendMessage(m, () => { void chrome.runtime.lastError; }); } catch (e) {} };

  let askSeq = 0;
  let heartbeat = null;
  let streamTimer = null;
  let currentProvider = null;

  function clearAskTimers() {
    if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
    if (streamTimer) { clearInterval(streamTimer); streamTimer = null; }
  }

  async function doAsk(provider, question, attachments) {
    if (!provider || !question) return;
    currentProvider = provider;
    askSeq++;
    const seq = askSeq;
    clearAskTimers();
    heartbeat = setInterval(() => SEND({ type: 'heartbeat' }), 15000);

    try {
      const input = await lib.waitForInput(provider, 25000);
      if (seq !== askSeq) return;
      if (!input) {
        SEND({ type: 'fill-status', status: 'input-not-found' });
        return;
      }
      if (attachments && attachments.length) {
        const ok = lib.attachFiles(attachments, input, provider);
        lib.debugDump && lib.debugDump('attach', provider, input, String(ok));
        try {
          console.log('[all-ai-ask] attachConfig', {
            provider: provider && provider.id,
            url: provider && provider.url,
            fileInputSelector: provider && provider.fileInputSelector,
            attachButtonSelector: provider && provider.attachButtonSelector,
            composerTag: input && input.tagName,
            composerClass: input && (typeof input.className === 'string' ? input.className.slice(0, 120) : '')
          });
        } catch (e) {}
        await new Promise(r => setTimeout(r, 800));
        if (seq !== askSeq) return;
      }
      let filled = true;
      if (input.isContentEditable) {
        filled = await lib.fillEditable(input, question, provider);
      } else {
        lib.fillText(input, question);
        await new Promise(r => setTimeout(r, 400));
        if (seq !== askSeq) return;
        filled = (lib.inputValue(input) || '').indexOf(question) !== -1;
      }
      if (seq !== askSeq) return;
      lib.debugDump && lib.debugDump('filled', provider, input, lib.inputValue(input));
      if (!filled) {
        SEND({ type: 'fill-status', status: 'fill-failed' });
        return;
      }
      await new Promise(r => setTimeout(r, 400));
      if (seq !== askSeq) return;
      const entered = lib.submit(input, provider);
      await new Promise(r => setTimeout(r, 700));
      if (seq !== askSeq) return;
      const still = lib.inputValue(input);
      const sent = !still || still.indexOf(question) === -1;
      lib.debugDump && lib.debugDump('submitted', provider, input, still);
      if (!entered && !sent) {
        lib.clickSendButton(provider);
      }
      SEND({ type: 'fill-status', status: 'submitted' });

      let lastText = '';
      streamTimer = setInterval(() => {
        const text = lib.extractAnswer(provider);
        if (text && text !== lastText) {
          lastText = text;
          SEND({ type: 'answer-update', text });
        }
      }, 1500);

      await lib.watchDone(provider, 240000);
      if (seq !== askSeq) return;
      const final = lib.extractAnswer(provider) || lastText;
      SEND({ type: 'answer-done', text: final });
    } catch (e) {
      if (seq === askSeq) SEND({ type: 'error', message: 'fill-failed' });
    } finally {
      if (seq === askSeq) clearAskTimers();
    }
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'ask-question') {
      doAsk(msg.provider, msg.question, msg.attachments);
      sendResponse({ ok: true });
    } else if (msg && msg.type === 'stop-answer') {
      askSeq++;
      clearAskTimers();
      lib.clickStopButton(currentProvider);
      SEND({ type: 'fill-status', status: 'stopped' });
      sendResponse({ ok: true });
    }
  });

  chrome.runtime.sendMessage({ type: 'content-ready' }, (resp) => {
    if (chrome.runtime.lastError) return;
    if (resp && resp.provider) doAsk(resp.provider, resp.question, resp.attachments);
  });
})();
