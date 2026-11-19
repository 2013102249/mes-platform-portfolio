/* ============================================================
 * MES 平台 —— 轻量 SVG 图表（折线 / 柱状 / 环形 / 帕累托）
 * ============================================================ */
'use strict';

const Charts = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (t, attrs) => { const n = document.createElementNS(NS, t); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  function svgRoot(w, h) {
    const s = el('svg', { viewBox: `0 0 ${w} ${h}`, width: '100%', height: h, preserveAspectRatio: 'none', style: 'display:block;overflow:visible' });
    return s;
  }

  /* ---------- 折线 / 面积图 ----------
     opts: {height, max, unit, area, dashed:[idx], grid:4} */
  function line(container, labels, series, opts = {}) {
    const W = 600, H = opts.height || 200, P = { l: 34, r: 10, t: 12, b: 22 };
    const max = opts.max || Math.max(...series.flatMap(s => s.data), 1) * 1.15;
    const svg = svgRoot(W, H);
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const gx = i => P.l + (labels.length <= 1 ? iw / 2 : iw * i / (labels.length - 1));
    const gy = v => P.t + ih - (v / max) * ih;
    const gN = opts.grid || 4;
    for (let i = 0; i <= gN; i++) {
      const v = max * i / gN, y = gy(v);
      svg.appendChild(el('line', { x1: P.l, y1: y, x2: W - P.r, y2: y, stroke: '#E8EAF1', 'stroke-width': 1 }));
      const t = el('text', { x: P.l - 6, y: y + 3, 'text-anchor': 'end', 'font-size': 9, fill: '#9CA3AF' });
      t.textContent = Math.round(v); svg.appendChild(t);
    }
    labels.forEach((lb, i) => {
      if (labels.length > 14 && i % 2) return;
      const t = el('text', { x: gx(i), y: H - 6, 'text-anchor': 'middle', 'font-size': 9, fill: '#9CA3AF' });
      t.textContent = lb; svg.appendChild(t);
    });
    series.forEach((s, si) => {
      const pts = s.data.map((v, i) => `${gx(i)},${gy(v)}`).join(' ');
      if (opts.area && si === 0) {
        svg.appendChild(el('polygon', { points: `${P.l},${gy(0)} ${pts} ${gx(s.data.length - 1)},${gy(0)}`, fill: s.color + '22' }));
      }
      svg.appendChild(el('polyline', { points: pts, fill: 'none', stroke: s.color, 'stroke-width': 2.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-dasharray': s.dash ? '5,4' : 'none' }));
      s.data.forEach((v, i) => {
        svg.appendChild(el('circle', { cx: gx(i), cy: gy(v), r: 2.8, fill: '#fff', stroke: s.color, 'stroke-width': 2 }));
      });
    });
    container.innerHTML = ''; container.appendChild(svg);
    if (series.length > 1 || opts.legend) {
      const lg = document.createElement('div');
      lg.className = 'flex wrap'; lg.style.cssText = 'gap:14px;font-size:.72rem;color:#6B7280;margin-top:6px;justify-content:center';
      lg.innerHTML = series.map(s => `<span class="flex" style="gap:5px"><i style="width:10px;height:10px;border-radius:3px;background:${s.color};display:inline-block"></i>${esc(s.name)}</span>`).join('');
      container.appendChild(lg);
    }
  }

  /* ---------- 柱状图 ---------- */
  function bars(container, labels, data, opts = {}) {
    const W = 600, H = opts.height || 200, P = { l: 34, r: 10, t: 12, b: 24 };
    const max = opts.max || Math.max(...data, 1) * 1.15;
    const svg = svgRoot(W, H);
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const bw = iw / labels.length * 0.55;
    for (let i = 0; i <= 4; i++) {
      const v = max * i / 4, y = P.t + ih - (v / max) * ih;
      svg.appendChild(el('line', { x1: P.l, y1: y, x2: W - P.r, y2: y, stroke: '#E8EAF1', 'stroke-width': 1 }));
      const t = el('text', { x: P.l - 6, y: y + 3, 'text-anchor': 'end', 'font-size': 9, fill: '#9CA3AF' });
      t.textContent = Math.round(v); svg.appendChild(t);
    }
    data.forEach((v, i) => {
      const x = P.l + iw * (i + 0.5) / labels.length - bw / 2;
      const y = P.t + ih - (v / max) * ih;
      const c = Array.isArray(opts.colors) ? opts.colors[i % opts.colors.length] : (opts.color || '#7C3AED');
      const r = el('rect', { x, y, width: bw, height: Math.max(1, P.t + ih - y), rx: 3.5, fill: c });
      r.style.cursor = 'pointer';
      svg.appendChild(r);
      const tv = el('text', { x: x + bw / 2, y: y - 4, 'text-anchor': 'middle', 'font-size': 9.5, fill: '#4B5563', 'font-weight': 700 });
      tv.textContent = opts.fmt ? opts.fmt(v) : v; svg.appendChild(tv);
      const tl = el('text', { x: x + bw / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': 9, fill: '#9CA3AF' });
      tl.textContent = labels[i]; svg.appendChild(tl);
    });
    container.innerHTML = ''; container.appendChild(svg);
  }

  /* ---------- 帕累托（柱 + 累计线） ---------- */
  function pareto(container, items, opts = {}) {
    const labels = items.map(i => i.name), data = items.map(i => i.value);
    const total = data.reduce((a, b) => a + b, 0) || 1;
    let acc = 0; const cum = data.map(v => (acc += v) / total * 100);
    const W = 600, H = opts.height || 210, P = { l: 34, r: 34, t: 14, b: 26 };
    const max = Math.max(...data) * 1.15;
    const svg = svgRoot(W, H);
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const bw = iw / labels.length * 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = P.t + ih - ih * i / 4;
      svg.appendChild(el('line', { x1: P.l, y1: y, x2: W - P.r, y2: y, stroke: '#E8EAF1' }));
      const t = el('text', { x: P.l - 6, y: y + 3, 'text-anchor': 'end', 'font-size': 9, fill: '#9CA3AF' });
      t.textContent = Math.round(max * i / 4); svg.appendChild(t);
      const t2 = el('text', { x: W - P.r + 6, y: y + 3, 'font-size': 9, fill: '#B7A6E8' });
      t2.textContent = (100 - i * 25) + '%'; svg.appendChild(t2);
    }
    data.forEach((v, i) => {
      const x = P.l + iw * (i + 0.5) / labels.length - bw / 2;
      const y = P.t + ih - (v / max) * ih;
      svg.appendChild(el('rect', { x, y, width: bw, height: Math.max(1, P.t + ih - y), rx: 3, fill: i === 0 ? '#EF4444' : '#A78BFA' }));
      const tv = el('text', { x: x + bw / 2, y: y - 4, 'text-anchor': 'middle', 'font-size': 9.5, fill: '#4B5563', 'font-weight': 700 });
      tv.textContent = v; svg.appendChild(tv);
      const tl = el('text', { x: x + bw / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': 9, fill: '#9CA3AF' });
      tl.textContent = labels[i]; svg.appendChild(tl);
    });
    const pts = cum.map((v, i) => `${P.l + iw * (i + 0.5) / labels.length},${P.t + ih - v / 100 * ih}`).join(' ');
    svg.appendChild(el('polyline', { points: pts, fill: 'none', stroke: '#F59E0B', 'stroke-width': 2 }));
    cum.forEach((v, i) => svg.appendChild(el('circle', { cx: P.l + iw * (i + 0.5) / labels.length, cy: P.t + ih - v / 100 * ih, r: 3, fill: '#F59E0B' })));
    container.innerHTML = ''; container.appendChild(svg);
  }

  /* ---------- 环形 / 进度环 ---------- */
  function donut(container, { value, size = 92, color = '#7C3AED', track = '#EDE9FE', label = '', textColor = '#1E2330', width = 11 }) {
    const r = (size - width) / 2, c = 2 * Math.PI * r;
    const off = c * (1 - Math.min(100, Math.max(0, value)) / 100);
    container.innerHTML =
      `<div style="position:relative;width:${size}px;height:${size}px;margin:0 auto">
        <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="transform:rotate(-90deg)">
          <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${width}"/>
          <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"
            stroke-dasharray="${c}" stroke-dashoffset="${off}" style="transition:stroke-dashoffset .6s"/>
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <b style="font-size:${size * 0.2}px;color:${textColor};font-variant-numeric:tabular-nums">${value}<span style="font-size:${size * 0.11}px">%</span></b>
          ${label ? `<span style="font-size:${size * 0.095}px;color:#6B7280;margin-top:1px">${esc(label)}</span>` : ''}
        </div>
      </div>`;
  }

  /* ---------- 横向堆叠进度（线平衡） ---------- */
  function hbars(container, rows, opts = {}) {
    const max = Math.max(...rows.map(r => r.value), 1);
    container.innerHTML = rows.map(r => {
      const pc = Math.round(r.value / max * 100);
      const color = r.color || (r.over ? '#EF4444' : '#7C3AED');
      return `<div class="flex" style="gap:10px;margin-bottom:${opts.gap || 9}px">
        <span style="width:${opts.labelW || '7.5em'};font-size:.78rem;color:#6B7280;flex:none;text-align:right" class="ellipsis">${esc(r.name)}</span>
        <div class="bar" style="flex:1"><i style="width:${pc}%;background:${color}"></i></div>
        <b style="width:3.4em;font-size:.78rem;flex:none;text-align:right;color:${color === '#EF4444' ? '#EF4444' : '#1E2330'}" class="num">${r.show !== undefined ? r.show : r.value}${r.unit || ''}</b>
      </div>`;
    }).join('');
  }

  return { line, bars, pareto, donut, hbars };
})();
