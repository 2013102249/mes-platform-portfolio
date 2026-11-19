/* ============================================================
 * MES 平台 —— 数据层（模拟数据 + 业务动作 + 持久化）
 * 行业示例：汽车零部件（减速器壳体机加）+ 电子装配
 * ============================================================ */
'use strict';

const HOUR = 3600e3, MIN = 60e3, DAY = 86400e3;
const NOW = () => Date.now();
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[rnd(0, arr.length - 1)];

const DB_KEY = 'lq_mes_db_v1';
let DB = null;

/* ---------- 保存 / 重置 ---------- */
function saveDB() { try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch (e) { } }
function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      DB = JSON.parse(raw);
      if (DB.meta && NOW() - DB.meta.seedAt < 24 * HOUR) {
        if (DB.meta.factory !== '精密制造 · 一号车间') { DB.meta.factory = '精密制造 · 一号车间'; saveDB(); }
        return;
      }
    }
  } catch (e) { }
  seed();
}

/* ---------- 基础主数据 ---------- */
const WORKERS = [
  { id: 'W01', name: '王建国', role: '车间主任', team: '管理', skills: ['全部'], cert: ['安全员'] },
  { id: 'W02', name: '李铁柱', role: '班组长', team: '机加一班', skills: ['CNC', '铣床', '磨床'], cert: ['焊工证'] },
  { id: 'W03', name: '赵德芳', role: '班组长', team: '装配二班', skills: ['装配', '检验'], cert: [] },
  { id: 'W04', name: '陈小明', role: '操作工', team: '机加一班', skills: ['CNC'], cert: [] },
  { id: 'W05', name: '刘秀兰', role: '操作工', team: '机加一班', skills: ['铣床', '磨床'], cert: [] },
  { id: 'W06', name: '孙志强', role: '操作工', team: '装配二班', skills: ['装配'], cert: [] },
  { id: 'W07', name: '周丽华', role: '操作工', team: '装配二班', skills: ['装配', '检验'], cert: ['计量证'] },
  { id: 'W08', name: '吴海涛', role: '操作工', team: '电子一班', skills: ['SMT', '组装'], cert: [] },
  { id: 'W09', name: '郑雅琴', role: '操作工', team: '电子一班', skills: ['组装', '老化测试'], cert: [] },
  { id: 'W10', name: '冯建军', role: '物料员', team: '仓储', skills: ['配料'], cert: ['叉车证'] },
  { id: 'W11', name: '钱国栋', role: '设备工程师', team: '设备', skills: ['维修'], cert: ['电工证'] },
  { id: 'W12', name: '何桂英', role: '计划员/PMC', team: '管理', skills: ['排产'], cert: [] },
];

const CELLS = [
  { id: 'C1', name: '机加 Cell-A', takt: 90, planOut: 320, stations: ['OP10 铣面', 'OP20 钻孔', 'OP30 精铣', 'OP40 检验'] },
  { id: 'C2', name: '机加 Cell-B', takt: 120, planOut: 240, stations: ['OP10 车削', 'OP20 铣键槽', 'OP30 去毛刺'] },
  { id: 'C3', name: '装配 Cell-A', takt: 150, planOut: 190, stations: ['OP10 压装', 'OP20 装配', 'OP30 气密测试'] },
  { id: 'C4', name: '装配 Cell-B', takt: 180, planOut: 160, stations: ['OP10 预装', 'OP20 总装', 'OP30 终检'] },
  { id: 'C5', name: '电子装配 Cell', takt: 60, planOut: 480, stations: ['OP10 SMT', 'OP20 AOI', 'OP30 组装', 'OP40 老化'] },
];

const ROUTINGS = [
  {
    id: 'R1', name: '减速器壳体加工路线', product: '减速器壳体 JSQ-220', version: 'V3.2', cycleMin: 8.5,
    steps: [
      { seq: 10, name: '下料', wc: '下料区', stdHours: 0.2, setupMin: 15, res: '锯床 G4025', sop: '锯切下料，核对材料批次 LOT 号，检查切口毛刺。' },
      { seq: 20, name: '粗铣基准面', wc: 'OP10 铣面', stdHours: 0.5, setupMin: 30, res: 'CNC 加工中心 VMC-850', sop: '装夹找正 ≤0.02mm，粗铣 A/B 基准面，留量 0.3mm。' },
      { seq: 30, name: '钻孔攻丝', wc: 'OP20 钻孔', stdHours: 0.6, setupMin: 25, res: '摇臂钻 Z3050', sop: '按图纸钻 8-Ø12 底孔并攻 M14×1.5，使用通规止规自检。' },
      { seq: 40, name: '精铣成型', wc: 'OP30 精铣', stdHours: 0.8, setupMin: 40, res: 'CNC 加工中心 VMC-1060', sop: '精铣结合面平面度 ≤0.03mm，关键尺寸 142±0.05 需自检录入。' },
      { seq: 50, name: '热处理（外协）', wc: '外协-热处理', stdHours: 4.0, setupMin: 0, res: '外协厂商', sop: '整批发外渗碳淬火 HRC58-62，跟踪外协回厂数量与批次。' },
      { seq: 60, name: '精磨结合面', wc: 'OP30 精铣', stdHours: 0.4, setupMin: 20, res: '平面磨床 M7130', sop: '磨削至 Ra0.8，平行度 ≤0.02mm。' },
      { seq: 70, name: '终检入库', wc: 'OP40 检验', stdHours: 0.3, setupMin: 10, res: '三坐标 CMM', sop: '按 20% 抽检关键尺寸，合格后扫码报工转序入库。' },
    ],
  },
  {
    id: 'R2', name: '控制器主板电子装配路线', product: '控制器主板 KZB-88', version: 'V1.4', cycleMin: 1.2,
    steps: [
      { seq: 10, name: 'SMT 贴片', wc: 'OP10 SMT', stdHours: 0.15, setupMin: 45, res: '贴片机 SM-471', sop: '核对料站表，首件确认后批量贴片，记录钢网批次。' },
      { seq: 20, name: '回流焊 + AOI', wc: 'OP20 AOI', stdHours: 0.1, setupMin: 15, res: '回流焊 RF-08 / AOI', sop: '炉温曲线按 Profile-B，AOI 检出不良标记放置红箱。' },
      { seq: 30, name: '插件组装', wc: 'OP30 组装', stdHours: 0.3, setupMin: 10, res: '组装线 L2', sop: '插装连接器与电解电容，注意极性，扭矩 0.6N·m。' },
      { seq: 40, name: '老化测试', wc: 'OP40 老化', stdHours: 0.5, setupMin: 5, res: '老化房 12 工位', sop: '85℃/4h 老化，通电测试记录电压电流值。' },
      { seq: 50, name: '包装入库', wc: 'OP40 老化', stdHours: 0.1, setupMin: 5, res: '包装台', sop: '贴序列号标签，防静电袋封装，扫码入库。' },
    ],
  },
];

const MATERIALS = [
  { code: 'M-HT250-01', name: '灰铸铁 HT250 毛坯', spec: '减速器壳体铸件', unit: '件', stock: 860 },
  { code: 'M-BEAR-62', name: '深沟球轴承 6205', spec: 'NSK 6205-2Z', unit: '套', stock: 3200 },
  { code: 'M-PCB-88', name: 'PCB 裸板', spec: 'KZB-88 四层板', unit: '片', stock: 5400 },
  { code: 'M-IC-ST', name: '主控芯片 STM32F103', spec: 'LQFP-48', unit: '颗', stock: 120 },
  { code: 'M-SEAL-45', name: '骨架油封', spec: 'TC 45×62×8', unit: '件', stock: 2100 },
  { code: 'M-BOLT-M14', name: '高强度螺栓', spec: 'M14×1.5×40 10.9级', unit: '件', stock: 4800 },
];

const ANDON_TYPES = [
  { id: 'A1', name: '缺料', color: 'warn', owner: '冯建军', escalateMin: 10 },
  { id: 'A2', name: '设备故障', color: 'danger', owner: '钱国栋', escalateMin: 8 },
  { id: 'A3', name: '质量异常', color: 'info', owner: '周丽华', escalateMin: 15 },
];

/* ---------- Seed 工单 ---------- */
function mkSteps(routing) {
  return routing.steps.map((s, i) => ({
    seq: s.seq, name: s.name, status: 'wait', done: 0, ng: 0, scrap: 0,
    worker: null, startAt: null, endAt: null, pauses: [], selfCheck: [],
  }));
}

function mkOrder(o) { return Object.assign({ records: [], timeline: [], pauses: [] }, o); }

function seed() {
  const now = NOW();
  const t0 = now - 8 * HOUR;
  DB = {
    meta: { seedAt: now, ver: 1, factory: '精密制造 · 一号车间' },
    workers: WORKERS.map(w => Object.assign({ out: rnd(80, 300), hours: +(rnd(5, 8) + Math.random()).toFixed(1), passRate: rnd(96, 100) }, w)),
    cells: CELLS.map(c => Object.assign({}, c)),
    routings: JSON.parse(JSON.stringify(ROUTINGS)),
    materials: MATERIALS.map(m => Object.assign({}, m)),
    andonTypes: ANDON_TYPES.map(a => Object.assign({}, a)),
    shifts: [
      { id: 'S1', name: '白班', time: '08:00-16:30', leader: '李铁柱' },
      { id: 'S2', name: '中班', time: '16:30-24:00', leader: '赵德芳' },
    ],
    orders: [],
    andon: [],
    taktLog: {},   // cellId -> [{h, out, plan}]
    oee: [
      { cell: '机加 Cell-A', a: 92, p: 85, q: 99 },
      { cell: '机加 Cell-B', a: 88, p: 78, q: 98 },
      { cell: '装配 Cell-A', a: 95, p: 82, q: 99 },
      { cell: '装配 Cell-B', a: 90, p: 88, q: 100 },
      { cell: '电子装配 Cell', a: 96, p: 91, q: 99 },
    ],
    customers: ['长安汽车', '比亚迪供应链', '格力电器', '三花智控'],
  };

  const r1 = DB.routings[0], r2 = DB.routings[1];
  const today = d => { const x = new Date(); x.setHours(d.h, d.m, 0, 0); return x.getTime(); };

  /* 8 张工单，覆盖全状态机 */
  DB.orders = [
    mkOrder({
      id: 'WO-2610-001', productId: r1.product, routingId: r1.id, cellId: 'C1', qty: 200,
      done: 200, ng: 4, scrap: 1, priority: '高', customer: '长安汽车',
      due: today({ h: 18, m: 0 }), status: '报工确认', erpSync: true, stock: '已入库',
      createdAt: now - 3 * DAY,
      timeline: [{ t: now - 3 * DAY, text: 'ERP 同步工单（用友 U8）' }, { t: now - 2 * DAY, text: '派工至 机加 Cell-A' }, { t: now - 6 * HOUR, text: '末道工序完工，触发入库回写 ERP' }],
    }),
    mkOrder({
      id: 'WO-2610-002', productId: r1.product, routingId: r1.id, cellId: 'C1', qty: 150,
      done: 96, ng: 3, scrap: 0, priority: '紧急', customer: '比亚迪供应链',
      due: today({ h: 20, m: 0 }), status: '在制', currentStep: 3,
      createdAt: now - 2 * DAY,
      timeline: [{ t: now - 2 * DAY, text: 'ERP 同步工单' }, { t: now - 1 * DAY, text: '派工至 机加 Cell-A' }, { t: now - 5 * HOUR, text: '开工：精铣成型 工序' }],
    }),
    mkOrder({
      id: 'WO-2610-003', productId: r2.product, routingId: r2.id, cellId: 'C5', qty: 800,
      done: 610, ng: 12, scrap: 2, priority: '高', customer: '三花智控',
      due: now + 1 * DAY, status: '在制', currentStep: 2,
      createdAt: now - 1 * DAY,
      timeline: [{ t: now - 1 * DAY, text: 'ERP 同步工单' }, { t: now - 7 * HOUR, text: '派工至 电子装配 Cell' }, { t: now - 4 * HOUR, text: '开工：插件组装 工序' }],
    }),
    mkOrder({
      id: 'WO-2610-004', productId: r1.product, routingId: r1.id, cellId: 'C2', qty: 120,
      done: 45, ng: 2, scrap: 1, priority: '正常', customer: '长安汽车',
      due: now + 2 * DAY, status: '暂停', currentStep: 1, pauseReason: '缺料',
      createdAt: now - 1 * DAY,
      timeline: [{ t: now - 1 * DAY, text: 'ERP 同步工单' }, { t: now - 4 * HOUR, text: '派工至 机加 Cell-B' }, { t: now - 40 * MIN, text: '暂停：缺料（等待 HT250 毛坯补料）' }],
    }),
    mkOrder({
      id: 'WO-2610-005', productId: r2.product, routingId: r2.id, cellId: 'C5', qty: 500,
      done: 0, ng: 0, scrap: 0, priority: '正常', customer: '格力电器',
      due: now + 3 * DAY, status: '已派工', currentStep: 0,
      createdAt: now - 5 * HOUR,
      timeline: [{ t: now - 5 * HOUR, text: 'ERP 同步工单' }, { t: now - 2 * HOUR, text: '派工至 电子装配 Cell（待开工）' }],
    }),
    mkOrder({
      id: 'WO-2610-006', productId: r1.product, routingId: r1.id, cellId: 'C3', qty: 300,
      done: 0, ng: 0, scrap: 0, priority: '正常', customer: '三花智控',
      due: now + 4 * DAY, status: '已派工', currentStep: 0,
      createdAt: now - 4 * HOUR,
      timeline: [{ t: now - 4 * HOUR, text: 'ERP 同步工单' }, { t: now - 1 * HOUR, text: '派工至 装配 Cell-A' }],
    }),
    mkOrder({
      id: 'WO-2610-007', productId: r2.product, routingId: r2.id, cellId: null, qty: 600,
      done: 0, ng: 0, scrap: 0, priority: '低', customer: '比亚迪供应链',
      due: now + 5 * DAY, status: '未派发', currentStep: 0,
      createdAt: now - 2 * HOUR,
      timeline: [{ t: now - 2 * HOUR, text: 'ERP 同步工单（金蝶 K3）' }],
    }),
    mkOrder({
      id: 'WO-2610-008', productId: r1.product, routingId: r1.id, cellId: 'C4', qty: 100,
      done: 0, ng: 0, scrap: 0, priority: '低', customer: '长安汽车',
      due: now + 6 * DAY, status: '未派发', currentStep: 0,
      createdAt: now - 1 * HOUR,
      timeline: [{ t: now - 1 * HOUR, text: 'ERP 同步工单（用友 U8）' }],
    }),
  ];

  /* 工单工序级数据（简化：完成量的按工序分布） */
  DB.orders.forEach(o => {
    const rt = DB.routings.find(r => r.id === o.routingId);
    o.steps = mkSteps(rt);
    const totalSteps = rt.steps.length;
    if (o.status === '报工确认') {
      o.steps.forEach(s => { s.status = 'done'; s.done = Math.round(o.qty / totalSteps); s.endAt = now - 8 * HOUR; s.worker = pick(['陈小明', '刘秀兰']); });
      o.steps[totalSteps - 1].done = o.qty;
    } else if (o.status === '在制' || o.status === '暂停') {
      for (let i = 0; i < o.currentStep; i++) { o.steps[i].status = 'done'; o.steps[i].done = Math.round(o.qty / totalSteps); o.steps[i].endAt = now - (totalSteps - i) * 2 * HOUR; o.steps[i].worker = pick(['陈小明', '刘秀兰', '孙志强', '吴海涛']); }
      const cs = o.steps[o.currentStep];
      cs.status = o.status === '暂停' ? 'pause' : 'doing';
      cs.done = o.done; cs.ng = o.ng; cs.scrap = o.scrap; cs.startAt = now - 5 * HOUR; cs.worker = o.cellId === 'C5' ? '吴海涛' : '陈小明';
      if (o.status === '暂停') cs.pauses.push({ reason: o.pauseReason, start: now - 40 * MIN, end: null });
    }
    /* 报工记录 */
    if (o.done > 0) {
      const n = Math.min(5, Math.max(2, Math.round(o.done / 50)));
      for (let i = 0; i < n; i++) {
        const ok = Math.max(1, Math.round(o.done / n) - rnd(0, 2));
        o.records.push({
          t: now - (n - i) * 70 * MIN, step: o.steps[o.currentStep] ? o.steps[o.currentStep].name : '包装入库',
          worker: o.cellId === 'C5' ? pick(['吴海涛', '郑雅琴']) : pick(['陈小明', '刘秀兰']),
          ok, ng: rnd(0, 2), scrap: rnd(0, 1),
        });
      }
    }
  });

  /* Andon 异常 */
  DB.andon = [
    { id: 'AN-101', type: '缺料', order: 'WO-2610-004', station: 'OP20 铣键槽', caller: '刘秀兰', start: now - 40 * MIN, respond: null, end: null, status: 'open', handler: null, note: 'HT250 毛坯断料，等待仓储补料' },
    { id: 'AN-102', type: '设备故障', order: 'WO-2610-002', station: 'OP30 精铣', caller: '陈小明', start: now - 2 * HOUR, respond: now - 2 * HOUR + 6 * MIN, end: now - 1.2 * HOUR, status: 'closed', handler: '钱国栋', note: 'VMC-1060 主轴异响，更换轴承完成' },
    { id: 'AN-103', type: '质量异常', order: 'WO-2610-003', station: 'OP30 组装', caller: '吴海涛', start: now - 26 * MIN, respond: now - 20 * MIN, end: null, status: 'responding', handler: '周丽华', note: '连接器插反，疑似作业指导书图示不清' },
    { id: 'AN-104', type: '缺料', order: 'WO-2610-003', station: 'OP30 组装', caller: '郑雅琴', start: now - 3.5 * HOUR, respond: now - 3.4 * HOUR, end: now - 3 * HOUR, status: 'closed', handler: '冯建军', note: '电解电容补料 500 颗' },
    { id: 'AN-105', type: '设备故障', order: 'WO-2610-001', station: 'OP40 检验', caller: '刘秀兰', start: now - 6 * HOUR, respond: now - 5.9 * HOUR, end: now - 5.5 * HOUR, status: 'closed', handler: '钱国栋', note: 'CMM 测针破损更换' },
  ];

  /* 节拍数据：每 Cell 今日小时产出 */
  DB.cells.forEach(c => {
    const arr = [];
    for (let h = 8; h <= Math.max(9, new Date().getHours()); h++) {
      const plan = Math.round(c.planOut / 8);
      const out = Math.round(plan * (0.7 + Math.random() * 0.5));
      arr.push({ h: h + ':00', out: Math.min(out, plan + 8), plan });
    }
    DB.taktLog[c.id] = arr;
  });

  /* 追溯序列号 */
  DB.traces = [];
  for (let i = 1; i <= 12; i++) {
    const sn = 'SN26A0' + String(1000 + i);
    DB.traces.push({
      sn, order: 'WO-2610-001', product: r1.product, lot: 'LOT-HT250-0928', customer: '长安汽车',
      steps: r1.steps.map((s, si) => ({
        name: s.name, worker: pick(['陈小明', '刘秀兰', '孙志强']), wc: s.wc,
        t: now - (8 - si) * HOUR + rnd(0, 30) * MIN,
        selfCheck: s.seq === 40 ? { item: '关键尺寸 142±0.05', val: (141.96 + Math.random() * 0.07).toFixed(2) } : null,
      })),
    });
  }
  saveDB();
}

/* ---------- 派生指标 ---------- */
function orderProgress(o) {
  if (o.status === '报工确认') return 100;
  if (o.status === '未派发') return 0;
  return Math.min(100, Math.round((o.done / o.qty) * 100));
}
function todayOut() { return DB.orders.reduce((s, o) => s + o.done, 0); }
function todayPlan() { return DB.orders.reduce((s, o) => s + o.qty, 0); }
function openAndon() { return DB.andon.filter(a => a.status !== 'closed'); }
function wipByCell() {
  const m = {};
  DB.orders.forEach(o => { if (o.status === '在制' || o.status === '暂停' || o.status === '已派工') { if (!m[o.cellId]) m[o.cellId] = { orders: 0, qty: 0, paused: 0 }; m[o.cellId].orders++; m[o.cellId].qty += (o.qty - o.done); if (o.status === '暂停') m[o.cellId].paused++; } });
  return m;
}
function taktRate(c) {
  const log = DB.taktLog[c.id] || [];
  if (!log.length) return 0;
  const out = log.reduce((s, x) => s + x.out, 0), plan = log.reduce((s, x) => s + x.plan, 0);
  return Math.round(out / plan * 100);
}

/* ---------- 业务动作 ---------- */
const ACT = {
  dispatch(orderId, cellId) {
    const o = DB.orders.find(x => x.id === orderId); if (!o) return;
    o.cellId = cellId; o.status = '已派工';
    o.timeline.push({ t: NOW(), text: '派工至 ' + (DB.cells.find(c => c.id === cellId) || {}).name });
    saveDB(); App.refresh();
  },
  start(orderId, workerId) {
    const o = DB.orders.find(x => x.id === orderId); if (!o) return;
    const w = DB.workers.find(x => x.id === workerId);
    o.status = '在制'; o.startedAt = NOW();
    const cs = o.steps[o.currentStep];
    cs.status = 'doing'; cs.startAt = NOW(); cs.worker = w ? w.name : null;
    o.timeline.push({ t: NOW(), text: `开工：${cs.name}（${w ? w.name : ''}）` });
    saveDB(); App.refresh();
  },
  report(orderId, ok, ng, scrap) {
    const o = DB.orders.find(x => x.id === orderId); if (!o) return;
    const cs = o.steps[o.currentStep];
    cs.done += ok; cs.ng += ng; cs.scrap += scrap;
    o.done += ok; o.ng += ng; o.scrap += scrap;
    o.records.push({ t: NOW(), step: cs.name, worker: cs.worker || '操作工', ok, ng, scrap });
    /* 节拍日志追加 */
    const cell = DB.cells.find(c => c.id === o.cellId);
    if (cell) {
      const h = new Date().getHours() + ':00';
      let e = DB.taktLog[cell.id].find(x => x.h === h);
      if (!e) { e = { h, out: 0, plan: Math.round(cell.planOut / 8) }; DB.taktLog[cell.id].push(e); }
      e.out += ok;
    }
    /* 转序 / 完工 */
    if (o.done >= o.qty) {
      cs.status = 'done'; cs.endAt = NOW();
      const hasOutsource = o.steps.some(s => s.name.includes('外协'));
      o.status = '报工确认'; o.stock = '待入库';
      o.timeline.push({ t: NOW(), text: `末道工序完工（${ok} 件合格），触发入库回写 ERP${hasOutsource ? '（含外协工序）' : ''}` });
    } else {
      o.timeline.push({ t: NOW(), text: `报工：${cs.name} 合格 ${ok} / 不良 ${ng} / 报废 ${scrap}` });
    }
    saveDB(); App.refresh();
  },
  transfer(orderId) {
    const o = DB.orders.find(x => x.id === orderId); if (!o) return;
    const cs = o.steps[o.currentStep];
    if (cs.status === 'doing') { cs.status = 'done'; cs.endAt = NOW(); }
    if (o.currentStep < o.steps.length - 1) {
      o.currentStep++;
      o.timeline.push({ t: NOW(), text: `转序 → ${o.steps[o.currentStep].name}` });
      o.status = '在制';
    } else {
      o.status = '报工确认'; o.stock = '待入库';
      o.timeline.push({ t: NOW(), text: '末道工序完工，触发入库回写 ERP' });
    }
    saveDB(); App.refresh();
  },
  pause(orderId, reason) {
    const o = DB.orders.find(x => x.id === orderId); if (!o) return;
    o.status = '暂停'; o.pauseReason = reason;
    const cs = o.steps[o.currentStep];
    cs.status = 'pause';
    cs.pauses.push({ reason, start: NOW(), end: null });
    o.timeline.push({ t: NOW(), text: `暂停：${reason}` });
    saveDB(); App.refresh();
  },
  resume(orderId) {
    const o = DB.orders.find(x => x.id === orderId); if (!o) return;
    o.status = '在制'; o.pauseReason = null;
    const cs = o.steps[o.currentStep];
    cs.status = 'doing';
    const p = cs.pauses[cs.pauses.length - 1]; if (p && !p.end) p.end = NOW();
    o.timeline.push({ t: NOW(), text: '恢复作业' });
    saveDB(); App.refresh();
  },
  postStock(orderId) {
    const o = DB.orders.find(x => x.id === orderId); if (!o) return;
    o.erpSync = true; o.stock = '已入库';
    o.timeline.push({ t: NOW(), text: '入库过账完成，已回写 ERP' });
    saveDB(); App.refresh();
  },
  callAndon(type, orderId, station, note) {
    const id = 'AN-' + rnd(200, 999);
    DB.andon.unshift({ id, type, order: orderId, station: station || '工位', caller: Station.cur ? Station.cur.name : '工位操作工', start: NOW(), respond: null, end: null, status: 'open', handler: null, note: note || '' });
    saveDB(); App.refresh();
    return id;
  },
  respondAndon(id, handlerId) {
    const a = DB.andon.find(x => x.id === id); if (!a) return;
    const w = DB.workers.find(x => x.id === handlerId);
    a.status = 'responding'; a.respond = NOW(); a.handler = w ? w.name : handlerId;
    saveDB(); App.refresh();
  },
  closeAndon(id, note) {
    const a = DB.andon.find(x => x.id === id); if (!a) return;
    a.status = 'closed'; a.end = NOW(); if (note) a.note = note;
    saveDB(); App.refresh();
  },
  addRoutingStep(routingId, step) {
    const r = DB.routings.find(x => x.id === routingId); if (!r) return;
    r.steps.push(step); r.version = 'V' + (parseFloat(r.version.slice(1)) + 0.1).toFixed(1);
    saveDB(); App.refresh();
  },
  delRoutingStep(routingId, seq) {
    const r = DB.routings.find(x => x.id === routingId); if (!r) return;
    r.steps = r.steps.filter(s => s.seq !== seq);
    saveDB(); App.refresh();
  },
};

loadDB();
