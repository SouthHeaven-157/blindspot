// Start the official handshake before loading the 3D runtime.
const embedded = window.parent !== window;
const start = document.getElementById('start');
const ready = () => {
  if (!window.WL?.ready) {
    return Promise.reject(new Error('官方接力 SDK 未加载，请刷新重试。'));
  }
  return window.WL.ready();
};

let firstSave = embedded ? ready() : null;
firstSave?.catch(() => {});
if (embedded) start.textContent = '正在接收大厅存档…';

window.OneWriteEntry = {
  ready() {
    const pending = firstSave;
    firstSave = null;
    return pending ?? ready();
  }
};

import('./game.js').catch(error => {
  console.error(error);
  start.disabled = true;
  start.textContent = '游戏资源加载失败';
  const retry = document.createElement('button');
  retry.textContent = '重新加载';
  retry.onclick = () => location.reload();
  start.after(retry);
  document.querySelector('.card .sub').textContent = error.message;
});
