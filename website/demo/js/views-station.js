/* ============================================================
 * MES 平台 —— 工位平板 / PDA（M01-M06）
 * 设计要求：按钮 ≤3 个、≥48px、大字体高对比、戴手套可操作
 * ============================================================ */
'use strict';

const Station = {
  cur: null,          // 当前登录工人 {id,name,...}
  selOrder: null,     // 当前选中工单
  qty: { ok: 0, ng: 0, sc: 0 },
  offline: false,     // 模拟离线（M06）

  render(root, sub) {
    if (!this.cur) return this.rLogin(root);
    if (sub === 'andon') return this.rAndon(root);
    if (this.selOrder && sub === 'task') return this.rTask(root);
    return this.rTasks(root);
  },

  head(title, sub, back) {
    return `<div class="st-head">
      ${back ? `<button class="back" onclick="Station.back('${back}')">‹</button>` : '<div style="width:40px"></div>'}
      <div class="tt"><b>${title}</b><span>${sub}</span></div>
      <div class="st-net" onclick="Station.toggleNet()">${this.offline ? '⛔ 离线模式' : '🟢 在线'}</div>
    </div>`;
  },

  toggleNet() {
    this.offline = !this.offline;
    UI.toast(this.offline ? '已模拟断网：报工将本地缓存，恢复网络后自动续传' : '网络恢复：缓存数据已同步（' + rnd(2, 5) + ' 条）', this.offline ? 'warn' : 'ok');
    App.refresh();
  },

  back(to) {
    this.selOrder = null;
    Route.go(to || '/station');
  },

  /* ---------- M01 登录与今日任务 ---------- */
  rLogin(root) {
    root.innerHTML = `
    <div class="station">
      <div class="st-head"><div style="width:40px"></div><div class="tt"><b>工位作业终端</b><span>M01 ｜ 工号登录 / 扫码登录</span></div><div class="st-net">🟢 在线</div></div>
      <div class="st-body">
        <div class="card tc" style="padding:34px 22px;border-radius:22px">
          <div style="font-size:2.6rem">👷</div>
          <h2 style="margin:10px 0 4px">选择我的工号</h2>
          <p class="muted mb">也可使用扫码枪扫描工牌二维码登录</p>
          ${DB.workers.filter(w => ['操作工', '班组长'].includes(w.role)).map(w => `
            <button class="btn btn-o btn-lg" style="width:100%;margin-bottom:10px;justify-content:flex-start;font-size:1.05rem" onclick="Station.login('${w.id}')">
              <span class="avatar" style="width:38px;height:38px">${esc(w.name[0])}</span> ${esc(w.name)} · ${esc(w.team)}
            </button>`).join('')}
          <button class="btn btn-p btn-lg" style="width:100%" onclick="UI.toast('扫码枪已就绪，请扫描工牌','ok')">📷 扫码登录</button>
        </div>
      </div>
    </div>`;
  },
  login(id) {
    this.cur = DB.workers.find(w => w.id === id);
    UI.toast('欢迎，' + this.cur.name + '（' + this.cur.team + '）', 'ok');
    Route.go('/station');
  },
  logout() { this.cur = null; this.selOrder = null; Route.go('/station'); },

  /* ---------- 我的任务列表 ---------- */
  rTasks(root) {
    const mine = DB.orders.filter(o => o.cellId && (o.status === '在制' || o.status === '暂停' || o.status === '已派工' || (o.status === '报工确认' && o.stock !== '已入库')));
    const wip = wipByCell();
    root.innerHTML = `
    <div class="station">
      ${this.head('今日任务', `${this.cur.team} · ${this.cur.name} ｜ ${fmtDate(NOW())}`)}
      <div class="st-body">
        <div class="st-worker">
          <span class="avatar">${esc(this.cur.name[0])}</span>
          <div><div class="nm">${esc(this.cur.name)}</div><div class="meta">${esc(this.cur.role)} · 技能：${this.cur.skills.join('/')}</div></div>
          <button class="st-logout" onclick="Station.logout()">退出</button>
        </div>
        <div class="grid g2 mb" style="gap:10px">
          <div class="qty-box ok"><label>我的任务</label><b class="num" style="font-size:1.3rem">${mine.length} 张</b></div>
          <div class="qty-box ng"><label>进行中异常</label><b class="num" style="font-size:1.3rem;color:var(--danger)">${openAndon().length}</b></div>
        </div>
        <button class="andon-big device" style="margin-bottom:14px;padding:18px;width:100%" onclick="Route.go('/station/andon')">
          <span class="i">🆘</span>Andon 异常呼叫
        </button>
        <b style="font-size:1rem">任务队列（${mine.length}）</b>
        <div class="mt">
          ${mine.map(o => {
      const cell = (DB.cells.find(x => x.id === o.cellId) || {}).name;
      const doing = o.status === '在制' || o.status === '暂停';
      return `<div class="task-card" onclick="Station.openTask('${o.id}')">
            <div class="r1"><b>${o.id}</b>${statusTag(o.status)}</div>
            <div class="r2">${esc(o.productId)} × ${o.qty} ｜ ${esc(cell || '')} ｜ 交期 ${fmtDate(o.due)}</div>
            <div class="bar ${o.status === '暂停' ? 'danger' : orderProgress(o) === 100 ? 'ok' : ''}"><i style="width:${orderProgress(o)}%"></i></div>
            <div class="flex sb" style="margin-top:7px"><span class="mini">已完成 ${o.done}/${o.qty} 件</span><span class="mini">${doing ? '当前：' + esc(o.steps[o.currentStep].name) : '待开工'}</span></div>
          </div>`; }).join('') || '<div class="empty"><div class="ico">🎉</div>暂无任务，请等待班组长派工</div>'}
        </div>
        <p class="mini tc mt">M06 ｜ 网络状态：${this.offline ? '<b style="color:var(--danger)">离线（报工本地缓存，未同步 2 条）</b>' : '已连接车间 AP · 未同步 0 条'}</p>
      </div>
    </div>`;
  },

  openTask(id) { this.selOrder = id; this.qty = { ok: 0, ng: 0, sc: 0 }; Route.go('/station/task'); },

  /* ---------- M02 开工 / 报工 / 转序 + M05 自检 ---------- */
  rTask(root) {
    const o = DB.orders.find(x => x.id === this.selOrder);
    if (!o) { this.selOrder = null; return this.rTasks(root); }
    const cs = o.steps[o.currentStep];
    const rt = DB.routings.find(r => r.id === o.routingId);
    const sop = rt.steps[o.currentStep].sop;
    const started = cs.status === 'doing' || cs.status === 'pause';
    root.innerHTML = `
    <div class="station">
      ${this.head(`${o.id} · ${esc(cs.name)}`, `${esc(o.productId)} × ${o.qty} ｜ 工序 ${o.currentStep + 1}/${o.steps.length}`, '/station')}
      <div class="st-body">
        <div class="task-card" style="cursor:default">
          <div class="r1"><b>${esc(cs.name)} <span class="mini">${esc(rt.steps[o.currentStep].res)}</span></b>${statusTag(o.status)}</div>
          <div class="bar ${o.status === '暂停' ? 'danger' : ''}" style="margin:10px 0"><i style="width:${orderProgress(o)}%"></i></div>
          <div class="flex sb"><span class="mini">计划 ${o.qty} · 已完成 ${o.done} 件</span><span class="mini">${cs.startAt ? '开工 ' + fmtTime(cs.startAt) : '未开工'}${cs.worker ? ' · ' + esc(cs.worker) : ''}</span></div>
        </div>

        ${o.status === '暂停' ? `
          <div class="card tc" style="padding:14px;margin-bottom:12px;border:2px solid var(--danger)">
            <b style="color:var(--danger)">⏸ 已暂停：${esc(o.pauseReason)}</b>
            <button class="btn btn-g btn-lg mt" style="width:100%" onclick="ACT.resume('${o.id}');UI.toast('已恢复计时','ok')">▶ 续作（恢复计时）</button>
          </div>` : ''}

        <div class="st-btns">
          <button class="st-bigbtn go" ${started ? 'disabled' : ''} onclick="ACT.start('${o.id}','${this.cur.id}');UI.toast('开工成功，计时开始','ok')"><span class="i">▶</span>开工</button>
          <button class="st-bigbtn fin" onclick="Station.submitReport()"><span class="i">✓</span>完工报工</button>
          <button class="st-bigbtn ando" onclick="Route.go('/station/andon')"><span class="i">🆘</span>异常呼叫</button>
        </div>
        <div class="st-btns" style="margin-top:0">
          <button class="st-bigbtn pz" ${started && o.status !== '暂停' ? '' : 'disabled'} onclick="Station.pauseDlg('${o.id}')"><span class="i">⏸</span>暂停</button>
          <button class="st-bigbtn rz" ${cs.done > 0 ? '' : 'disabled'} onclick="ACT.transfer('${o.id}');UI.toast('已转序下道工序','ok')"><span class="i">⇢</span>转序</button>
          <button class="st-bigbtn" style="background:linear-gradient(135deg,#475569,#64748B)" onclick="UI.toast('扫码头已就绪','ok')"><span class="i">📷</span>扫码</button>
        </div>

        <b style="font-size:1rem">数量报工（M02）</b>
        <div class="qty-pad mt mb">
          <div class="qty-box ok"><label>合格数</label><input type="number" inputmode="numeric" value="${this.qty.ok}" oninput="Station.qty.ok=+this.value||0"></div>
          <div class="qty-box ng"><label>不良数</label><input type="number" inputmode="numeric" value="${this.qty.ng}" oninput="Station.qty.ng=+this.value||0"></div>
          <div class="qty-box sc"><label>报废数</label><input type="number" inputmode="numeric" value="${this.qty.sc}" oninput="Station.qty.sc=+this.value||0"></div>
        </div>
        <button class="st-submit" onclick="Station.submitReport()">提交报工（默认按件扫码 / 批量录入）</button>

        <div class="st-timeline">
          <b style="font-size:.95rem">✅ 自检记录（M05）</b>
          <div class="form-row mt"><label>关键尺寸：142 ± 0.05 mm</label><input type="text" inputmode="decimal" placeholder="输入实测值，如 141.98" id="sc-val" style="font-size:1.2rem;font-weight:700;text-align:center"></div>
          <button class="btn btn-p btn-lg" style="width:100%" onclick="Station.selfCheck()">记录自检 + 拍照</button>
          ${cs.selfCheck.length ? cs.selfCheck.map(s => `<p class="mini mt">▪ ${fmtTime(s.t)} 实测 <b>${s.val}</b>（${s.ok ? '<span style="color:var(--ok)">合格</span>' : '<span style="color:var(--danger)">超差</span>'}）已拍照存档</p>`).join('') : ''}
        </div>

        <div class="sop-box mt" id="sop">
          <b style="font-size:.95rem">📖 E-SOP 作业指导书（M03 · 扫码自动调出）</b>
          <p class="mini" style="margin:6px 0 2px">版本 ${esc(rt.version)} ｜ ${esc(rt.steps[o.currentStep].res)} ｜ 标准工时 ${rt.steps[o.currentStep].stdHours}h</p>
          <div class="step"><span class="no">1</span><span>${esc(sop)}</span></div>
          <div class="step"><span class="no">2</span><span>作业前确认工装夹具到位，首件送检合格后方可批量加工。</span></div>
          <div class="step"><span class="no">3</span><span>每 50 件抽检 1 件，超差立即呼叫班组长（质量异常 Andon）。</span></div>
          <div class="tc mt"><button class="btn btn-o btn-lg" onclick="UI.toast('已打开 SOP 视频讲解（演示）','ok')">▶ 查看视频版 SOP</button></div>
        </div>

        <div class="st-timeline">
          <b style="font-size:.95rem">🕘 工序时间线</b>
          <div class="tl mt">
            ${o.timeline.slice(-4).reverse().map(t => `<div class="tl-i done"><b style="font-size:.86rem">${esc(t.text)}</b><div class="d">${fmtDT(t.t)}</div></div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  },

  submitReport() {
    const o = DB.orders.find(x => x.id === this.selOrder); if (!o) return;
    const q = this.qty;
    if (this.offline) return UI.toast('离线状态：报工已写入本地缓存，恢复网络自动续传（M06）', 'warn');
    if (q.ok + q.ng + q.sc === 0) return UI.toast('请先录入合格/不良/报废数量', 'warn');
    if (!o.steps[o.currentStep].startAt) { ACT.start(o.id, this.cur.id); }
    ACT.report(o.id, q.ok, q.ng, q.sc);
    this.qty = { ok: 0, ng: 0, sc: 0 };
    const o2 = DB.orders.find(x => x.id === this.selOrder);
    UI.toast(o2.status === '报工确认' ? '报工成功，工单完工，已触发入库回写 ERP' : '报工成功：合格 ' + q.ok + ' 件', 'ok');
  },

  selfCheck() {
    const v = parseFloat(document.getElementById('sc-val').value);
    if (isNaN(v)) return UI.toast('请输入实测值', 'warn');
    const o = DB.orders.find(x => x.id === this.selOrder);
    const cs = o.steps[o.currentStep];
    cs.selfCheck.push({ t: NOW(), val: v, ok: v >= 141.95 && v <= 142.05 });
    saveDB(); App.refresh();
    UI.toast(v >= 141.95 && v <= 142.05 ? '自检合格，已记录' : '⚠ 实测值超差，已自动呼叫质量异常', v >= 141.95 && v <= 142.05 ? 'ok' : 'err');
  },

  pauseDlg(id) {
    UI.modal({
      title: '暂停作业 · 选择原因代码',
      body: ['缺料', '设备故障', '质量异常', '换型', '其他'].map(r => `<button class="btn btn-o btn-lg" style="width:100%;margin-bottom:10px;justify-content:flex-start" onclick="Station.doPause('${id}','${r}')">${r === '缺料' ? '📦' : r === '设备故障' ? '🔧' : r === '质量异常' ? '⚠' : '⏸'} ${r}</button>`).join(''),
    });
  },
  doPause(id, reason) {
    ACT.pause(id, reason); UI.closeModal();
    UI.toast('已暂停：' + reason + '（计时暂停）', 'warn');
  },

  /* ---------- M04 Andon 一键呼叫 ---------- */
  rAndon(root) {
    const calling = DB.andon.find(a => a.status !== 'closed' && a.caller === this.cur.name);
    root.innerHTML = `
    <div class="station">
      ${this.head('Andon 异常呼叫', 'M04 ｜ 一键呼叫 · 自动通知责任人 · 超时升级车间主任', '/station')}
      <div class="st-body">
        ${calling ? `
        <div class="card tc" style="padding:22px;border:2.5px solid var(--danger);margin-bottom:14px">
          <div style="font-size:2rem">📢</div>
          <b style="font-size:1.2rem;color:var(--danger)">${esc(calling.type)} 呼叫中 · ${ticking(calling.start)}</b>
          <p class="muted mt">已推送班组长 → 责任人${esc((DB.andonTypes.find(t => t.name === calling.type) || {}).owner || '')}，超时自动升级车间主任</p>
          <button class="btn btn-g btn-lg mt" style="width:100%" onclick="ACT.closeAndon('${calling.id}','现场确认已解决');UI.toast('呼叫已关闭','ok')">✓ 异常已解决，关闭呼叫</button>
        </div>` : ''}
        <p class="tc muted mb">点击对应按钮一键呼叫（触发后自动推送企业微信）</p>
        <div class="andon-grid">
          <button class="andon-big material ${calling ? '' : ''}" onclick="Station.call('缺料')"><span class="i">📦</span>缺料呼叫</button>
          <button class="andon-big device" onclick="Station.call('设备故障')"><span class="i">🔧</span>设备故障呼叫</button>
          <button class="andon-big quality" onclick="Station.call('质量异常')"><span class="i">⚠</span>质量异常呼叫</button>
        </div>
        <div class="st-timeline">
          <b style="font-size:.95rem">最近呼叫记录</b>
          <div class="mt">
            ${DB.andon.slice(0, 4).map(a => `<div class="mrow"><div class="bd"><b>${esc(a.type)} · ${a.order}</b><span>${fmtDT(a.start)} · ${a.status === 'closed' ? '已消除' : a.status === 'open' ? '待响应' : '处理中'}</span></div><div class="rt"><b style="font-size:.84rem;color:${a.status === 'closed' ? 'var(--ok)' : 'var(--danger)'}">${a.status === 'closed' ? durText((a.end || NOW()) - a.start) : ticking(a.start)}</b></div></div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  },
  call(type) {
    const exist = DB.andon.find(a => a.status !== 'closed' && a.type === type && a.order === (this.selOrder || '—'));
    const oid = this.selOrder || (DB.orders.find(o => o.status === '在制') || {}).id || 'WO-2610-002';
    const id = ACT.callAndon(type, oid, '当前工位', '工位端一键呼叫');
    UI.toast('已呼叫：' + type + '（编号 ' + id + '），责任人已收到企业微信推送', 'err', 3200);
  },
};
