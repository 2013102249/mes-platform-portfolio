/* ============================================================
 * MES 平台 —— 移动 H5（A01 移动看板 / A02 异常接收与处置）
 * ============================================================ */
'use strict';

const Mobile = {
  tab: 'dash',        // dash / andon / orders / me
  me: null,           // 当前移动端用户

  render(root, sub) {
    if (!this.me) { this.me = DB.workers.find(w => w.role === '车间主任'); }
    if (sub && ['dash', 'andon', 'orders', 'me'].includes(sub)) this.tab = sub;
    const t = this.tab;
    root.innerHTML = `
    <div class="mob">
      <div class="mob-top">
        <div class="r1">
          <div class="who"><span class="avatar" style="width:40px;height:40px">${esc(this.me.name[0])}</span>
            <div><b>${esc(this.me.name)}</b><span>${esc(this.me.role)} · ${esc(DB.meta.factory)}</span></div></div>
          <div class="date">${fmtDate(NOW())}<br>${['dash', 'orders'].includes(t) ? '白班 · 已运行 ' + ticking(new Date().setHours(8, 0, 0, 0)).replace(' 分钟', 'm') : ''}</div>
        </div>
        <div class="mob-kpis">
          <div class="mob-kpi"><b>${DB.orders.length}</b><span>工单</span></div>
          <div class="mob-kpi"><b>${Math.round(todayOut() / todayPlan() * 100)}%</b><span>达成</span></div>
          <div class="mob-kpi"><b>${Object.values(wipByCell()).reduce((s, x) => s + x.qty, 0)}</b><span>WIP</span></div>
          <div class="mob-kpi"><b style="color:${openAndon().length ? '#FCA5A5' : '#6EE7B7'}">${openAndon().length}</b><span>异常</span></div>
        </div>
      </div>
      <div class="mob-body" id="mob-body"></div>
      <nav class="tabbar">
        ${[['dash', '⌂', '看板'], ['andon', '⚡', '异常'], ['orders', '▤', '工单'], ['me', '👤', '我的']].map(x => `
          <button class="tab-i ${t === x[0] ? 'on' : ''}" onclick="Mobile.tab='${x[0]}';App.refresh()">${x[0] === 'andon' && openAndon().length ? `<span class="bdg">${openAndon().length}</span>` : ''}<span class="i">${x[1]}</span>${x[2]}</button>`).join('')}
      </nav>
    </div>`;
    const b = document.getElementById('mob-body');
    if (t === 'dash') this.rDash(b);
    else if (t === 'andon') this.rAndon(b);
    else if (t === 'orders') this.rOrders(b);
    else this.rMe(b);
    if (t === 'dash') this.bindTimers(b);
  },

  /* ---------- A01 移动看板 ---------- */
  rDash(b) {
    b.innerHTML = `
      <div class="mob-sec-t">今日概览 <a class="more" onclick="Mobile.tab='orders';App.refresh()">工单明细 →</a></div>
      <div class="mcard">
        ${[['今日产出 / 计划', todayOut() + ' / ' + todayPlan() + ' 件', Math.round(todayOut() / todayPlan() * 100) + '%', 'var(--primary)'],
        ['节拍达成（最优 Cell）', '电子装配 Cell', taktRate(DB.cells[4]) + '%', 'var(--ok)'],
        ['综合 OEE', '87.6%', '目标 85%', 'var(--blue)'],
        ['直通率 FTQ', '98.4%', '不良 ' + DB.orders.reduce((s, o) => s + o.ng, 0) + ' 件', 'var(--warn)']].map(x => `
        <div class="mrow"><div class="bd"><b>${x[0]}</b><span>${x[2]}</span></div><div class="rt"><b style="color:${x[3]}">${x[1]}</b></div></div>`).join('')}
      </div>
      <div class="mob-sec-t">各 Cell 节拍达成 <a class="more" href="#/board" target="_blank" rel="noopener">大屏 →</a></div>
      <div class="mcard">
        ${DB.cells.map(c => { const r = taktRate(c); return `
        <div class="mrow"><div class="ico" style="background:${r >= 90 ? 'var(--ok-bg)' : 'var(--warn-bg)'};color:${r >= 90 ? 'var(--ok)' : 'var(--warn)'}">◔</div>
        <div class="bd"><b>${esc(c.name)}</b><span>节拍 ${c.takt}s · UPH ${Math.round(3600 / c.takt)}</span></div>
        <div class="rt"><b style="color:${r >= 90 ? 'var(--ok)' : 'var(--warn)'}">${r}%</b><span>达成</span></div></div>`; }).join('')}
      </div>
      <div class="mob-sec-t">实时异常 <a class="more" onclick="Mobile.tab='andon';App.refresh()">全部 →</a></div>
      <div class="mcard">
        ${openAndon().slice(0, 3).map(a => `
        <div class="mrow"><div class="ico" style="background:${a.status === 'open' ? 'var(--danger-bg)' : 'var(--warn-bg)'};color:${a.status === 'open' ? 'var(--danger)' : 'var(--warn)'}">⚡</div>
        <div class="bd"><b>${esc(a.type)} · ${a.order}</b><span>${esc(a.station)} · ${a.status === 'open' ? '待响应' : '处理中'}</span></div>
        <div class="rt"><b class="timer" data-tick="${a.start}" style="color:var(--danger)">${ticking(a.start)}</b><span>持续</span></div></div>`).join('') || '<div class="tc muted" style="padding:16px">✅ 当前无异常</div>'}
      </div>
      <div class="mob-sec-t">WIP 水位</div>
      <div class="mcard">
        ${DB.cells.map(c => { const w = (wipByCell()[c.id] || { qty: 0 }).qty; return `
        <div class="mrow"><div class="bd" style="flex:none;width:7.5em"><b style="font-size:.82rem">${esc(c.name)}</b></div>
        <div class="bar ${w > 150 ? 'danger' : ''}" style="flex:1"><i style="width:${Math.min(100, w / 4)}%"></i></div>
        <span class="mini num" style="width:3.5em;text-align:right">${w} 件</span></div>`; }).join('')}
      </div>
      <p class="tc mini mt">A01 移动看板 ｜ 数据每 15s 自动刷新</p>`;
  },

  /* ---------- A02 异常接收与处置 ---------- */
  rAndon(b) {
    const list = DB.andon;
    b.innerHTML = `
      <div class="mob-sec-t">待响应 / 处理中（${openAndon().length}）</div>
      ${openAndon().map(a => `
      <div class="andon-card ${a.status} mb">
        <div class="flex sb" style="margin-bottom:6px"><b>${a.type === '缺料' ? '📦' : a.type === '设备故障' ? '🔧' : '⚠'} ${esc(a.type)}</b>
        <span class="tag ${a.status === 'open' ? 'tag-danger' : 'tag-warn'}">${a.status === 'open' ? '待响应' : '处理中'}</span></div>
        <p class="mini" style="line-height:1.7">${a.order} ｜ 工位：${esc(a.station)} ｜ 呼叫人：${esc(a.caller)}<br>${esc(a.note || '无备注')}</p>
        <div class="flex sb mt" style="border-top:1px dashed var(--line);padding-top:10px">
          <div><span class="mini">已持续</span><br><b class="timer" data-tick="${a.start}" style="color:var(--danger)">${ticking(a.start)}</b></div>
          <div><span class="mini">处理人</span><br><b style="font-size:.9rem">${esc(a.handler || '待接单')}</b></div>
          ${a.status === 'open' ? `<button class="ando-act" onclick="Mobile.claim('${a.id}')">接单响应</button>`
        : `<button class="ando-act done" onclick="ACT.closeAndon('${a.id}','移动端确认消除');UI.toast('异常已消除','ok')">消除关闭</button>`}
        </div>
      </div>`).join('') || '<div class="mcard tc muted" style="padding:26px">✅ 暂无进行中异常<br><span class="mini">新呼叫将通过企业微信推送到本机</span></div>'}
      <div class="mob-sec-t">今日异常台账（${list.length}）</div>
      <div class="mcard">
        ${list.map(a => `<div class="mrow"><div class="ico" style="background:#F3F4F8">▪</div>
        <div class="bd"><b style="font-size:.84rem">${esc(a.type)} · ${a.order}</b><span>${esc(a.handler || '未指派')} · 响应 ${a.respond ? durText(a.respond - a.start) : '—'} · 停线 ${a.end ? durText(a.end - a.start) : '计时中'}</span></div>
        <span class="tag ${a.status === 'closed' ? 'tag-ok' : a.status === 'open' ? 'tag-danger' : 'tag-warn'}">${a.status === 'closed' ? '已消除' : a.status === 'open' ? '待响应' : '处理中'}</span></div>`).join('')}
      </div>
      <p class="tc mini mt">A02 异常接收与处置 ｜ 质量异常联动 QMS · 设备故障联动 EAM</p>`;
  },
  claim(id) {
    UI.modal({
      title: '接单响应',
      body: `<p class="mini mb">确认由我处理该异常？接单后开始响应计时，处理完成请点击「消除关闭」。</p>
        <div class="form-row"><label>预计处理措施</label><select id="cl-m">${['立即到现场处理', '先电话指导操作工', '协调资源处理'].map(x => `<option>${x}</option>`).join('')}</select></div>`,
      footer: `<button class="btn btn-o" onclick="UI.closeModal()">取消</button><button class="btn btn-p" onclick="ACT.respondAndon('${id}','${Mobile.me.id}');UI.closeModal();UI.toast('已接单，响应计时开始','ok')">确认接单</button>`,
    });
  },

  /* ---------- 工单简况 ---------- */
  rOrders(b) {
    b.innerHTML = `
      ${['在制', '暂停', '已派工', '报工确认', '未派发'].map(st => {
      const list = DB.orders.filter(o => o.status === st);
      if (!list.length) return '';
      return `<div class="mob-sec-t">${st}（${list.length}）</div><div class="mcard mb" style="padding:4px 16px">
        ${list.map(o => `<div class="mrow" onclick="Admin.orderDetail('${o.id}')">
          <div class="ico" style="background:var(--primary-light);color:var(--primary)">▤</div>
          <div class="bd"><b>${o.id}</b><span>${esc(o.productId)} × ${o.qty} ｜ ${esc((DB.cells.find(x => x.id === o.cellId) || { name: '未分配' }).name)}</span>
            <div class="bar ${o.status === '暂停' ? 'danger' : orderProgress(o) === 100 ? 'ok' : ''}" style="margin-top:6px;height:6px"><i style="width:${orderProgress(o)}%"></i></div></div>
          <div class="rt"><b>${orderProgress(o)}%</b><span>${o.done}/${o.qty}</span></div></div>`).join('')}
      </div>`; }).join('')}
      <p class="tc mini mt">点击工单查看工序级详情（工单状态机全流程）</p>`;
  },

  /* ---------- 我的 ---------- */
  rMe(b) {
    b.innerHTML = `
      <div class="mcard tc" style="padding:24px">
        <span class="avatar" style="width:64px;height:64px;font-size:1.5rem;margin:0 auto 10px">${esc(this.me.name[0])}</span>
        <b style="font-size:1.1rem">${esc(this.me.name)}</b>
        <p class="mini">${esc(this.me.role)} · ${esc(this.me.team)} ｜ 资质：${esc(this.me.cert.join('、') || '—')}</p>
      </div>
      <div class="mcard mt" style="padding:4px 16px">
        ${[['车间大屏（16:9 深色版）', "window.open(location.origin+location.pathname+'#/board','_blank')", '⛶'],
        ['切换为工位作业终端', "Route.go('/station')", '🏭'],
        ['返回角色门户', "Route.go('/')", '⟡'],
        ['数据重置（重新生成演示数据）', 'Mobile.reset()', '↺']].map(x => `
        <div class="mrow" onclick="${x[1]}"><div class="bd"><b>${x[0]}</b></div><span class="mini" style="font-size:1rem">${x[2]}</span></div>`).join('')}
      </div>
      <p class="tc mini mt">MES 平台 V1.0 ｜ 离散制造执行系统<br>工单 · 报工 · 节拍 · Andon · 追溯</p>`;
  },
  reset() {
    UI.confirm({
      title: '重置演示数据', text: '将清空本机演示数据并重新生成（工单、报工、异常记录恢复初始状态）。确认继续？',
      okText: '重置', onOk: () => { localStorage.removeItem(DB_KEY); seed(); Route.go('/'); UI.toast('演示数据已重置', 'ok'); },
    });
  },

  bindTimers(scope) {
    const nodes = scope.querySelectorAll('[data-tick]');
    if (!nodes.length) return;
    Timers.clear();
    nodes.forEach(n => Timers.add(() => { n.textContent = ticking(+n.getAttribute('data-tick')); }));
  },
};
