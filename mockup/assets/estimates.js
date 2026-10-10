/* Dự toán: list what a big upcoming expense needs, add it up, and answer one question: is the money enough?
   Amounts are in thousands of dong like the rest of the mockup data (see vnd()).
   Extension points: TEMPLATES (starting groups and factors) and plan.factors (any number the amounts multiply by). */
(function () {
  const ALL_WALLETS = ['tcb', 'momo', 'cash'];
  const PRIORITY = { must: 'Cần có', should: 'Nên có', nice: 'Có thì tốt' };
  const item = (name, price, priority, { by = [], qty = 1, paid = 0 } = {}) => ({ name, price, priority, by, qty, paid });

  const ESTIMATES = [
    {
      id: 'wedding', name: 'Đám cưới', icon: 'gift', contingency: 0.1, sources: ALL_WALLETS,
      factors: [{ id: 'guests', label: 'khách', value: 200 }],
      income: [['Tiền mừng dự kiến', 70000], ['Gia đình hỗ trợ', 20000]],
      groups: [
        ['Tiệc cưới', [item('Tiệc nhà hàng', 450, 'must', { by: ['guests'], paid: 40000 }), item('Rượu và nước ngọt', 40, 'should', { by: ['guests'] })]],
        ['Trang phục và làm đẹp', [item('Thuê váy và vest', 18000, 'must', { paid: 18000 }), item('Trang điểm cô dâu', 5000, 'should')]],
        ['Hình ảnh', [item('Chụp ảnh cưới', 15000, 'should', { paid: 5000 }), item('Quay phóng sự', 10000, 'nice')]],
        ['Lễ và trang trí', [item('Nhẫn cưới', 30000, 'must', { paid: 30000 }), item('Mâm quả', 20000, 'must'), item('Cổng hoa và sân khấu', 15000, 'should'), item('Xe hoa', 6000, 'nice')]],
      ],
    },
    {
      id: 'travel', name: 'Du lịch Đà Lạt', icon: 'airplane-tilt', contingency: 0.1, sources: ALL_WALLETS, income: [],
      factors: [{ id: 'people', label: 'người', value: 2 }, { id: 'days', label: 'ngày', value: 4 }, { id: 'nights', label: 'đêm', value: 3 }],
      groups: [
        ['Đi lại', [item('Vé máy bay khứ hồi', 1800, 'must', { by: ['people'], paid: 3600 }), item('Taxi và thuê xe', 250, 'should', { by: ['days'] })]],
        ['Chỗ ở', [item('Khách sạn', 900, 'must', { by: ['nights'], paid: 1000 })]],
        ['Ăn uống và vui chơi', [item('Ăn uống', 300, 'must', { by: ['people', 'days'] }), item('Vé tham quan', 120, 'nice', { by: ['people'], qty: 3 }), item('Mua quà', 500, 'nice')]],
      ],
    },
    {
      id: 'remodel', name: 'Sửa bếp', icon: 'wrench', contingency: 0.15, sources: ['tcb'], factors: [], income: [['Thưởng cuối năm', 30000]],
      groups: [
        ['Vật liệu', [item('Tủ bếp', 28000, 'must'), item('Gạch ốp tường', 9500, 'should')]],
        ['Nhân công và thiết bị', [item('Công thợ', 15000, 'must'), item('Bếp từ và máy hút mùi', 12000, 'must', { paid: 12000 })]],
      ],
    },
  ];

  const TEMPLATES = [
    { icon: 'airplane-tilt', label: 'Du lịch', groups: ['Đi lại', 'Chỗ ở', 'Ăn uống và vui chơi'], factors: ['người', 'ngày', 'đêm'], contingency: 0.1 },
    { icon: 'house-line', label: 'Sửa nhà', groups: ['Vật liệu', 'Nhân công và thiết bị'], factors: [], contingency: 0.15 },
    { icon: 'gift', label: 'Đám cưới và tiệc', groups: ['Tiệc', 'Trang phục và làm đẹp', 'Hình ảnh', 'Lễ và trang trí'], factors: ['khách'], contingency: 0.1 },
    { icon: 'shopping-bag', label: 'Mua sắm lớn', groups: ['Đồ cần mua'], factors: [], contingency: 0.05 },
    { icon: 'graduation-cap', label: 'Học phí', groups: ['Học phí', 'Sách vở và đồ dùng'], factors: ['kỳ'], contingency: 0.1 },
    { icon: 'calendar-blank', label: 'Tết', groups: ['Quà và lì xì', 'Ăn uống', 'Đi lại'], factors: ['người'], contingency: 0.1 },
    { icon: 'tag', label: 'Tự đặt', groups: [], factors: [], contingency: 0.1 },
  ];

  const sum = (numbers) => numbers.reduce((a, b) => a + b, 0);
  const itemsOf = (plan) => plan.groups.flatMap(([, items]) => items);
  const factorValue = (plan, id) => (plan.factors.find((f) => f.id === id) || { value: 1 }).value;
  const amountOf = (plan, it) => it.price * it.qty * it.by.reduce((product, id) => product * factorValue(plan, id), 1);
  const paidOf = (plan, it) => Math.min(it.paid, amountOf(plan, it));
  const unpaidOf = (plan, it) => amountOf(plan, it) - paidOf(plan, it);

  const resultFor = (plan, remaining) => {
    const available = sum(WALLETS.filter((w) => plan.sources.includes(w.id)).map((w) => w.balance));
    const incoming = sum(plan.income.map(([, amount]) => amount));
    return { available, incoming, result: available + incoming - remaining, withoutIncoming: available - remaining, coverage: remaining ? (available + incoming) / remaining : 1 };
  };
  const savingFor = (plan, priorities) => Math.round(sum(itemsOf(plan).filter((it) => priorities.includes(it.priority)).map((it) => unpaidOf(plan, it))) * (1 + plan.contingency));

  const estimateTotals = (plan) => {
    const items = itemsOf(plan);
    const base = sum(items.map((it) => amountOf(plan, it)));
    const paid = sum(items.map((it) => paidOf(plan, it)));
    const contingency = Math.round(base * plan.contingency);
    const remaining = base - paid + contingency;
    return { base, paid, contingency, total: base + contingency, remaining, ...resultFor(plan, remaining) };
  };

  /* "Is it enough if I drop the nice-to-haves?" answered from priorities, so the user does not have to guess what to cut. */
  const savingOptions = (plan, t) => [[['nice'], 'Bỏ các khoản "Có thì tốt"'], [['nice', 'should'], 'Bỏ thêm các khoản "Nên có"']]
    .map(([priorities, label]) => { const saving = savingFor(plan, priorities); return { label, saving, result: t.result + saving }; });

  const shortMoney = (k) => { const m = Math.abs(k) / 1000; return (m >= 100 ? Math.round(m).toString() : m.toFixed(1).replace(/\.0$/, '')).replace('.', ',') + ' tr'; };
  const coverageTone = (coverage) => (coverage >= 1 ? '' : coverage >= 0.85 ? 'warn' : 'over');
  const coverageMeter = (coverage) => `<div class="meter ${coverageTone(coverage)}" role="progressbar" aria-label="Phần đã đủ tiền" aria-valuenow="${Math.round(Math.min(coverage, 1) * 100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.min(coverage, 1) * 100}%"></i></div>`;
  const statusBadge = (t) => (t.result >= 0 ? `<span class="connected-badge">${ic('check')}Đủ tiền</span>` : `<span class="chip needs">Còn thiếu</span>`);
  const lineRow = (label, value) => `<div class="est-line"><span class="grow">${label}</span><b>${value}</b></div>`;

  /* ---------- list of plans ---------- */
  const planCard = (plan) => {
    const t = estimateTotals(plan);
    return `<button type="button" class="card est-card" data-view="estimate" data-est="${plan.id}"><span class="row" style="gap:12px"><span class="cat-tile">${ic(plan.icon)}</span><span class="grow"><b>${plan.name}</b><small>${itemsOf(plan).length} khoản · ${vnd(t.total)}</small></span>${statusBadge(t)}</span>
      ${coverageMeter(t.coverage)}<span class="row t-row muted"><span class="grow">Còn phải chi ${vnd(t.remaining)}</span><span>${t.result >= 0 ? 'Dư' : 'Thiếu'} ${vnd(t.result)}</span></span></button>`;
  };
  const estimateListHtml = () => ESTIMATES.map(planCard).join('')
    + `<button type="button" class="btn outline est-add" data-dlg="estimate-form">${ic('plus')}Dự toán mới</button>`;
  const estimateExplainerHtml = () => `<p class="t-sm secondary">Dùng khi bạn sắp có một khoản chi lớn gồm nhiều thứ: đám cưới, chuyến đi, sửa nhà, học phí, Tết... Bạn liệt kê từng khoản cần mua, ứng dụng cộng lại và trả lời một câu: tiền đã đủ chưa.</p>`
    + `<p class="t-sm secondary" style="margin-top:8px">Mục tiêu tiết kiệm giúp bạn để dành dần. Dự toán giúp bạn biết cần bao nhiêu và đã đủ chưa.</p>`;
  const estimateEmptyHtml = () => `<section class="card p6 gd-empty"><span class="hero-tile">${ic('calculator')}</span><h2 class="t-title">Chưa có dự toán nào</h2><p class="t-sm secondary">Chọn một mẫu để bắt đầu, hoặc tự đặt tên và tự liệt kê.</p>
    <div class="gd-pills">${TEMPLATES.map((tpl) => `<button type="button" class="pill" data-dlg="estimate-form">${ic(tpl.icon)}${tpl.label}</button>`).join('')}</div></section>`;

  /* ---------- one plan: the answer first, then the numbers behind it ---------- */
  const equation = (t) => `<div class="est-eq" aria-label="Tiền đang có cộng khoản thu dự kiến trừ còn phải chi">
    <button type="button" class="est-box" data-dlg="estimate-sources"><span class="t-meta">Đang có</span><b>${shortMoney(t.available)}</b></button><span class="est-op" aria-hidden="true">+</span>
    <button type="button" class="est-box" data-dlg="estimate-income-form"><span class="t-meta">Sẽ thu</span><b>${shortMoney(t.incoming)}</b></button><span class="est-op" aria-hidden="true">−</span>
    <div class="est-box"><span class="t-meta">Cần chi</span><b>${shortMoney(t.remaining)}</b></div></div>`;
  const resultBlock = (plan, t) => {
    const ok = t.result >= 0;
    return `<div class="est-result ${ok ? 'ok' : 'short'}"><span class="est-label">${ok ? 'Đủ tiền, còn dư' : 'Chưa đủ tiền, còn thiếu'}</span><span class="est-big">${vnd(t.result)}</span></div>${coverageMeter(t.coverage)}`
      + (plan.income.length ? `<p class="t-row muted">Nếu chưa tính khoản thu dự kiến: ${t.withoutIncoming >= 0 ? 'còn dư ' : 'còn thiếu '}<b>${vnd(t.withoutIncoming)}</b>. Khoản thu dự kiến chưa chắc chắn nên bạn nên xem cả hai con số.</p>` : '');
  };
  const savingRow = (o) => `<div class="est-line"><span class="grow">${o.label}<small class="est-sub">Tiết kiệm ${vnd(o.saving)}</small></span><b class="${o.result >= 0 ? 'est-ok' : ''}">${o.result >= 0 ? 'Dư ' : 'Thiếu '}${vnd(o.result)}</b></div>`;
  const tipsCard = (plan, t) => (t.result >= 0 ? '' : `<section class="card p4"><span class="eyebrow">Cách để đủ tiền</span><div class="est-lines">${savingOptions(plan, t).map(savingRow).join('')}</div>
    <button type="button" class="btn affirm est-cta" data-dlg="goal-form">${ic('target')}Đặt mục tiêu tiết kiệm cho phần thiếu</button></section>`);
  const summaryCard = (plan, t) => `<section class="card p5 est-summary"><div class="row" style="gap:12px"><span class="cat-tile">${ic(plan.icon)}</span><span class="grow"><b class="est-name">${plan.name}</b><small class="muted">${itemsOf(plan).length} khoản cần mua</small></span><button type="button" class="iconbtn" data-dlg="estimate-delete" aria-label="Xoá dự toán">${ic('trash')}</button></div>
    ${equation(t)}${resultBlock(plan, t)}
    <div class="est-lines">${lineRow('Tổng dự toán', vnd(t.total))}${lineRow('Đã trả', vnd(t.paid))}${lineRow('Còn phải chi', vnd(t.remaining))}</div></section>`;

  const paidText = (plan, it) => {
    const paid = paidOf(plan, it); const amount = amountOf(plan, it);
    return paid === 0 ? '' : paid >= amount ? 'Đã trả đủ' : `Đã cọc ${vnd(paid)}, còn ${vnd(amount - paid)}`;
  };
  const itemSub = (plan, it) => {
    const parts = [vnd(it.price)];
    it.by.forEach((id) => { const f = plan.factors.find((x) => x.id === id); if (f) parts.push(`${f.value} ${f.label}`); });
    if (it.qty > 1) parts.push(String(it.qty));
    return parts.join(' × ') + ' · ' + PRIORITY[it.priority];
  };
  const checkState = (plan, it) => { const paid = paidOf(plan, it); return paid <= 0 ? '' : paid >= amountOf(plan, it) ? 'on' : 'part'; };
  const itemRow = (plan, it) => {
    const state = checkState(plan, it); const note = paidText(plan, it);
    return `<div class="gd-row"><button type="button" class="chk ${state}" data-dlg="estimate-paid" aria-label="Ghi tiền đã trả: ${it.name}">${ic(state === 'part' ? 'minus' : 'check')}</button><button type="button" class="grow est-item" data-dlg="estimate-item-form"><b>${it.name}</b><small>${itemSub(plan, it)}</small>${note ? `<small class="est-paid">${note}</small>` : ''}</button><span class="gd-amt">${vnd(amountOf(plan, it))}</span></div>`;
  };
  const groupCard = (plan, [title, items]) => `<section class="card p4"><div class="row" style="gap:8px"><span class="eyebrow grow">${title}</span><span class="t-row muted">${vnd(sum(items.map((it) => amountOf(plan, it))))}</span></div>${items.map((it) => itemRow(plan, it)).join('')}</section>`;
  const factorRows = (plan) => plan.factors.map((f) => `<button type="button" class="gd-row gd-pick" data-dlg="estimate-factors"><span class="cat-tile sm">${ic('users')}</span><span class="grow"><b>Số ${f.label}</b><small>Các khoản nhân theo ${f.label} tự tính lại khi bạn đổi</small></span><span class="gd-amt">${f.value}</span></button>`).join('');
  const settingsCard = (plan, t) => `<section class="card p4">${factorRows(plan)}
    <button type="button" class="gd-row gd-pick" data-dlg="estimate-contingency"><span class="cat-tile sm">${ic('shield-check')}</span><span class="grow"><b>Dự phòng phát sinh ${Math.round(plan.contingency * 100)}%</b><small>Chừa sẵn cho những khoản chưa tính tới</small></span><span class="gd-amt">${vnd(t.contingency)}</span></button></section>`;
  const estimateDetailHtml = (plan) => {
    const t = estimateTotals(plan);
    return summaryCard(plan, t) + tipsCard(plan, t) + settingsCard(plan, t) + plan.groups.map((g) => groupCard(plan, g)).join('')
      + `<button type="button" class="btn outline est-add" data-dlg="estimate-item-form">${ic('plus')}Thêm khoản cần mua</button>`
      + `<p class="t-xs muted est-foot">Dự toán chỉ là ước tính và không tự tạo giao dịch. Khi bạn ghi tiền đã trả cho một khoản, ứng dụng hỏi cách ghi để không tính hai lần.</p>`;
  };

  Object.assign(window, { ESTIMATES, ESTIMATE_TEMPLATES: TEMPLATES, estimateTotals, estimateListHtml, estimateDetailHtml, estimateEmptyHtml, estimateExplainerHtml });
})();
