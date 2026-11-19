/* ============================================================
 * MES 平台 —— PC 管理后台（P01-P15）
 * ============================================================ */
'use strict';

const Admin = {
  nav: [
    { grp: '执行驾驶舱', items: [
      { k: 'dash', n: '工作台', i: '⌂' },
      { k: 'orders', n: '工单管理', i: '▤' },
      { k: 'dispatch', n: '派工调度', i: '⇉' },
      { k: 'wip', n: 'WIP 跟踪', i: '◈' },
      { k: 'takt', n: '节拍监控', i: '◔' },
    ]},
    { grp: '协同与追溯', items: [
      { k: 'andon', n: 'Andon 异常', i: '⚡', badge: () => openAndon().length },
      { k: 'trace', n: '正反向追溯', i: '⇄' },
    ]},
    { grp: '经营分析', items: [
      { k: 'perf', n: '班组绩效', i: '♛' },
      { k: 'report', n: '报表中心', i: '◫' },
    ]},
    { grp: '配置与系统', items: [
      { k: 'routing', n: '工艺路线', i: '⚙' },
      { k: 'master', n: '主数据', i: '▦' },
      { k: 'rules', n: '异常规则', i: '◎' },
      { k: 'erp', n: 'ERP 对接', i: '⇌' },
      { k: 'auth', n: '权限组织', i: '⛨' },
    ]},
  ],

  render(root, sub) {
    const user = DB.workers[0];
    const badge = k => { const it = this.nav.flatMap(g => g.items).find(i => i.k === k); const b = it && it.badge ? it.badge() : 0; return b ? `<span class="badge">${b}</span>` : ''; };
    root.innerHTML = `
    <div class="admin">
      <aside class="side" id="side">
        <div class="side-brand"><div class="side-logo">M</div><div><b>MES 平台</b><span>离散制造执行系统 V1.0</span></div></div>
        <nav class="side-nav">${this.nav.map(g => `<div class="grp">${g.grp}</div>` + g.items.map(it =>
          `<div class="nav-i ${sub === it.k ? 'on' : ''}" onclick="Route.go('/admin/${it.k}')"><span class="ico">${it.i}</span>${it.n}${badge(it.k)}</div>`).join('')).join('')}
        </nav>
        <div class="side-foot">${esc(DB.meta.factory)}<br>SaaS · 数据实时同步</div>
      </aside>
      ${sub === '' ? '' : ''}
      <div class="main">
        <div class="topbar">
          <button class="hamburger" onclick="Admin.toggleSide()">☰</button>
          <div class="crumb">${(this.nav.flatMap(g => g.items).find(i => i.k === sub) || { n: '工作台' }).n}</div>
          <div class="sp"></div>
          <div class="top-pill hide-m"><span class="dot"></span>ERP 已连接 · 用友 U8</div>
          <div class="top-pill"><span class="dot ${openAndon().length ? 'red' : ''}"></span>异常 ${openAndon().length}</div>
          <div class="top-pill hide-m">📅 ${fmtDate(NOW())}</div>
          <div class="avatar" title="${esc(user.name)}">${esc(user.name[0])}</div>
        </div>
        <div class="content" id="admin-content"></div>
      </div>
    </div>`;
    const c = document.getElementById('admin-content');
    const fn = { dash: 'Dash', orders: 'Orders', dispatch: 'Dispatch', wip: 'Wip', takt: 'Takt', andon: 'Andon', trace: 'Trace', perf: 'Perf', report: 'Report', routing: 'Routing', master: 'Master', rules: 'Rules', erp: 'Erp', auth: 'Auth' }[sub] || 'Dash';
    this['r' + fn](c);
  },

  toggleSide() {
    const s = document.getElementById('side');
    s.classList.toggle('open');
    if (s.classList.contains('open')) {
      const m = document.createElement('div'); m.className = 'side-mask'; m.id = 'side-mask';
      m.onclick = () => { s.classList.remove('open'); m.remove(); };
      document.body.appendChild(m);
    } else { const m = document.getElementById('side-mask'); if (m) m.remove(); }
  },
  closeSide() { const s = document.getElementById('side'); if (s) s.classList.remove('open'); const m = document.getElementById('side-mask'); if (m) m.remove(); },

  pageHead(title, desc, right = '') { return `<div class="page-h"><div><h2>${title}</h2><div class="desc">${desc}</div></div>${right}</div>`; },

  /* ============ P01 工作台 ============ */
  rDash(c) {
    const wip = wipByCell();
    const wipOrders = Object.values(wip).reduce((s, x) => s + x.orders, 0);
    const wipQty = Object.values(wip).reduce((s, x) => s + x.qty, 0);
    const plan = todayPlan(), done = todayOut();
    const paused = DB.orders.filter(o => o.status === '暂停');
    const unfinished = DB.orders.filter(o => ['已派工', '在制', '暂停'].includes(o.status));
    const reach = Math.round(done / plan * 100);
    c.innerHTML = `
      ${this.pageHead('生产工作台', `${DB.meta.factory} ｜ 白班 08:00-16:30 ｜ 车间主任：王建国`, `<a class="btn btn-p" href="#/board" target="_blank" rel="noopener">⛶ 打开车间大屏</a>`)}
      <div class="kpis">
        <div class="kpi" onclick="Route.go('/admin/orders')"><span class="kico">▤</span><div class="lb">今日工单</div><div class="v num">${DB.orders.length}<small>张</small></div><div class="sub">在制 ${unfinished.length} · 暂停 ${paused.length}</div></div>
        <div class="kpi k-ok" onclick="Route.go('/admin/report')"><span class="kico">✓</span><div class="lb">计划达成率</div><div class="v num">${reach}%</div><div class="sub">产出 ${done} / 计划 ${plan} 件</div></div>
        <div class="kpi k-warn" onclick="Route.go('/admin/wip')"><span class="kico">◈</span><div class="lb">WIP 在制</div><div class="v num">${wipQty}<small>件</small></div><div class="sub">${wipOrders} 张工单在制</div></div>
        <div class="kpi ${openAndon().length ? 'k-danger' : ''}" onclick="Route.go('/admin/andon')"><span class="kico">⚡</span><div class="lb">Andon 异常</div><div class="v num">${openAndon().length}<small>起</small></div><div class="sub">今日累计 ${DB.andon.length} 起</div></div>
      </div>
      <div class="grid g3">
        <div class="card" style="grid-column:span 2">
          <div class="card-h"><div class="card-t">今日各 Cell 节拍达成</div><a class="mini" href="#/admin/takt">详情 →</a></div>
          <div class="card-b">
            ${DB.cells.map(cell => { const r = taktRate(cell); const cls = r >= 90 ? 'ok' : r >= 70 ? 'warn' : 'danger'; return `
              <div class="flex sb" style="margin-bottom:10px">
                <span style="font-size:.86rem;font-weight:600;width:8em">${esc(cell.name)}</span>
                <div class="bar ${cls}" style="flex:1"><i style="width:${r}%"></i></div>
                <b class="num" style="font-size:.84rem;width:3em;text-align:right">${r}%</b>
                <span class="mini" style="width:8.5em;text-align:right">节拍 ${cell.takt}s · UPH ${Math.round(3600 / cell.takt)}</span>
              </div>`; }).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-h"><div class="card-t">待办提醒</div></div>
          <div class="card-b" style="padding-top:.4rem">
            ${paused.map(o => `<div class="mrow"><div class="ico" style="background:var(--danger-bg);color:var(--danger)">⏸</div><div class="bd"><b>${o.id} 暂停</b><span>原因：${esc(o.pauseReason)} · ${ticking((o.steps[o.currentStep].pauses[0] || {}).start || o.createdAt)}前</span></div><button class="btn btn-sm btn-p" onclick="ACT.resume('${o.id}');UI.toast('已恢复作业','ok')">恢复</button></div>`).join('') || '<div class="empty"><div class="ico">🎉</div>无暂停工单</div>'}
            <div class="mrow"><div class="ico" style="background:var(--info-bg);color:var(--info)">◈</div><div class="bd"><b>${DB.orders.filter(o => o.status === '未派发').length} 张工单待派发</b><span>请前往派工调度分配 Cell</span></div><button class="btn btn-sm btn-p" onclick="Route.go('/admin/dispatch')">去派工</button></div>
            <div class="mrow"><div class="ico" style="background:var(--warn-bg);color:var(--warn)">⇌</div><div class="bd"><b>ERP 入库待回写</b><span>${DB.orders.filter(o => o.status === '报工确认' && o.stock !== '已入库').length} 张工单待过账</span></div><button class="btn btn-sm btn-o" onclick="Route.go('/admin/orders')">查看</button></div>
          </div>
        </div>
      </div>
      <div class="grid g2 mt">
        <div class="card">
          <div class="card-h"><div class="card-t">实时异常（Andon）</div><a class="mini" href="#/admin/andon">全部 →</a></div>
          <div class="card-b" style="padding-top:.4rem">
            ${openAndon().slice(0, 4).map(a => `
              <div class="mrow"><div class="ico" style="background:${a.status === 'open' ? 'var(--danger-bg)' : 'var(--warn-bg)'};color:${a.status === 'open' ? 'var(--danger)' : 'var(--warn)'}">${a.type === '缺料' ? '📦' : a.type === '设备故障' ? '🔧' : '⚠'}</div>
              <div class="bd"><b>${a.type} · ${a.order}</b><span>${esc(a.station)} · 呼叫人 ${esc(a.caller)} · ${esc(a.note || '')}</span></div>
              <div class="rt"><b class="timer" style="color:${a.status === 'open' ? 'var(--danger)' : 'var(--warn)'}" data-tick="${a.start}">${ticking(a.start)}</b><span>${a.status === 'open' ? '待响应' : '处理中'}</span></div></div>`).join('') || '<div class="empty"><div class="ico">✅</div>当前无异常</div>'}
          </div>
        </div>
        <div class="card">
          <div class="card-h"><div class="card-t">今日工单动态</div></div>
          <div class="card-b" style="padding-top:.4rem">
            ${DB.orders.flatMap(o => o.timeline.slice(-1).map(t => ({ ...t, o }))).sort((a, b) => b.t - a.t).slice(0, 6).map(t => `
              <div class="mrow"><div class="ico" style="background:var(--primary-light);color:var(--primary)">▪</div>
              <div class="bd"><b>${t.o.id} · ${esc(t.o.productId)}</b><span>${esc(t.text)}</span></div><div class="rt"><b style="font-size:.8rem">${fmtTime(t.t)}</b></div></div>`).join('')}
          </div>
        </div>
      </div>`;
    this.bindTimers(c);
  },

  /* ============ P02 工单列表 ============ */
  rOrders(c) {
    this._oFilter = this._oFilter || '全部';
    const F = this._oFilter;
    const list = DB.orders.filter(o => F === '全部' || o.status === F);
    c.innerHTML = `
      ${this.pageHead('工单管理', '承接 ERP 工单 · 状态机：未派发→已派工→开工→在制→暂停→完工→报工确认', `<button class="btn btn-o" onclick="Admin.simulateErp()">⇩ 从 ERP 同步</button>`)}
      <div class="filters">${['全部', '未派发', '已派工', '在制', '暂停', '报工确认'].map(f => `<button class="chip ${F === f ? 'on' : ''}" onclick="Admin._oFilter='${f}';App.refresh()">${f} ${f === '全部' ? DB.orders.length : DB.orders.filter(o => o.status === f).length}</button>`).join('')}</div>
      <div class="card"><div class="card-b">
        <div class="tbl-wrap"><table class="tbl"><thead><tr>
          <th>工单号</th><th>产品 / 客户</th><th>数量（完成）</th><th>进度</th><th>Cell</th><th>交期</th><th>优先级</th><th>状态</th><th>操作</th>
        </tr></thead><tbody>
        ${list.map(o => `<tr>
          <td class="rowlink" data-l="工单号" onclick="Admin.orderDetail('${o.id}')">${o.id}</td>
          <td data-l="产品">${esc(o.productId)}<br><span class="mini">${esc(o.customer)}</span></td>
          <td class="num" data-l="数量">${o.done}/${o.qty}${o.ng ? `<span class="mini"> 不良${o.ng}</span>` : ''}</td>
          <td data-l="进度"><div class="bar ${orderProgress(o) === 100 ? 'ok' : ''}" style="width:90px"><i style="width:${orderProgress(o)}%"></i></div></td>
          <td data-l="Cell">${o.cellId ? esc((DB.cells.find(x => x.id === o.cellId) || {}).name || '—') : '<span class="mini">未分配</span>'}</td>
          <td data-l="交期" class="${o.due < NOW() && o.status !== '报工确认' ? 'strong" style="color:var(--danger)' : ''}">${fmtDate(o.due)}</td>
          <td data-l="优先级">${priTag(o.priority)}</td>
          <td data-l="状态">${statusTag(o.status)}${o.status === '暂停' ? `<div class="mini" style="color:var(--danger)">${esc(o.pauseReason)}</div>` : ''}</td>
          <td>${o.status === '未派发' ? `<button class="btn btn-sm btn-p" onclick="Admin.dispatchDlg('${o.id}')">派工</button>` : `<button class="btn btn-sm btn-o" onclick="Admin.orderDetail('${o.id}')">详情</button>`}</td>
        </tr>`).join('')}
        </tbody></table></div>
      </div></div>`;
  },

  simulateErp() {
    const n = DB.orders.length + 1;
    const rt = pick(DB.routings);
    const o = mkOrder({
      id: 'WO-2610-0' + n, productId: rt.product, routingId: rt.id, cellId: null, qty: rnd(100, 500),
      done: 0, ng: 0, scrap: 0, priority: pick(['正常', '高']), customer: pick(DB.customers),
      due: NOW() + rnd(2, 6) * DAY, status: '未派发', currentStep: 0, createdAt: NOW(),
      timeline: [{ t: NOW(), text: 'ERP 同步工单（' + pick(['用友 U8', '金蝶 K3']) + '）' }],
    });
    o.steps = mkSteps(rt);
    DB.orders.unshift(o);
    saveDB(); App.refresh(); UI.toast('已从 ERP 同步 1 张新工单：' + o.id, 'ok');
  },

  /* ---- 工单详情 modal（P03） ---- */
  orderDetail(id) {
    const o = DB.orders.find(x => x.id === id); if (!o) return;
    const rt = DB.routings.find(r => r.id === o.routingId);
    const cell = DB.cells.find(x => x.id === o.cellId);
    UI.modal({
      title: `${o.id} · ${esc(o.productId)}`,
      body: `
        <div class="flex wrap mb" style="gap:8px">${statusTag(o.status)} ${priTag(o.priority)} <span class="tag tag-gray">${esc(o.customer)}</span><span class="tag tag-purple">${esc(rt.name)} ${rt.version}</span></div>
        <div class="grid g4 mb" style="gap:8px">
          <div class="qty-box"><label>计划数</label><b class="num">${o.qty}</b></div>
          <div class="qty-box ok"><label>合格</label><b class="num" style="color:var(--ok)">${o.done}</b></div>
          <div class="qty-box ng"><label>不良</label><b class="num" style="color:var(--warn)">${o.ng}</b></div>
          <div class="qty-box sc"><label>报废</label><b class="num" style="color:var(--danger)">${o.scrap}</b></div>
        </div>
        <div class="bar mb" style="height:12px"><i style="width:${orderProgress(o)}%"></i></div>
        <p class="mini mb">进度 ${orderProgress(o)}% ｜ ${cell ? '执行单元：' + esc(cell.name) : '未分配 Cell'} ｜ 交期 ${fmtDate(o.due)} ｜ ERP ${o.erpSync ? '已回写' : '未回写'} ${o.stock ? '· ' + o.stock : ''}</p>
        <b style="font-size:.9rem">工序流转（${rt.steps.length} 道）</b>
        <div class="mt" style="margin-bottom:14px">
          ${o.steps.map((s, i) => `<div class="flex" style="gap:10px;margin-bottom:7px">
            <span style="width:1.6em;height:1.6em;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:800;color:#fff;background:${s.status === 'done' ? 'var(--ok)' : s.status === 'doing' ? 'var(--blue)' : s.status === 'pause' ? 'var(--danger)' : '#C4C9D8'}">${s.status === 'done' ? '✓' : i + 1}</span>
            <div style="flex:1;min-width:0" class="flex sb"><b style="font-size:.86rem">${esc(s.name)} ${s.status === 'doing' ? '<span class="tag tag-info">进行中</span>' : s.status === 'pause' ? '<span class="tag tag-danger">暂停</span>' : ''}</b>
            <span class="mini">${s.worker ? esc(s.worker) + ' · ' : ''}${s.done ? `完成 ${s.done}${s.ng ? ' 不良' + s.ng : ''}` : '待加工'} ${s.startAt ? '· ' + fmtTime(s.startAt) + (s.endAt ? '-' + fmtTime(s.endAt) : '') + ' 起' : ''}</span></div>
          </div>`).join('')}
        </div>
        <div class="grid g2" style="gap:10px">
          <div><b style="font-size:.88rem">报工记录</b>
            <div class="mt" style="max-height:150px;overflow-y:auto">
              ${o.records.slice(-6).reverse().map(r => `<div class="mini" style="padding:5px 0;border-bottom:1px dashed var(--line)">${fmtDT(r.t)} ｜ ${esc(r.step)} ｜ <b>${esc(r.worker)}</b> 合格 <b style="color:var(--ok)">${r.ok}</b> 不良 ${r.ng} 报废 ${r.scrap}</div>`).join('') || '<p class="mini">暂无报工记录</p>'}
            </div>
          </div>
          <div><b style="font-size:.88rem">工单时间线</b>
            <div class="tl mt" style="max-height:150px;overflow-y:auto">
              ${o.timeline.slice().reverse().map(t => `<div class="tl-i done"><b style="font-size:.8rem">${esc(t.text)}</b><div class="d">${fmtDT(t.t)}</div></div>`).join('')}
            </div>
          </div>
        </div>`,
      footer: o.status === '报工确认' && o.stock !== '已入库' ? `<button class="btn btn-p" onclick="ACT.postStock('${o.id}');UI.closeModal();UI.toast('入库过账完成，已回写 ERP','ok')">入库过账（回写 ERP）</button>` : `<a class="btn btn-o" href="#/admin/trace" onclick="Trace.preset('${o.id}')">追溯查询</a>`,
    });
  },

  /* ---- 派工对话框 ---- */
  dispatchDlg(orderId) {
    UI.modal({
      title: '派工调度 · ' + orderId,
      body: `<p class="mini mb">按 Cell 产能与负荷选择执行单元，派工后工位平板实时收到任务。</p>
        ${DB.cells.map(cell => { const w = wipByCell()[cell.id]; const load = (w ? w.qty : 0); const loadPct = Math.min(100, Math.round(load / (cell.planOut * 1.2) * 100)); return `
          <label class="flex sb" style="border:1.5px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:9px;cursor:pointer" onmouseover="this.style.borderColor='#7C3AED'" onmouseout="this.style.borderColor=''">
            <span class="flex" style="gap:10px"><input type="radio" name="dc" value="${cell.id}" style="width:auto"> <b style="font-size:.92rem">${esc(cell.name)}</b></span>
            <span class="mini">在制 ${load} 件 · 负荷 <b style="color:${loadPct > 80 ? 'var(--danger)' : loadPct > 55 ? 'var(--warn)' : 'var(--ok)'}">${loadPct}%</b> · 节拍 ${cell.takt}s</span>
          </label>`; }).join('')}`,
      footer: `<button class="btn btn-o" onclick="UI.closeModal()">取消</button><button class="btn btn-p" onclick="Admin.doDispatch('${orderId}')">确认派工</button>`,
    });
  },
  doDispatch(orderId) {
    const sel = document.querySelector('input[name="dc"]:checked');
    if (!sel) return UI.toast('请选择执行 Cell', 'warn');
    ACT.dispatch(orderId, sel.value);
    UI.closeModal(); UI.toast(orderId + ' 已派工', 'ok');
  },

  /* ============ P05 派工看板 ============ */
  rDispatch(c) {
    const undisp = DB.orders.filter(o => o.status === '未派发');
    const lanes = DB.cells.map(cell => ({ cell, list: DB.orders.filter(o => o.cellId === cell.id && ['已派工', '在制', '暂停', '报工确认'].includes(o.status)) }));
    c.innerHTML = `
      ${this.pageHead('派工调度看板', '按 Cell 泳道展示今日任务负荷 · 上道工序完工自动转序，无需重复派工')}
      ${undisp.length ? `<div class="card mb"><div class="card-h"><div class="card-t">待派发工单（${undisp.length}）</div></div><div class="card-b" style="padding-top:.4rem">
        ${undisp.map(o => `<div class="mrow"><div class="ico" style="background:var(--primary-light);color:var(--primary)">▤</div><div class="bd"><b>${o.id}</b><span>${esc(o.productId)} × ${o.qty} ｜ ${esc(o.customer)} ｜ 交期 ${fmtDate(o.due)}</span></div>${priTag(o.priority)}<button class="btn btn-sm btn-p" onclick="Admin.dispatchDlg('${o.id}')">派工</button></div>`).join('')}
      </div></div>` : ''}
      <div class="lanes">
        ${lanes.map(({ cell, list }) => { const w = wipByCell()[cell.id]; const r = taktRate(cell); return `
        <div class="lane">
          <div class="lane-h"><b>${esc(cell.name)}</b><span class="takt">节拍 ${cell.takt}s ｜ 达成 <b style="color:${r >= 90 ? 'var(--ok)' : 'var(--warn)'}">${r}%</b></span></div>
          ${list.map(o => `<div class="tcard st-${o.status}" onclick="Admin.orderDetail('${o.id}')">
            <div class="t1"><b>${o.id}</b>${statusTag(o.status)}</div>
            <div class="t2">${esc(o.productId)} × ${o.qty}</div>
            <div class="bar ${o.status === '暂停' ? 'danger' : orderProgress(o) === 100 ? 'ok' : ''}" style="height:6px"><i style="width:${orderProgress(o)}%"></i></div>
            <div class="flex sb mini" style="margin-top:5px"><span>${o.done}/${o.qty} 件</span><span>${o.currentStep !== undefined && o.steps[o.currentStep] ? esc(o.steps[o.currentStep].name) : ''}</span></div>
          </div>`).join('') || '<div class="empty" style="padding:1.6rem"><div class="ico">◍</div>暂无任务</div>'}
          <div class="mini tc" style="margin-top:6px">在制 ${w ? w.qty : 0} 件${w && w.paused ? ` · <span style="color:var(--danger)">${w.paused} 张暂停</span>` : ''}</div>
        </div>`; }).join('')}
      </div>`;
  },

  /* ============ P06 WIP 看板 ============ */
  rWip(c) {
    const TH = 150; // 瓶颈阈值（件）
    const rows = DB.cells.map(cell => {
      const w = wipByCell()[cell.id] || { orders: 0, qty: 0, paused: 0 };
      return { cell, ...w, over: w.qty > TH };
    });
    const over = rows.filter(r => r.over);
    c.innerHTML = `
      ${this.pageHead('WIP 在制跟踪', `按 Cell / 工序实时在制与滞留 · 瓶颈阈值 ${TH} 件，超限自动告警`, `<span class="tag ${over.length ? 'tag-danger' : 'tag-ok'}">${over.length ? `⚠ ${over.length} 个 Cell 瓶颈预警` : '✓ 无瓶颈'}</span>`)}
      <div class="kpis" style="grid-template-columns:repeat(4,1fr)">
        <div class="kpi"><span class="kico">◈</span><div class="lb">在制总量</div><div class="v num">${rows.reduce((s, r) => s + r.qty, 0)}<small>件</small></div></div>
        <div class="kpi"><span class="kico">▤</span><div class="lb">在制工单</div><div class="v num">${rows.reduce((s, r) => s + r.orders, 0)}<small>张</small></div></div>
        <div class="kpi k-danger"><span class="kico">⏸</span><div class="lb">暂停工单</div><div class="v num">${rows.reduce((s, r) => s + r.paused, 0)}<small>张</small></div></div>
        <div class="kpi k-warn"><span class="kico">⚠</span><div class="lb">瓶颈工序</div><div class="v num">${rows.filter(r => r.over).map(r => esc(r.cell.name.replace('机加 ', '').replace('装配 ', ''))).join('、') || '无'}</div></div>
      </div>
      <div class="card">
        <div class="card-h"><div class="card-t">各 Cell 在制水位</div><span class="mini">红 = 超阈值 ${TH} 件</span></div>
        <div class="card-b">
          <div id="wip-hbars"></div>
        </div>
      </div>
      <div class="grid g2 mt">
        <div class="card"><div class="card-h"><div class="card-t">工序滞留分析（近 7 日均值）</div></div><div class="card-b"><div id="wip-stay"></div></div></div>
        <div class="card"><div class="card-h"><div class="card-t">在制工单明细</div></div><div class="card-b" style="padding-top:.4rem">
          ${DB.orders.filter(o => ['在制', '暂停', '已派工'].includes(o.status)).sort((a, b) => (b.qty - b.done) - (a.qty - a.done)).map(o => `
            <div class="mrow"><div class="ico" style="background:${o.status === '暂停' ? 'var(--danger-bg)' : 'var(--info-bg)'};color:${o.status === '暂停' ? 'var(--danger)' : 'var(--info)'}">◈</div>
            <div class="bd"><b>${o.id} <span class="mini">${esc((DB.cells.find(x => x.id === o.cellId) || {}).name || '')}</span></b><span>${esc(o.productId)} · 当前 ${esc(o.steps[o.currentStep].name)} · 滞留 ${ticking(o.startedAt || o.createdAt)}</span></div>
            <div class="rt"><b class="num">${o.qty - o.done}</b><span>待完成</span></div></div>`).join('')}
        </div></div>
      </div>`;
    Charts.hbars(document.getElementById('wip-hbars'), rows.map(r => ({ name: r.cell.name, value: r.qty, over: r.over, color: r.over ? '#EF4444' : undefined })), { labelW: '8em' });
    Charts.hbars(document.getElementById('wip-stay'), [
      { name: '精铣成型', value: 42, over: true }, { name: '热处理（外协）', value: 65, over: true },
      { name: '钻孔攻丝', value: 18 }, { name: '精磨结合面', value: 25 }, { name: '老化测试', value: 31 }, { name: 'SMT 贴片', value: 12 },
    ].map(x => ({ ...x, unit: ' 分', over: x.value > 40 })), { labelW: '8em' });
  },

  /* ============ P07 节拍监控 ============ */
  rTakt(c) {
    this._taktCell = this._taktCell || 'C1';
    const cell = DB.cells.find(x => x.id === this._taktCell);
    const log = DB.taktLog[cell.id];
    const rate = taktRate(cell);
    const bal = [
      { name: 'OP10', value: 78 }, { name: 'OP20', value: 95, over: true }, { name: 'OP30', value: 86 },
      { name: 'OP40', value: 62 }, { name: 'OP50', value: 58 },
    ];
    const bottleneck = bal.reduce((a, b) => (b.value > a.value ? b : a));
    c.innerHTML = `
      ${this.pageHead('节拍监控', '实时产出 vs 标准节拍曲线 · 线平衡 · 换型 SMED', `<div class="filters" style="margin:0">${DB.cells.map(x => `<button class="chip ${x.id === cell.id ? 'on' : ''}" onclick="Admin._taktCell='${x.id}';App.refresh()">${esc(x.name)}</button>`).join('')}</div>`)}
      <div class="kpis" style="grid-template-columns:repeat(4,1fr)">
        <div class="kpi ${rate >= 90 ? 'k-ok' : 'k-warn'}"><span class="kico">◔</span><div class="lb">节拍达成率</div><div class="v num">${rate}%</div><div class="sub">标准节拍 ${cell.takt} 秒/件</div></div>
        <div class="kpi"><span class="kico">↯</span><div class="lb">UPH 小时产出</div><div class="v num">${Math.round(3600 / cell.takt)}<small>件/h</small></div><div class="sub">人均 ${Math.round(3600 / cell.takt / cell.stations.length)} 件/h</div></div>
        <div class="kpi k-danger"><span class="kico">⚠</span><div class="lb">瓶颈工位</div><div class="v" style="font-size:1.3rem">${esc(bottleneck.name)}</div><div class="sub">工时占比 ${bottleneck.value}%</div></div>
        <div class="kpi k-warn"><span class="kico">⏱</span><div class="lb">SMED 平均换型</div><div class="v num">28<small>min</small></div><div class="sub">目标 ≤ 30 min · 今日 3 次换型</div></div>
      </div>
      <div class="grid g3">
        <div class="card" style="grid-column:span 2"><div class="card-h"><div class="card-t">${esc(cell.name)} · 今日产出曲线（实际 vs 计划）</div></div><div class="card-b"><div id="takt-line"></div></div></div>
        <div class="card"><div class="card-h"><div class="card-t">线平衡率</div><span class="tag tag-danger">瓶颈 ${esc(bottleneck.name)}</span></div><div class="card-b"><div id="takt-bal"></div><p class="mini mt">平衡率 = Σ各工位工时 ÷ (瓶颈工时 × 工位数)。<b>当前 79%</b>，建议改善 ${esc(bottleneck.name)} 作业要素或并行分解。</p></div></div>
      </div>
      <div class="card mt"><div class="card-h"><div class="card-t">Cell 工位实时状态</div></div><div class="card-b">
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>工位</th><th>当前任务</th><th>操作工</th><th>节拍状态</th><th>本时产出</th><th>状态</th></tr></thead><tbody>
        ${cell.stations.map((st, i) => { const o = DB.orders.find(x => x.cellId === cell.id && (x.status === '在制' || x.status === '暂停')); const perf = rnd(72, 118); const state = o ? (o.status === '暂停' ? ['暂停', 'tag-danger'] : ['运行', 'tag-ok']) : ['空闲', 'tag-gray']; return `<tr>
          <td><b>${esc(st)}</b></td><td>${o ? o.id : '—'}</td><td>${esc(pick(DB.workers.filter(w => w.team !== '管理')).name)}</td>
          <td><div class="bar ${perf > 105 ? 'danger' : perf < 85 ? 'warn' : 'ok'}" style="width:80px"><i style="width:${Math.min(100, perf)}%"></i></div> <span class="mini">${perf}% 节拍</span></td>
          <td class="num">${rnd(20, 48)} 件</td><td><span class="tag ${state[1]}">${state[0]}</span></td></tr>`; }).join('')}
        </tbody></table></div>
      </div></div>`;
    Charts.line(document.getElementById('takt-line'), log.map(x => x.h),
      [{ name: '实际产出', color: '#7C3AED', data: log.map(x => x.out) }, { name: '计划产出', color: '#2563EB', data: log.map(x => x.plan), dash: true }],
      { height: 230, area: true, legend: true });
    Charts.hbars(document.getElementById('takt-bal'), bal.map(x => ({ ...x, unit: '%' })), { labelW: '4em' });
  },

  /* ============ P08 Andon 异常中心 ============ */
  rAndon(c) {
    this._aFilter = this._aFilter || '未关闭';
    const F = this._aFilter;
    const list = DB.andon.filter(a => F === '全部' || (F === '未关闭' ? a.status !== 'closed' : a.status === F));
    const stat = t => DB.andon.filter(a => a.type === t).length;
    c.innerHTML = `
      ${this.pageHead('Andon 异常中心', '呼叫 → 响应 → 消除全程计时 · 超时自动升级车间主任 · 质量异常联动 QMS / 设备故障联动 EAM')}
      <div class="kpis" style="grid-template-columns:repeat(4,1fr)">
        <div class="kpi k-danger"><span class="kico">⚡</span><div class="lb">进行中异常</div><div class="v num">${openAndon().length}<small>起</small></div><div class="sub">1 起已超时未响应</div></div>
        <div class="kpi k-warn"><span class="kico">📦</span><div class="lb">缺料</div><div class="v num">${stat('缺料')}<small>起</small></div><div class="sub">责任人：冯建军</div></div>
        <div class="kpi"><span class="kico">🔧</span><div class="lb">设备故障</div><div class="v num">${stat('设备故障')}<small>起</small></div><div class="sub">已联动 EAM 维修工单</div></div>
        <div class="kpi"><span class="kico">⚠</span><div class="lb">质量异常</div><div class="v num">${stat('质量异常')}<small>起</small></div><div class="sub">已触发 QMS 不合格流程</div></div>
      </div>
      <div class="filters">${['未关闭', 'closed', '全部'].map(f => `<button class="chip ${F === f ? 'on' : ''}" onclick="Admin._aFilter='${f}';App.refresh()">${f === 'closed' ? '已关闭' : f}</button>`).join('')}</div>
      <div class="grid g2">
        ${list.map(a => {
      const isRun = a.status !== 'closed';
      return `<div class="andon-card ${a.status}">
          <div class="flex sb" style="margin-bottom:8px">
            <b>${a.type === '缺料' ? '📦' : a.type === '设备故障' ? '🔧' : '⚠'} ${esc(a.type)} · ${a.order}</b>
            <span class="tag ${a.status === 'open' ? 'tag-danger' : a.status === 'responding' ? 'tag-warn' : 'tag-ok'}">${a.status === 'open' ? '待响应' : a.status === 'responding' ? '处理中' : '已消除'}</span>
          </div>
          <div class="mini mb">工位：${esc(a.station)} ｜ 呼叫人：${esc(a.caller)} ｜ ${esc(a.note)}</div>
          <div class="flex sb wrap">
            <div><span class="mini">已持续</span><br><span class="timer" data-tick="${a.start}" style="color:${a.status === 'open' ? 'var(--danger)' : 'var(--warn)'}">${ticking(a.start)}</span></div>
            <div><span class="mini">响应耗时</span><br><b class="num" style="font-size:.92rem">${a.respond ? durText(a.respond - a.start) : '—'}</b></div>
            <div><span class="mini">停线时长</span><br><b class="num" style="font-size:.92rem">${a.end ? durText(a.end - a.start) : '计时中'}</b></div>
            <div><span class="mini">处理人</span><br><b style="font-size:.92rem">${esc(a.handler || '待指派')}</b></div>
            <div class="flex" style="gap:6px">
              ${a.status === 'open' ? `<button class="btn btn-sm btn-w" onclick="Admin.respondDlg('${a.id}')">接单响应</button>` : ''}
              ${a.status === 'responding' ? `<button class="btn btn-sm btn-g" onclick="Admin.closeDlg('${a.id}')">消除关闭</button>` : ''}
              ${a.status === 'open' ? `<button class="btn btn-sm btn-o" onclick="UI.toast('已升级推送车间主任 王建国（企业微信）','warn')">升级推送</button>` : ''}
            </div>
          </div>
        </div>`; }).join('') || '<div class="empty" style="grid-column:1/-1"><div class="ico">✅</div>暂无异常，车间运行正常</div>'}
      </div>
      <div class="card mt"><div class="card-h"><div class="card-t">异常帕累托（近 30 日）</div></div><div class="card-b"><div id="andon-pareto"></div></div></div>`;
    Charts.pareto(document.getElementById('andon-pareto'), [
      { name: '缺料', value: 34 }, { name: '设备故障', value: 22 }, { name: '质量异常', value: 14 }, { name: '换型超时', value: 8 }, { name: '其他', value: 4 },
    ]);
    this.bindTimers(c);
  },
  respondDlg(id) {
    UI.modal({
      title: '接单响应', body: `<div class="form-row"><label>指派处理人</label><select id="rp-h">${DB.workers.filter(w => !['管理'].includes(w.team)).map(w => `<option value="${w.id}">${w.name} · ${w.role}</option>`).join('')}</select></div>`,
      footer: `<button class="btn btn-o" onclick="UI.closeModal()">取消</button><button class="btn btn-p" onclick="ACT.respondAndon('${id}',document.getElementById('rp-h').value);UI.closeModal();UI.toast('已接单，响应计时开始','ok')">确认接单</button>`,
    });
  },
  closeDlg(id) {
    UI.modal({
      title: '异常消除', body: `<div class="form-row"><label>处理说明</label><textarea id="cl-n" rows="2" placeholder="填写处理措施与结果"></textarea></div>`,
      footer: `<button class="btn btn-o" onclick="UI.closeModal()">取消</button><button class="btn btn-g" onclick="ACT.closeAndon('${id}',document.getElementById('cl-n').value);UI.closeModal();UI.toast('异常已消除关闭','ok')">确认关闭</button>`,
    });
  },

  /* ============ P10 追溯 ============ */
  rTrace(c) {
    c.innerHTML = `
      ${this.pageHead('正反向追溯', '序列号（关键件）/ 批次（一般件）双粒度 · 分钟级反查工序、人员、设备、工时、自检')}
      <div class="card mb"><div class="card-b">
        <div class="flex wrap">
          <input id="tr-q" placeholder="输入成品序列号（如 SN26A01001）或批次号（LOT-HT250-0928）" style="flex:1;min-width:220px">
          <button class="btn btn-p" onclick="Admin.doTrace()">🔍 查询</button>
          <button class="btn btn-o" onclick="document.getElementById('tr-q').value='SN26A01001';Admin.doTrace()">示例：SN26A01001</button>
        </div>
        <p class="mini mt">正向：批次 → 工单 → 序列号 → 客户 ｜ 反向：序列号 → 全工序档案（人/机/料/法/环）</p>
      </div></div>
      <div id="tr-result">${this._traceHTML || ''}</div>`;
    if (this._traceHTML) this.drawTrace(this._traceData);
  },
  doTrace() {
    const q = (document.getElementById('tr-q').value || '').trim().toUpperCase();
    if (!q) return UI.toast('请输入序列号或批次号', 'warn');
    const t = DB.traces.find(x => x.sn === q);
    if (t) { this._traceData = t; this._traceHTML = '<p class="mini mb">✓ 已匹配成品序列号，以下为<b>反向追溯</b>档案：</p>'; }
    else if (q.startsWith('LOT')) { this._traceData = DB.traces[0]; this._traceHTML = `<p class="mini mb">✓ 已匹配原材料批次（正向追溯）：该批次共用于 <b>1 张工单 · ${DB.traces.length} 个成品序列号</b>，发往 ${esc(DB.traces[0].customer)}。以下展示示例序列号档案：</p>`; }
    else { this._traceHTML = '<div class="empty"><div class="ico">🔍</div>未找到匹配记录，试试示例 SN26A01001</div>'; this._traceData = null; }
    App.refresh();
  },
  drawTrace(t) {
    const box = document.getElementById('tr-result'); if (!box || !t) return;
    const o = DB.orders.find(x => x.id === t.order);
    box.insertAdjacentHTML('beforeend', `
      <div class="grid g2">
        <div class="card"><div class="card-h"><div class="card-t">成品档案 · ${t.sn}</div><span class="tag tag-purple">反向追溯</span></div><div class="card-b">
          <div class="grid g2" style="gap:10px">
            <div class="qty-box"><label>产品</label><b style="font-size:.88rem">${esc(t.product)}</b></div>
            <div class="qty-box"><label>所属工单</label><b style="font-size:.9rem">${t.order}</b></div>
            <div class="qty-box"><label>原材料批次</label><b style="font-size:.88rem">${t.lot}</b></div>
            <div class="qty-box"><label>发货客户</label><b style="font-size:.88rem">${esc(t.customer)}</b></div>
          </div>
          <div class="tl mt">
            ${t.steps.map(s => `<div class="tl-i done"><b>${esc(s.name)}</b><div class="d">${esc(s.wc)} ｜ 操作人 ${esc(s.worker)} ｜ ${fmtDT(s.t)}${s.selfCheck ? `<br>自检：${esc(s.selfCheck.item)} = <b style="color:var(--ok)">${s.selfCheck.val}</b>（合格）` : ''}</div></div>`).join('')}
          </div>
        </div></div>
        <div class="card"><div class="card-h"><div class="card-t">工单级信息</div></div><div class="card-b">
          ${o ? `<div class="mrow"><div class="bd"><b>工单 ${o.id}</b><span>${esc(o.productId)} × ${o.qty} ｜ 状态 ${o.status} ｜ 合格 ${o.done} 不良 ${o.ng} 报废 ${o.scrap}</span></div></div>` : ''}
          <b style="font-size:.88rem;display:block;margin:12px 0 6px">同批次序列号（可点击）</b>
          <div class="flex wrap" style="gap:7px">
            ${DB.traces.map(x => `<button class="chip" style="${x.sn === t.sn ? 'background:var(--primary);color:#fff;border-color:var(--primary)' : ''}" onclick="document.getElementById('tr-q').value='${x.sn}';Admin.doTrace()">${x.sn}</button>`).join('')}
          </div>
          <b style="font-size:.88rem;display:block;margin:14px 0 6px">质量与设备联动</b>
          <div class="mini" style="line-height:2">
            ▪ 首件检验：合格（QMS 回传）<br>▪ 巡检 3 次：2 合格 1 让步接收<br>▪ 设备档案：VMC-850 / VMC-1060（EAM 台账）<br>▪ 关键尺寸自检：${t.steps.filter(s => s.selfCheck).length} 条记录，全部在公差内
          </div>
        </div></div>
      </div>`);
  },

  /* ============ P11 绩效 ============ */
  rPerf(c) {
    this._pTab = this._pTab || '个人';
    const tab = this._pTab;
    const teams = [...new Set(DB.workers.map(w => w.team))];
    c.innerHTML = `
      ${this.pageHead('班组与人员绩效', '产量 · 合格率 · 节拍达成 · 工时 · 技能矩阵，支持导出 Excel 作为计件工资依据', `<button class="btn btn-o" onclick="Admin.exportPerf()">⇩ 导出 Excel</button>`)}
      <div class="filters">${['个人', '班组'].map(f => `<button class="chip ${tab === f ? 'on' : ''}" onclick="Admin._pTab='${f}';App.refresh()">${f}</button>`).join('')}</div>
      ${tab === '个人' ? `
      <div class="card"><div class="card-b"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>员工</th><th>班组</th><th>岗位</th><th>今日产出</th><th>工时(h)</th><th>UPH</th><th>合格率</th><th>技能矩阵</th><th>资质</th></tr></thead><tbody>
        ${DB.workers.map(w => `<tr><td class="rowlink" data-l="员工"><span class="flex" style="gap:8px"><span class="avatar" style="width:26px;height:26px;font-size:.7rem">${esc(w.name[0])}</span>${esc(w.name)}</span></td>
        <td data-l="班组">${esc(w.team)}</td><td data-l="岗位">${esc(w.role)}</td><td class="num" data-l="产出">${w.out} 件</td><td class="num" data-l="工时">${w.hours}</td><td class="num" data-l="UPH">${Math.round(w.out / w.hours)}</td>
        <td data-l="合格率"><span class="tag ${w.passRate >= 99 ? 'tag-ok' : w.passRate >= 97 ? 'tag-warn' : 'tag-danger'}">${w.passRate}%</span></td>
        <td data-l="技能">${w.skills.map(s => `<span class="tag tag-purple">${esc(s)}</span>`).join(' ')}</td>
        <td data-l="资质" class="mini">${w.cert.length ? esc(w.cert.join('、')) : '—'}</td></tr>`).join('')}
      </tbody></table></div></div></div>` : `
      <div class="grid g2">
        ${teams.filter(t => t !== '管理' && t !== '仓储' && t !== '设备').map(t => {
      const ws = DB.workers.filter(w => w.team === t);
      const out = ws.reduce((s, w) => s + w.out, 0), hrs = ws.reduce((s, w) => s + w.hours, 0);
      const pr = Math.round(ws.reduce((s, w) => s + w.passRate, 0) / ws.length);
      return `<div class="card"><div class="card-h"><div class="card-t">${esc(t)}</div><span class="tag ${pr >= 99 ? 'tag-ok' : 'tag-warn'}">合格率 ${pr}%</span></div><div class="card-b">
          <div class="grid g3" style="gap:10px"><div class="qty-box"><label>班组产出</label><b class="num">${out}</b></div><div class="qty-box"><label>总工时</label><b class="num">${hrs.toFixed(1)}h</b></div><div class="qty-box"><label>人均UPH</label><b class="num">${Math.round(out / hrs / ws.length)}</b></div></div>
          <p class="mini mt">成员：${ws.map(w => esc(w.name)).join('、')} ｜ 异常响应均时 ${rnd(6, 14)} 分钟 ｜ 节拍达成 ${rnd(82, 97)}%</p>
        </div></div>`; }).join('')}
      </div>`}`;
  },
  exportPerf() {
    const head = '姓名,班组,岗位,今日产出,工时,合格率\n';
    const csv = '\ufeff' + head + DB.workers.map(w => [w.name, w.team, w.role, w.out, w.hours, w.passRate + '%'].join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'MES绩效_' + new Date().toISOString().slice(0, 10) + '.csv'; a.click();
    UI.toast('已导出 Excel（CSV）', 'ok');
  },

  /* ============ P13 报表中心 ============ */
  rReport(c) {
    this._rTab = this._rTab || '生产日报';
    const tab = this._rTab;
    const plan = todayPlan(), done = todayOut();
    c.innerHTML = `
      ${this.pageHead('报表中心', '生产日报 / 周报 · 工单履约 · 停线损失 · 换型趋势，支持 Excel 导出（审厂 / 审计）', `<button class="btn btn-o" onclick="UI.toast('报表已导出 Excel（CSV），可直接用 Office 打开','ok')">⇩ 导出报表</button>`)}
      <div class="filters">${['生产日报', '履约率', '停线损失'].map(f => `<button class="chip ${tab === f ? 'on' : ''}" onclick="Admin._rTab='${f}';App.refresh()">${f}</button>`).join('')}</div>
      ${tab === '生产日报' ? `
      <div class="grid g3 mb">
        <div class="card tc"><div class="card-b"><p class="muted">计划 / 实际</p><b class="num" style="font-size:1.7rem;background:linear-gradient(90deg,var(--primary),var(--blue));-webkit-background-clip:text;background-clip:text;color:transparent">${done} / ${plan}</b><p class="mini">达成率 ${Math.round(done / plan * 100)}%</p></div></div>
        <div class="card tc"><div class="card-b"><p class="muted">综合 OEE</p><b class="num" style="font-size:1.7rem;color:var(--primary)">87.6%</b><p class="mini">可用 92.2% × 性能 95.1% × 质量 99.7%</p></div></div>
        <div class="card tc"><div class="card-b"><p class="muted">直通率 FTQ</p><b class="num" style="font-size:1.7rem;color:var(--ok)">98.4%</b><p class="mini">不良 ${DB.orders.reduce((s, o) => s + o.ng, 0)} · 报废 ${DB.orders.reduce((s, o) => s + o.scrap, 0)}</p></div></div>
      </div>
      <div class="grid g2">
        <div class="card"><div class="card-h"><div class="card-t">近 7 日产出趋势</div></div><div class="card-b"><div id="rp-trend"></div></div></div>
        <div class="card"><div class="card-h"><div class="card-t">今日各 Cell 产出</div></div><div class="card-b"><div id="rp-cells"></div></div></div>
      </div>
      <div class="card mt"><div class="card-h"><div class="card-t">生产日报表</div><span class="mini">数据截至 ${fmtTime(NOW())}</span></div><div class="card-b"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>工单</th><th>产品</th><th>Cell</th><th>计划</th><th>完成</th><th>不良</th><th>报废</th><th>达成率</th><th>状态</th></tr></thead><tbody>
        ${DB.orders.map(o => `<tr><td data-l="工单" class="rowlink" onclick="Admin.orderDetail('${o.id}')">${o.id}</td><td data-l="产品">${esc(o.productId)}</td><td data-l="Cell">${esc((DB.cells.find(x => x.id === o.cellId) || { name: '—' }).name)}</td><td class="num" data-l="计划">${o.qty}</td><td class="num" data-l="完成">${o.done}</td><td class="num" data-l="不良">${o.ng}</td><td class="num" data-l="报废">${o.scrap}</td><td data-l="达成"><b class="num" style="color:${orderProgress(o) >= 90 ? 'var(--ok)' : 'var(--text)'}">${orderProgress(o)}%</b></td><td data-l="状态">${statusTag(o.status)}</td></tr>`).join('')}
      </tbody></table></div></div></div>` : tab === '履约率' ? `
      <div class="card"><div class="card-h"><div class="card-t">工单履约率（按月）</div></div><div class="card-b"><div id="rp-ful"></div></div></div>
      <div class="card mt"><div class="card-b"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>月份</th><th>应交工单</th><th>准时交付</th><th>履约率</th><th>主要延误原因</th></tr></thead><tbody>
        ${[['2026-07', 86, 79], ['2026-08', 92, 86], ['2026-09', 88, 84], ['2026-10', 34, 31]].map(r => `<tr><td data-l="月份"><b>${r[0]}</b></td><td class="num" data-l="应交">${r[1]}</td><td class="num" data-l="准时">${r[2]}</td><td data-l="履约"><span class="tag ${r[2] / r[1] >= .9 ? 'tag-ok' : 'tag-warn'}">${Math.round(r[2] / r[1] * 100)}%</span></td><td data-l="原因" class="mini">外协热处理回厂延迟 / 插单重排</td></tr>`).join('')}
      </tbody></table></div></div></div>` : `
      <div class="grid g2">
        <div class="card"><div class="card-h"><div class="card-t">停线损失（分钟，近一周）</div></div><div class="card-b"><div id="rp-loss"></div></div></div>
        <div class="card"><div class="card-h"><div class="card-t">换型时间趋势（SMED）</div></div><div class="card-b"><div id="rp-smed"></div></div></div>
      </div>`}`;
    if (tab === '生产日报') {
      Charts.line(document.getElementById('rp-trend'), ['10/04', '10/05', '10/06', '10/07', '10/08', '10/09', '今日'],
        [{ name: '实际产出', color: '#7C3AED', data: [1180, 1320, 1260, 640, 1410, 1380, done] }, { name: '计划', color: '#2563EB', data: [1300, 1300, 1300, 650, 1350, 1350, plan], dash: true }], { height: 210, area: true, legend: true });
      Charts.bars(document.getElementById('rp-cells'), DB.cells.map(x => x.name.replace('机加 ', '').replace('装配 ', '').replace(' Cell', '')), DB.cells.map(x => (DB.taktLog[x.id] || []).reduce((s, y) => s + y.out, 0)), { height: 210, colors: ['#7C3AED', '#8B5CF6', '#2563EB', '#3B82F6', '#60A5FA'] });
    } else if (tab === '履约率') {
      Charts.line(document.getElementById('rp-ful'), ['7月', '8月', '9月', '10月'], [{ name: '履约率 %', color: '#7C3AED', data: [92, 93, 95, 91] }], { height: 220, max: 100, area: true });
    } else {
      Charts.bars(document.getElementById('rp-loss'), ['周一', '周二', '周三', '周四', '周五', '周六'], [52, 38, 66, 24, 45, 18], { height: 210, color: '#EF4444' });
      Charts.line(document.getElementById('rp-smed'), ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'], [{ name: '平均换型 min', color: '#F59E0B', data: [42, 38, 35, 31, 29, 28] }], { height: 210, area: true });
    }
  },

  /* ============ P04 工艺路线 ============ */
  rRouting(c) {
    this._rtSel = this._rtSel || DB.routings[0].id;
    const r = DB.routings.find(x => x.id === this._rtSel);
    c.innerHTML = `
      ${this.pageHead('工艺路线配置', '工序顺序 · 标准工时 · 换型准备 · 资源绑定 · E-SOP · 版本管理', `<button class="btn btn-p" onclick="Admin.addStepDlg('${r.id}')">＋ 添加工序</button>`)}
      <div class="filters">${DB.routings.map(x => `<button class="chip ${x.id === r.id ? 'on' : ''}" onclick="Admin._rtSel='${x.id}';App.refresh()">${esc(x.name)} ${x.version}</button>`).join('')}</div>
      <div class="grid g3 mb">
        <div class="qty-box"><label>产品</label><b style="font-size:.95rem">${esc(r.product)}</b></div>
        <div class="qty-box"><label>工序数</label><b class="num">${r.steps.length} 道</b></div>
        <div class="qty-box"><label>版本（变更留痕）</label><b class="num">${esc(r.version)}</b></div>
      </div>
      ${r.steps.map(s => `<div class="rstep">
        <div class="seq">${s.seq}</div>
        <div class="bd">
          <div class="flex sb"><b>${esc(s.name)}${s.name.includes('外协') ? '<span class="tag tag-warn">外协</span>' : ''}</b>
          <button class="btn btn-sm btn-o" onclick="ACT.delRoutingStep('${r.id}',${s.seq});UI.toast('已删除工序 ${s.seq}（版本已升级）','warn')">删除</button></div>
          <div class="meta"><span>📍 工作中心：${esc(s.wc)}</span><span>⏱ 标准工时 ${s.stdHours}h</span><span>🔄 换型 ${s.setupMin}min</span><span>🔧 ${esc(s.res)}</span></div>
          <div class="mini mt" style="line-height:1.7">📖 E-SOP：${esc(s.sop)}</div>
        </div>
      </div>`).join('')}`;
  },
  addStepDlg(rid) {
    UI.modal({
      title: '添加工序',
      body: `<div class="form-row"><label>工序号</label><input id="as-seq" type="number" value="${(DB.routings.find(x => x.id === rid).steps.at(-1)?.seq || 0) + 10}"></div>
        <div class="form-row"><label>工序名称</label><input id="as-name" placeholder="如：去毛刺"></div>
        <div class="form-row"><label>工作中心</label><input id="as-wc" placeholder="如：OP30 精铣"></div>
        <div class="grid g2" style="gap:10px"><div class="form-row"><label>标准工时 (h)</label><input id="as-h" type="number" step="0.1" value="0.5"></div>
        <div class="form-row"><label>换型准备 (min)</label><input id="as-su" type="number" value="20"></div></div>
        <div class="form-row"><label>绑定资源</label><input id="as-res" placeholder="设备 / 工装 / 人员资质"></div>`,
      footer: `<button class="btn btn-o" onclick="UI.closeModal()">取消</button><button class="btn btn-p" onclick="Admin.addStep('${rid}')">保存（版本自动升级）</button>`,
    });
  },
  addStep(rid) {
    const seq = +document.getElementById('as-seq').value, name = document.getElementById('as-name').value.trim();
    if (!name) return UI.toast('请填写工序名称', 'warn');
    ACT.addRoutingStep(rid, { seq, name, wc: document.getElementById('as-wc').value || '待分配', stdHours: +document.getElementById('as-h').value || 0.5, setupMin: +document.getElementById('as-su').value || 0, res: document.getElementById('as-res').value || '—', sop: '待补充作业指导书内容。' });
    UI.closeModal(); UI.toast('工序已添加，工艺路线版本已升级', 'ok');
  },

  /* ============ P12 主数据 ============ */
  rMaster(c) {
    this._mTab = this._mTab || '物料/BOM';
    const t = this._mTab;
    c.innerHTML = `
      ${this.pageHead('主数据管理', '物料 / BOM / 班次 / 人员 / 班组 —— 与 ERP 单向同步，MES 内只读 + 补充维护')}
      <div class="filters">${['物料/BOM', '班组/班次', '人员'].map(f => `<button class="chip ${t === f ? 'on' : ''}" onclick="Admin._mTab='${f}';App.refresh()">${f}</button>`).join('')}</div>
      <div class="card"><div class="card-b">
      ${t === '物料/BOM' ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>物料编码</th><th>名称</th><th>规格</th><th>单位</th><th>当前库存</th><th>齐套状态</th></tr></thead><tbody>
        ${DB.materials.map(m => `<tr><td data-l="编码" class="rowlink">${m.code}</td><td data-l="名称">${esc(m.name)}</td><td data-l="规格" class="mini">${esc(m.spec)}</td><td data-l="单位">${m.unit}</td><td class="num" data-l="库存">${m.stock.toLocaleString()}</td><td data-l="齐套"><span class="tag ${m.stock > 500 ? 'tag-ok' : m.stock > 150 ? 'tag-warn' : 'tag-danger'}">${m.stock > 500 ? '齐套' : m.stock > 150 ? '预警' : '告急'}</span></td></tr>`).join('')}
      </tbody></table></div>
      <p class="mini mt">▸ 主控芯片 STM32F103 库存仅 ${DB.materials[3].stock} 颗，低于安全库存 300，已推送采购（ERP）。</p>`
        : t === '班组/班次' ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>班次</th><th>时间</th><th>带班长</th><th>在岗人数</th><th>状态</th></tr></thead><tbody>
        ${DB.shifts.map(s => `<tr><td data-l="班次"><b>${esc(s.name)}</b></td><td data-l="时间">${s.time}</td><td data-l="带班长">${esc(s.leader)}</td><td class="num" data-l="人数">${DB.workers.filter(w => w.team !== '管理').length}</td><td data-l="状态"><span class="tag ${s.id === 'S1' ? 'tag-ok' : 'tag-gray'}">${s.id === 'S1' ? '在岗' : '待开班'}</span></td></tr>`).join('')}
        ${DB.cells.map(cell => `<tr><td data-l="班次"><b>${esc(cell.name)}</b></td><td data-l="时间">随班次</td><td data-l="带班长">${esc(pick(DB.workers.filter(w => w.role === '班组长')).name)}</td><td class="num" data-l="人数">${cell.stations.length} 工位</td><td data-l="状态"><span class="tag tag-info">运行中</span></td></tr>`).join('')}
      </tbody></table></div>`
        : `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>姓名</th><th>角色</th><th>班组</th><th>技能</th><th>资质证书</th></tr></thead><tbody>
        ${DB.workers.map(w => `<tr><td data-l="姓名" class="rowlink"><span class="flex" style="gap:8px"><span class="avatar" style="width:26px;height:26px;font-size:.7rem">${esc(w.name[0])}</span>${esc(w.name)}</span></td><td data-l="角色">${esc(w.role)}</td><td data-l="班组">${esc(w.team)}</td><td data-l="技能">${w.skills.map(s => `<span class="tag tag-purple">${esc(s)}</span>`).join(' ')}</td><td data-l="资质" class="mini">${esc(w.cert.join('、') || '—')}</td></tr>`).join('')}
      </tbody></table></div>`}
      </div></div>`;
  },

  /* ============ P09 异常规则 ============ */
  rRules(c) {
    c.innerHTML = `
      ${this.pageHead('异常规则配置', '低代码配置：异常类型 · 责任人 · 升级规则 · 联动 QMS/EAM —— 不改代码')}
      <div class="card mb"><div class="card-b"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>异常类型</th><th>默认责任人</th><th>响应时限</th><th>超时升级</th><th>外部联动</th><th>状态</th></tr></thead><tbody>
      ${DB.andonTypes.map(a => `<tr><td data-l="类型"><b>${esc(a.name)}</b></td><td data-l="责任人">${esc(a.owner)}</td><td data-l="时限">${a.escalateMin} 分钟</td><td data-l="升级">车间主任 王建国</td><td data-l="联动" class="mini">${a.id === 'A3' ? 'QMS 不合格流程' : a.id === 'A2' ? 'EAM 维修工单' : 'WMS 补料单'}</td><td data-l="状态"><span class="tag tag-ok">启用</span></td></tr>`).join('')}
      </tbody></table></div></div></div>
      <div class="grid g2">
        <div class="card"><div class="card-h"><div class="card-t">推送渠道</div></div><div class="card-b">
          ${[['企业微信应用号', true], ['钉钉机器人', false], ['短信（超时升级）', true], ['车间广播', false]].map(x => `<div class="mrow"><div class="bd"><b>${x[0]}</b></div><span class="tag ${x[1] ? 'tag-ok' : 'tag-gray'}">${x[1] ? '已启用' : '未启用'}</span></div>`).join('')}
        </div></div>
        <div class="card"><div class="card-h"><div class="card-t">升级链</div></div><div class="card-b">
          <div class="tl"><div class="tl-i done"><b>T+0 工位呼叫</b><div class="d">推送班组长 + 责任人（企业微信）</div></div>
          <div class="tl-i done"><b>T+${DB.andonTypes[0].escalateMin}min 未响应 → 升级</b><div class="d">推送车间主任，短信提醒</div></div>
          <div class="tl-i"><b>T+30min 未消除 → 再升级</b><div class="d">推送厂长 + 停线损失自动计入日报</div></div></div>
        </div></div>
      </div>`;
  },

  /* ============ P15 ERP 对接 ============ */
  rErp(c) {
    const logs = [
      ['10:42:18', '用友 U8', '工单同步', 'WO-2610-008 下发成功', 'ok'],
      ['10:15:03', '用友 U8', '入库回写', 'WO-2610-001 完工入库 200 件过账', 'ok'],
      ['09:58:47', '金蝶 K3', '工单同步', 'WO-2610-007 下发成功', 'ok'],
      ['09:30:12', '用友 U8', '齐套检查', 'WO-2610-004 缺 HT250 毛坯 75 件 → 已生成补料单', 'warn'],
      ['08:02:00', '用友 U8', 'BOM 同步', '减速器壳体 JSQ-220 BOM V3.2 更新', 'ok'],
    ];
    c.innerHTML = `
      ${this.pageHead('ERP 对接配置', '标准连接器优先（用友 / 金蝶 / 鼎捷）· 其余走中间表 · 同步日志留痕')}
      <div class="grid g3 mb">
        ${[['用友 U8', '已连接 · API 实时', true], ['金蝶 K3', '已连接 · API 实时', true], ['鼎捷 E10', '未配置 · 走中间表', false]].map(x => `
        <div class="card tc"><div class="card-b"><b style="font-size:1.05rem">${x[0]}</b><p class="mini mt">${x[1]}</p><div class="mt"><span class="tag ${x[2] ? 'tag-ok' : 'tag-gray'}">${x[2] ? '● 在线' : '○ 离线'}</span></div></div></div>`).join('')}
      </div>
      <div class="grid g2">
        <div class="card"><div class="card-h"><div class="card-t">同步范围</div></div><div class="card-b">
          ${[['生产工单下发（ERP → MES）', true], ['BOM / 物料同步（ERP → MES）', true], ['完工入库回写（MES → ERP）', true], ['实际工时回传（MES → ERP）', true], ['领料需求 / 齐套状态（WMS）', true]].map(x => `<div class="mrow"><div class="bd"><b>${x[0]}</b></div><span class="tag tag-ok">✓</span></div>`).join('')}
        </div></div>
        <div class="card"><div class="card-h"><div class="card-t">今日同步日志</div></div><div class="card-b" style="padding-top:.4rem">
          ${logs.map(l => `<div class="mrow"><div class="bd"><b style="font-size:.84rem">${l[1]} · ${l[2]}</b><span>${l[3]}</span></div><div class="rt"><b style="font-size:.74rem;color:var(--text3)">${l[0]}</b><span class="tag ${l[4] === 'ok' ? 'tag-ok' : 'tag-warn'}" style="margin-top:3px">${l[4] === 'ok' ? '成功' : '提醒'}</span></div></div>`).join('')}
        </div></div>
      </div>`;
  },

  /* ============ P14 权限组织 ============ */
  rAuth(c) {
    const roles = [
      ['车间主任', '工单派工 / 进度监控 / 异常调度 / 日清会', 1],
      ['班组长', '派工到工位 / 确认开工 / 报工审核', 2],
      ['工位操作工', '接收工单 / 扫码开工 / 报工 / 异常呼叫', 6],
      ['计划员 PMC', '工单进度 / 插单评估 / 交期答复', 1],
      ['工艺工程师', '工艺路线 / 工时 / SOP / 节拍标准', 1],
      ['厂领导', '车间大屏 / 交期 / 产能负荷 / 异常总览（只读）', 1],
    ];
    c.innerHTML = `
      ${this.pageHead('权限与组织', '角色权限 · 账号管理 · 车间班组 · 操作日志')}
      <div class="card mb"><div class="card-b"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>角色</th><th>权限范围</th><th>账号数</th></tr></thead><tbody>
        ${roles.map(r => `<tr><td data-l="角色"><b>${r[0]}</b></td><td data-l="权限" class="mini" style="white-space:normal">${r[1]}</td><td class="num" data-l="账号">${r[2]}</td></tr>`).join('')}
      </tbody></table></div></div></div>
      <div class="grid g2">
        <div class="card"><div class="card-h"><div class="card-t">组织架构</div></div><div class="card-b mini" style="line-height:2.2">
          ▪ 一号车间（车间主任：王建国）<br>
          &nbsp;&nbsp;├ 机加一班（班组长：李铁柱）→ 机加 Cell-A / Cell-B<br>
          &nbsp;&nbsp;├ 装配二班（班组长：赵德芳）→ 装配 Cell-A / Cell-B<br>
          &nbsp;&nbsp;├ 电子一班 → 电子装配 Cell<br>
          &nbsp;&nbsp;├ 仓储（物料员：冯建军）<br>
          &nbsp;&nbsp;└ 设备组（工程师：钱国栋）
        </div></div>
        <div class="card"><div class="card-h"><div class="card-t">操作日志（今日）</div></div><div class="card-b" style="padding-top:.4rem">
          ${[['王建国', '恢复暂停工单 WO-2610-004', '10:38'], ['李铁柱', '派工 WO-2610-005 → 电子装配 Cell', '09:47'], ['周丽华', '接单 Andon AN-103（质量异常）', '09:32'], ['何桂英', '确认插单 WO-2610-003 交期评估', '09:12'], ['admin', '调整 Cell-A 节拍标准 95s→90s', '08:30']].map(l => `<div class="mrow"><div class="bd"><b>${l[0]}</b><span>${esc(l[1])}</span></div><span class="mini">${l[2]}</span></div>`).join('')}
        </div></div>
      </div>`;
  },

  /* Andon 计时刷新 */
  bindTimers(scope) {
    const nodes = scope.querySelectorAll('[data-tick]');
    if (!nodes.length) return;
    Timers.clear();
    nodes.forEach(n => Timers.add(() => { n.textContent = ticking(+n.getAttribute('data-tick')); }));
  },
};
