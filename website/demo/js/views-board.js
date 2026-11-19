/* ============================================================
 * MES 平台 —— 车间大屏 D01（深色 16:9 · 远距离可读）
 * ============================================================ */
'use strict';

const Board = {
  render(root) {
    const done = todayOut(), plan = todayPlan();
    const reach = Math.round(done / plan * 100);
    const open = openAndon();
    const wip = wipByCell();
    const oeeAvg = Math.round(DB.oee.reduce((s, o) => s + o.a * o.p * o.q / 10000, 0) / DB.oee.length * 10) / 10;

    root.innerHTML = `
    <div class="board">
      <div class="board-head">
        <div class="board-title"><span class="lg">M</span>MES 平台 <em>· 一号车间生产大屏</em></div>
        <div class="board-clock"><b id="bd-clock">--:--:--</b><span id="bd-date">----年--月--日 星期-</span></div>
      </div>
      <div class="board-body">
        <div class="bcol">
          <div class="bpanel" style="flex:.9">
            <div class="bpanel-h">当日计划达成<span class="more">白班</span></div>
            <div class="bignum-row">
              <div class="bignum"><b>${reach}%</b><span>达成率</span></div>
              <div class="bignum g"><b>${done}</b><span>实际产出</span></div>
              <div class="bignum"><b>${plan}</b><span>计划产出</span></div>
              <div class="bignum ${open.length ? 'r' : 'g'}"><b>${open.length}</b><span>进行中异常</span></div>
            </div>
          </div>
          <div class="bpanel" style="flex:1.1">
            <div class="bpanel-h">各 Cell 节拍状态<span class="more">达成率着色</span></div>
            <div class="cellgrid">
              ${DB.cells.map(c => {
      const r = taktRate(c);
      const cls = r >= 90 ? 'ok' : r >= 70 ? 'warn' : 'bad';
      return `<div class="cellbox ${cls}"><div class="nm"><span>${esc(c.name)}</span><span>${c.takt}s</span></div><div class="pc">${r}%</div></div>`;
    }).join('')}
            </div>
          </div>
          <div class="bpanel" style="flex:1.2">
            <div class="bpanel-h">OEE 综合设备效率<span class="more">目标 ≥85%</span></div>
            <div class="oee-grid">
              ${DB.oee.map(o => {
      const v = Math.round(o.a * o.p * o.q / 10000 * 10) / 10;
      return `<div class="oee-cell"><div class="oee-ring" id="oee-${o.cell.length}${Math.round(o.a)}"></div><b>${esc(o.cell.replace('机加 ', '机加').replace('装配 ', '装配').replace('电子装配 Cell', '电子'))}</b></div>`;
    }).join('')}
            </div>
          </div>
        </div>
        <div class="bcol">
          <div class="bpanel" style="flex:1.5">
            <div class="bpanel-h">今日分时产出 vs 计划曲线<span class="more">刷新 ≤5s</span></div>
            <div id="bd-chart" style="flex:1;min-height:0"></div>
          </div>
          <div class="bpanel" style="flex:1">
            <div class="bpanel-h">在制工单完成进度<span class="more">滚动</span></div>
            <div class="wip-list">
              ${DB.orders.filter(o => ['在制', '暂停', '已派工'].includes(o.status)).map(o => {
      const pc = orderProgress(o);
      const cell = (DB.cells.find(x => x.id === o.cellId) || {}).name || '未分配';
      const over = o.status === '暂停';
      return `<div class="wip-row ${over ? 'over' : ''}"><span class="nm">${o.id} <span style="opacity:.6">${esc(cell)}</span></span><div class="bar2"><i style="width:${pc}%"></i></div><span class="qty">${pc}%</span></div>`;
    }).join('')}
            </div>
          </div>
        </div>
        <div class="bcol">
          <div class="bpanel" style="flex:1.35">
            <div class="bpanel-h">Andon 异常实时滚动<span class="more">${open.length ? '⚠ 有异常' : '✓ 正常'}</span></div>
            <div class="andon-scroll" id="bd-andon">
              ${open.length ? open.map(a => `
                <div class="andon-item ${a.status}">
                  <span class="tp" style="background:${a.status === 'open' ? 'rgba(239,68,68,.85)' : 'rgba(245,158,11,.85)'};color:#fff">${esc(a.type)}</span>
                  <div class="bd"><b>${a.order} · ${esc(a.station)}</b><span>${esc(a.handler || '待响应')} · ${esc(a.note || '')}</span></div>
                  <span class="tm" data-tick="${a.start}">${ticking(a.start)}</span>
                </div>`).join('') : '<div class="andon-item" style="background:rgba(52,211,153,.08);border-color:rgba(52,211,153,.35)"><span class="tp" style="background:rgba(52,211,153,.8);color:#fff">正常</span><div class="bd"><b>车间运行正常</b><span>暂无进行中异常呼叫</span></div></div>'}
              ${DB.andon.filter(a => a.status === 'closed').slice(0, 2).map(a => `
                <div class="andon-item" style="opacity:.55;background:rgba(120,130,180,.07);border-color:rgba(120,130,180,.25)">
                  <span class="tp" style="background:rgba(120,130,180,.4);color:#fff">${esc(a.type)}</span>
                  <div class="bd"><b>${a.order} · ${esc(a.station)}</b><span>已消除 · 响应 ${a.respond ? durText(a.respond - a.start) : '—'}</span></div>
                  <span class="tm" style="opacity:.7">${durText((a.end || NOW()) - a.start)}</span>
                </div>`).join('')}
            </div>
          </div>
          <div class="bpanel" style="flex:1">
            <div class="bpanel-h">WIP 在制水位<span class="more">红 = 瓶颈预警</span></div>
            <div class="wip-list">
              ${DB.cells.map(c => {
      const w = (wip[c.id] || { qty: 0 }).qty;
      const over = w > 150;
      return `<div class="wip-row ${over ? 'over' : ''}"><span class="nm">${esc(c.name)}</span><div class="bar2"><i style="width:${Math.min(100, w / 4)}%"></i></div><span class="qty">${w} 件</span></div>`;
    }).join('')}
            </div>
          </div>
          <div class="bpanel" style="flex:.55">
            <div class="bpanel-h">工单履约</div>
            <div class="bignum-row" style="grid-template-columns:repeat(3,1fr)">
              <div class="bignum g"><b>${DB.orders.filter(o => o.status === '报工确认').length}</b><span>今日完工</span></div>
              <div class="bignum"><b>${DB.orders.filter(o => ['在制', '暂停', '已派工'].includes(o.status)).length}</b><span>在制</span></div>
              <div class="bignum"><b>${DB.orders.filter(o => o.status === '未派发').length}</b><span>待派发</span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="board-foot-tip">数据来源：MES 工位报工 + ERP 同步 ｜ 节拍 ${DB.cells.map(c => c.takt + 's').join(' / ')} ｜ 本页每 5 秒自动刷新 ｜ 返回门户请点击右上角 ✕</div>
      <div class="board-exit"><a href="#/" title="退出大屏">✕</a></div>
    </div>`;

    /* OEE 环形图 */
    DB.oee.forEach(o => {
      const v = Math.round(o.a * o.p * o.q / 10000 * 10) / 10;
      const target = document.getElementById(`oee-${o.cell.length}${Math.round(o.a)}`);
      if (target) {
        const t = document.createElement('div'); t.style.width = '100%';
        target.parentNode.replaceChild(t, target);
        Charts.donut(t, { value: v, size: 72, width: 8, color: v >= 85 ? '#34D399' : v >= 75 ? '#FBBF24' : '#F87171', track: 'rgba(124,58,237,.18)', textColor: '#E5E8F5' });
      }
    });

    /* 主图表：取全部 Cell 合计分时产出 */
    const hours = [...new Set(DB.cells.flatMap(c => (DB.taktLog[c.id] || []).map(x => x.h)))].sort();
    const act = hours.map(h => DB.cells.reduce((s, c) => { const e = (DB.taktLog[c.id] || []).find(x => x.h === h); return s + (e ? e.out : 0); }, 0));
    const pln = hours.map(h => DB.cells.reduce((s, c) => { const e = (DB.taktLog[c.id] || []).find(x => x.h === h); return s + (e ? e.plan : 0); }, 0));
    const box = document.getElementById('bd-chart');
    if (box) Charts.line(box, hours,
      [{ name: '实际', color: '#A78BFA', data: act }, { name: '计划', color: '#60A5FA', data: pln, dash: true }],
      { height: Math.max(170, Math.min(300, box.clientHeight || 220)), area: true, grid: 3 });

    /* 时钟 + 自动刷新 */
    const clock = () => {
      const d = new Date(), n = document.getElementById('bd-clock');
      if (!n) return;
      n.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      document.getElementById('bd-date').textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${'日一二三四五六'[d.getDay()]}`;
    };
    clock(); this._clk = setInterval(clock, 1000);
    Timers.clear();
    document.querySelectorAll('[data-tick]').forEach(n => Timers.add(() => { n.textContent = ticking(+n.getAttribute('data-tick')); }));
    this._refresh = setInterval(() => { if (Route.cur().startsWith('/board')) App.refresh(); }, 15000);
  },

  destroy() { clearInterval(this._clk); clearInterval(this._refresh); },
};
