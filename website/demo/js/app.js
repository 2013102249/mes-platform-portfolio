/* ============================================================
 * MES 平台 —— 路由 / 门户 / 启动
 * #/ 门户 ｜ #/admin/* 后台 ｜ #/board 大屏 ｜ #/station/* 工位 ｜ #/m/* 移动
 * ============================================================ */
'use strict';

const Route = {
  go(path) {
    const h = '#' + path;
    if (location.hash === h || (path === '/' && (location.hash === '' || location.hash === '#'))) App.refresh();
    else location.hash = h;
  },
  cur() { return (location.hash || '#/').slice(1) || '/'; },
};

const Portal = {
  render(root) {
    const isM = matchMedia('(max-width: 760px)').matches;
    const cards = [
      { href: '#/m', ico: '📱', bg: 'linear-gradient(135deg,#7C3AED,#9F67FF)', t: '移动看板 H5', d: '车间主任 / 厂领导手机端：当日进度、节拍、异常接收与处置，企业微信推送直达。', go: '移动优先' },
      { href: '#/admin/dash', ico: '🖥', bg: 'linear-gradient(135deg,#2563EB,#60A5FA)', t: 'PC 管理后台', d: '工单 / 派工 / WIP / 节拍 / Andon / 追溯 / 绩效 / 报表 / 主数据 / 权限，14 个模块。', go: '进入后台' },
      { href: '#/station', ico: '🏭', bg: 'linear-gradient(135deg,#059669,#34D399)', t: '工位作业终端', d: '平板 / PDA：开工、完工、异常三大按钮，≥48px 戴手套可操作，扫码报工分钟级。', go: '工位登录' },
      { href: '#/board', ico: '📺', bg: 'linear-gradient(135deg,#DC2626,#F87171)', t: '车间大屏 16:9', d: '深色科技风：计划达成、Cell 节拍、Andon 滚动、WIP 水位、OEE，5 秒刷新远距可读。', go: '投屏查看' },
    ];
    if (isM) cards.sort((a, b) => (a.href === '#/m' ? -1 : b.href === '#/m' ? 1 : 0));
    root.innerHTML = `
    <div class="portal">
      <div class="portal-brand"><div class="portal-logo">⟡</div></div>
      <div class="portal-title">MES <em>平台</em></div>
      <div class="portal-sub">面向中小微离散制造企业的轻量化 MES ｜ 2~4 周上线 ｜ 工单到哪了、做得怎样、异常在哪 —— 实时可见</div>
      <div class="portal-grid">
        ${cards.map(c => `<a class="portal-card" href="${c.href}">
          <div class="portal-ico" style="background:${c.bg}">${c.ico}</div>
          <h3>${c.t}</h3><p>${c.d}</p><span class="portal-go">${c.go} →</span>
        </a>`).join('')}
      </div>
      <div class="portal-stats">
        <div class="pstat"><b>${DB.orders.length}</b><span>在线工单</span></div>
        <div class="pstat"><b>${DB.cells.length}</b><span>生产单元</span></div>
        <div class="pstat"><b>${DB.routings.reduce((s, r) => s + r.steps.length, 0)}</b><span>工艺工序</span></div>
        <div class="pstat"><b>${DB.workers.length}</b><span>在册人员</span></div>
        <div class="pstat"><b>${DB.andon.length}</b><span>今日异常</span></div>
      </div>
      <div class="portal-foot">ISA-95 L3 执行层 ｜ 对接用友 / 金蝶 / 鼎捷 ERP ｜ 演示数据每 24h 自动刷新，可在「我的」中手动重置<br>离散制造 MES 平台 V1.0（PRD 对齐实现）</div>
    </div>`;
  },
};

const App = {
  render() {
    Timers.clear();
    if (Board._clk) Board.destroy();
    UI.closeModal();
    const root = document.getElementById('app');
    const p = Route.cur();
    window.scrollTo(0, 0);
    if (p === '/' || p === '') return Portal.render(root);
    if (p.startsWith('/admin')) return Admin.render(root, p.split('/')[2] || 'dash');
    if (p.startsWith('/board')) return Board.render(root);
    if (p.startsWith('/station')) return Station.render(root, p.split('/')[2] || '');
    if (p.startsWith('/m')) return Mobile.render(root, p.split('/')[2] || '');
    Portal.render(root);
  },
  refresh() { this.render(); },
};

window.addEventListener('hashchange', () => App.render());
App.render();
