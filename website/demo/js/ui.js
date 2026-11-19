/* ============================================================
 * MES 平台 —— 通用 UI（Toast / Modal / 格式化）
 * ============================================================ */
'use strict';

const pad = n => String(n).padStart(2, '0');
function fmtTime(ts) { if (!ts) return '—'; const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fmtDT(ts) { if (!ts) return '—'; const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fmtDate(ts) { if (!ts) return '—'; const d = new Date(ts); return `${d.getMonth() + 1}月${d.getDate()}日`; }
function durText(ms) {
  if (ms == null || isNaN(ms)) return '—';
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return m + ' 分钟';
  return Math.floor(m / 60) + ' 小时 ' + (m % 60) + ' 分';
}
function ticking(ts) { return durText(NOW() - ts); }
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const STATUS_TAG = {
  '未派发': 'tag-gray', '已派工': 'tag-warn', '在制': 'tag-info', '暂停': 'tag-danger', '报工确认': 'tag-ok', '完工': 'tag-ok',
};
const PRI_TAG = { '紧急': 'tag-danger', '高': 'tag-warn', '正常': 'tag-gray', '低': 'tag-gray' };
const statusTag = s => `<span class="tag ${STATUS_TAG[s] || 'tag-gray'}">${esc(s)}</span>`;
const priTag = p => `<span class="tag ${PRI_TAG[p] || 'tag-gray'}">${esc(p)}</span>`;

const UI = {
  toast(msg, type = '', ms = 2400) {
    const w = document.getElementById('toast-wrap');
    const t = document.createElement('div');
    t.className = 'toast ' + type; t.textContent = msg;
    w.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = '.3s'; setTimeout(() => t.remove(), 320); }, ms);
  },
  modal({ title, body, footer, onOpen }) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="mask" onclick="if(event.target===this)UI.closeModal()">
      <div class="modal">
        <div class="modal-h"><span>${title}</span><button class="modal-x" onclick="UI.closeModal()">✕</button></div>
        <div class="modal-b">${body}</div>
        ${footer ? `<div class="modal-f">${footer}</div>` : ''}
      </div></div>`;
    if (onOpen) onOpen();
  },
  confirm({ title = '确认操作', text, okText = '确认', okClass = 'btn-p', onOk }) {
    UI.modal({
      title, body: `<p style="color:#4B5563;line-height:1.7">${text}</p>`,
      footer: `<button class="btn btn-o" onclick="UI.closeModal()">取消</button>
               <button class="btn ${okClass}" id="m-ok">${okText}</button>`,
      onOpen: () => { document.getElementById('m-ok').onclick = () => { UI.closeModal(); onOk && onOk(); }; },
    });
  },
  closeModal() { document.getElementById('modal-root').innerHTML = ''; },
};

/* 计时器集合（Andon 响应计时等） */
const Timers = {
  fns: [],
  add(fn) { this.fns.push(fn); if (this.fns.length === 1) this.loop(); },
  loop() {
    const tick = () => {
      this.fns.forEach(f => { try { f(); } catch (e) { } });
      if (Timers.fns.length) requestAnimationFrame(() => setTimeout(tick, 1000));
      else Timers._stopped = true;
    };
    if (this._stopped || !this._tickRunning) { this._tickRunning = true; this._stopped = false; tick(); }
  },
  clear() { this.fns = []; this._tickRunning = false; },
};
