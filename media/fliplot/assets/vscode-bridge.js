// SPDX-License-Identifier: MIT
(function () {
  const vscode = acquireVsCodeApi();
  const pending = [];
  const tryLoad = (content, title) => {
    if (typeof window.__fliplotLoadVcd !== 'function') {
      return false;
    }
    try {
      window.__fliplotLoadVcd(content);
      if (title) {
        document.title = `Fliplot - ${title}`;
      }
    } catch (err) {
      console.error('Failed to load VCD content into Fliplot.', err);
    }
    return true;
  };

  const drain = () => {
    if (!pending.length) {
      return;
    }
    if (typeof window.__fliplotLoadVcd !== 'function') {
      setTimeout(drain, 100);
      return;
    }
    while (pending.length) {
      const [content, title] = pending.shift();
      tryLoad(content, title);
    }
  };

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || msg.type !== 'loadVcd') {
      return;
    }
    if (!tryLoad(msg.content, msg.title)) {
      pending.push([msg.content, msg.title]);
      setTimeout(drain, 100);
    }
  });

  vscode.postMessage({ type: 'fliplotReady' });
})();
