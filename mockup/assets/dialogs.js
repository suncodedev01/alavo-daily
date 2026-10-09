/* Dialogs, forms and state cards that the app has and the first mockup did not.
   Each dialog is data (title, lead, body, actions) so the web <dialog> and the mobile bottom sheet show the same content. */
(function () {
  const PAYMENTS = [['cash', 'Tiền mặt', 'money'], ['tcb', 'Chuyển khoản', 'bank'], ['momo', 'Ví điện tử', 'device-mobile']];
  const WALLET_KINDS = [['bank', 'Tài khoản', 'bank'], ['ewallet', 'Ví điện tử', 'device-mobile'], ['cash', 'Tiền mặt', 'money']];
  const WALLET_ICON = { tcb: 'bank', momo: 'device-mobile', cash: 'money' };

  const field = (icon, label, placeholder, value = '', suffix = '') =>
    `<label class="gd-field"><span class="eyebrow">${label}</span><span class="field">${ic(icon)}<input placeholder="${placeholder}" value="${value}" aria-label="${label}" autocomplete="off">${suffix ? `<span class="muted">${suffix}</span>` : ''}</span></label>`;
  const group = (label, items, selected, multi = false) =>
    `<div class="gd-group"><span class="eyebrow">${label}</span><div class="gd-pills" ${multi ? 'data-multi' : ''}>${items.map(([id, text, icon]) => `<button type="button" class="pill ${[].concat(selected).includes(id) ? 'on' : ''}" data-pill="${id}">${icon ? ic(icon) : ''}${text}</button>`).join('')}</div></div>`;
  const toggle = (label, sub, on) =>
    `<div class="gd-switch"><span class="grow"><b>${label}</b><small>${sub}</small></span><button type="button" class="switch" role="switch" aria-checked="${on}" aria-label="${label}"></button></div>`;
  const note = (text) => `<p class="t-xs muted">${text}</p>`;
  const tools = (go, toast) => `<button type="button" class="iconbtn" ${go ? `data-go="${go}"` : ''} aria-label="Sửa">${ic('pencil-simple')}</button><button type="button" class="iconbtn" data-toast="${toast}" aria-label="Xoá">${ic('trash')}</button>`;
  const listRow = (tile, title, sub, right, actions) =>
    `<div class="gd-row"><span class="cat-tile sm">${ic(tile)}</span><span class="grow"><b>${title}</b><small>${sub}</small></span>${right ? `<span class="gd-amt">${right}</span>` : ''}${actions || ''}</div>`;
  const button = (a) => `<button type="button" class="btn ${a.kind || 'outline'}" ${a.go ? `data-go="${a.go}"` : ''} ${a.toast ? `data-toast="${a.toast}"` : ''}>${a.label}</button>`;
  const cancel = { label: 'Huỷ' };

  const day = (d) => `Ngày ${d} hằng tháng`;
  const dayStepper = (d) => `<div class="gd-group"><span class="eyebrow">Ngày trả trong tháng</span><div class="gd-stepper"><button type="button" data-step="-1" aria-label="Lùi một ngày">${ic('minus')}</button><b data-step-value>${d}</b><button type="button" data-step="1" aria-label="Tới một ngày">${ic('plus')}</button></div><p class="t-xs muted" data-step-text>${day(d)}</p></div>`;

  const fold = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  const categoryRows = (ids, selected) => ids.map((id) => `<button type="button" class="gd-row gd-pick" data-pick-cat="${id}" data-key="${fold(CATS[id].name)}"><span class="cat-tile sm">${ic(CATS[id].icon)}</span><span class="grow"><b>${CATS[id].name}</b></span>${id === selected ? ic('check') : ''}</button>`).join('');
  const categoryPickerBody = (ids, selected) => `<label class="gd-field"><span class="field">${ic('magnifying-glass')}<input data-cat-search id="acSearch" placeholder="Tìm hạng mục" aria-label="Tìm hạng mục" autocomplete="off"></span></label><div class="gd-list">${categoryRows(ids, selected)}</div><p class="t-sm muted gd-none" hidden>Không tìm thấy hạng mục nào.</p>`;
  const expenseIds = () => Object.keys(CATS).filter((id) => !isIncomeCat(id));

  const DIALOGS = {
    'category-picker': () => ({
      title: 'Chọn hạng mục', body: categoryPickerBody(expenseIds(), 'food'),
      actions: [{ label: 'Đóng' }, { label: 'Hạng mục mới', kind: 'primary', toast: 'Mở form hạng mục mới' }],
    }),
    'wallets': () => ({
      title: 'Quản lý ví', lead: 'Ví là nơi tiền của bạn đang nằm: tài khoản ngân hàng, ví điện tử hoặc tiền mặt.',
      body: WALLETS.map((w) => listRow(WALLET_ICON[w.id], w.name, w.kind, vnd(w.balance), tools('wallet-form', 'Chỉ xoá được ví chưa có giao dịch nào'))).join('') + note('Chỉ xoá được ví chưa có giao dịch nào.'),
      actions: [{ label: 'Đóng' }, { label: 'Thêm ví', kind: 'primary', go: 'wallet-form' }],
    }),
    'wallet-form': () => ({
      title: 'Thêm ví',
      body: field('wallet', 'Tên ví', 'Tên ví (ví dụ: Techcombank)') + group('Loại ví', WALLET_KINDS, 'bank') + field('coins', 'Số dư ban đầu', '0', '', '₫'),
      actions: [cancel, { label: 'Lưu ví', kind: 'primary', toast: 'Đã lưu ví' }],
    }),
    'bills': () => ({
      title: 'Khoản định kỳ', lead: 'Các khoản phải trả hằng tháng như tiền mạng, điện hay thẻ tín dụng.',
      body: UPCOMING.map((u, i) => listRow(u.icon, u.title, day([12, 15, 18][i]), vnd(u.amt), tools('bill-form', 'Khoản này sẽ không còn xuất hiện trong mục sắp đến hạn'))).join('') + note('Thêm khoản phải trả hằng tháng để được nhắc trước hạn.'),
      actions: [{ label: 'Đóng' }, { label: 'Thêm khoản định kỳ', kind: 'primary', go: 'bill-form' }],
    }),
    'bill-form': () => ({
      title: 'Thêm khoản định kỳ',
      body: field('lightning', 'Tên khoản định kỳ', 'Tên khoản (ví dụ: Internet FPT)') + field('coins', 'Số tiền', '0', '', '₫') + dayStepper(15) + toggle('Đang theo dõi khoản này', 'Bạn được nhắc trước hạn', true),
      actions: [cancel, { label: 'Lưu khoản định kỳ', kind: 'primary', toast: 'Đã lưu khoản định kỳ' }],
    }),
    'goal-form': () => ({
      title: 'Mục tiêu mới',
      body: field('target', 'Tên mục tiêu', 'Tên mục tiêu (ví dụ: Du lịch Đà Lạt)') + field('coins', 'Số tiền cần đạt', '15.000.000', '', '₫') + field('piggy-bank', 'Đã có sẵn (không bắt buộc)', '0', '', '₫')
        + toggle('Đặt hạn hoàn thành', 'Nhận gợi ý số tiền để dành mỗi tháng', true)
        + `<div class="gd-group"><span class="eyebrow">Hạn hoàn thành</span><button type="button" class="field pick">${ic('calendar-blank')}<span class="grow">20/12/2026</span>${ic('caret-down')}</button></div>`
        + note('Để đủ 15.000.000 ₫ (còn 10 tuần), bạn cần để dành khoảng 2.520.000 ₫ mỗi tháng.'),
      actions: [cancel, { label: 'Tạo mục tiêu', kind: 'primary', toast: 'Đã tạo mục tiêu' }],
    }),
    'contribute': () => ({
      title: 'Thêm tiền vào Quỹ khẩn cấp', lead: 'Đã có 38.500.000 ₫ trên 60.000.000 ₫.',
      body: field('coins', 'Số tiền thêm vào', '0', '500.000', '₫'),
      actions: [cancel, { label: 'Thêm tiền', kind: 'primary', toast: 'Đã thêm 500.000 ₫ vào Quỹ khẩn cấp' }],
    }),
    'confirm-goal': () => ({
      title: 'Xoá mục tiêu Quỹ khẩn cấp?', lead: 'Số tiền đã để dành cho mục tiêu này sẽ không còn được theo dõi.', body: '',
      actions: [cancel, { label: 'Xoá mục tiêu', kind: 'destructive', toast: 'Đã xoá mục tiêu' }],
    }),
    'confirm-tx': () => ({
      title: 'Xoá giao dịch này?', lead: 'Số dư các ví sẽ được tính lại. Không hoàn tác được.', body: '',
      actions: [cancel, { label: 'Xoá giao dịch', kind: 'destructive', toast: 'Đã xoá giao dịch' }],
    }),
    'confirm-recipe': () => ({
      title: 'Xoá công thức này?', lead: 'Gà kho gừng cũng sẽ bị gỡ khỏi thực đơn. Không hoàn tác được.', body: '',
      actions: [cancel, { label: 'Xoá công thức', kind: 'destructive', toast: 'Đã xoá công thức Gà kho gừng' }],
    }),
    'budget-form': () => ({
      title: 'Ngân sách Ăn uống',
      body: field('chart-pie-slice', 'Ngân sách tháng', 'Ví dụ: 500.000', '2.600.000', '₫') + note('Đã dùng 2.397.000 ₫ (92%).'),
      actions: [cancel, { label: 'Lưu thay đổi', kind: 'primary', toast: 'Đã lưu ngân sách' }],
    }),
    'import-data': () => ({
      title: 'Nhập dữ liệu từ tệp này?', lead: 'Tệp có 1.240 dòng dữ liệu thuộc 14 mục. Dữ liệu đã có trên máy này được gộp với tệp, không bị xoá.', body: '',
      actions: [cancel, { label: 'Nhập dữ liệu', kind: 'primary', toast: 'Đã nhập 1.240 dòng dữ liệu' }],
    }),
    'suggest-plan': () => ({
      title: 'Gợi ý thực đơn', lead: 'Xem trước, đổi món nếu chưa ưng, rồi bấm Áp dụng để thêm vào thực đơn.',
      body: group('Bữa cần gợi ý', [['sang', 'Sáng'], ['trua', 'Trưa'], ['toi', 'Tối']], ['trua', 'toi'], true)
        + [['Thứ Bảy 10/10 · Trưa', 0], ['Thứ Bảy 10/10 · Tối', 1], ['Chủ Nhật 11/10 · Trưa', 2], ['Chủ Nhật 11/10 · Tối', 3]]
          .map(([slot, i]) => listRow(RECIPES[i % RECIPES.length].icon, RECIPES[i % RECIPES.length].name, slot, '', `<button type="button" class="btn ghost sm" data-toast="Đã đổi món">${ic('shuffle')}Đổi món</button>`)).join(''),
      actions: [{ label: 'Gợi ý lại tất cả', toast: 'Đã gợi ý lại' }, { label: 'Áp dụng', kind: 'primary', toast: 'Đã thêm 4 bữa vào thực đơn' }],
    }),
    'log-expense': () => ({
      title: 'Ghi khoản chi', lead: 'Ghi 452.000 ₫ tiền đi chợ từ 9/10 đến 11/10 thành một khoản chi.',
      body: group('Chọn danh mục', [['food', 'Ăn uống', 'fork-knife'], ['shopping', 'Mua sắm', 'shopping-bag'], ['home', 'Nhà ở', 'house-line']], 'food') + group('Chọn hình thức thanh toán', PAYMENTS, 'cash'),
      actions: [cancel, { label: 'Ghi khoản chi', kind: 'primary', toast: 'Đã ghi 452.000 ₫ vào Chi tiêu' }],
    }),
  };

  /* ---------- state cards used on the settings, today and error screens ---------- */
  const localDataCard = () => `<section class="card opt-card" aria-label="Dữ liệu trên máy">
    <div class="opt-head"><span class="cat-tile">${ic('database')}</span><div class="grow"><h2 class="t-title">Dữ liệu trên máy</h2><p class="t-sm secondary">Xuất ra một tệp để tự lưu giữ, nhập lại từ tệp đã xuất, hoặc nạp dữ liệu mẫu để thử ứng dụng.</p></div></div>
    <div class="gd-btns"><button type="button" class="btn outline" data-toast="Đã xuất dữ liệu">${ic('download-simple')}Xuất dữ liệu</button><button type="button" class="btn outline" data-dlg="import-data">${ic('upload-simple')}Nhập dữ liệu</button><button type="button" class="btn outline" data-toast="Đã nạp dữ liệu mẫu">${ic('sparkle')}Nạp dữ liệu mẫu</button></div></section>`;
  const firstRunCard = () => `<section class="card p6 gd-empty"><span class="hero-tile">${ic('sparkle')}</span><h2 class="t-title">Chưa có dữ liệu nào</h2><p class="t-sm secondary">Bạn có thể bắt đầu bằng cách thêm giao dịch hoặc công thức đầu tiên, hoặc nạp dữ liệu mẫu để xem ứng dụng hoạt động.</p>
    <div class="gd-btns"><button type="button" class="btn primary" data-toast="Mở form thêm giao dịch">${ic('plus')}Thêm giao dịch</button><button type="button" class="btn outline" data-toast="Mở form thêm công thức">${ic('book-open')}Thêm công thức</button><button type="button" class="btn outline" data-toast="Đã nạp dữ liệu mẫu">Nạp dữ liệu mẫu</button></div></section>`;
  const unknownPathCard = (name) => `<section class="card p6 gd-empty"><span class="hero-tile">${ic('compass')}</span><h2 class="t-title">${name ? 'Màn hình này đang được hoàn thiện' : 'Không tìm thấy trang này'}</h2>
    <p class="t-sm secondary">${name ? `Phần này của ${name} chưa sẵn sàng. Bạn vẫn dùng được các phần khác.` : 'Đường dẫn có thể đã cũ hoặc bị gõ sai.'}</p><button type="button" class="btn primary" data-go-today>Về Hôm nay</button></section>`;
  const syncProblemCard = (kind) => kind === 'unconfigured'
    ? `<section class="card p6 gd-empty"><span class="hero-tile">${ic('cloud-slash')}</span><h2 class="t-title">Chưa cấu hình đăng nhập Google</h2><p class="t-sm secondary">Bản này chưa có thông tin đăng nhập Google nên chưa đồng bộ được. Dữ liệu vẫn lưu trên máy này, bạn có thể xuất dữ liệu để lưu giữ.</p><p class="t-sm secondary">Nếu xoá dữ liệu trình duyệt hoặc đổi máy, bạn sẽ mất dữ liệu chưa xuất ra.</p><button type="button" class="btn outline" data-toast="Đã xuất dữ liệu">${ic('download-simple')}Xuất dữ liệu</button></section>`
    : `<section class="card p6 gd-empty"><span class="hero-tile">${ic('warning')}</span><h2 class="t-title">Cần đăng nhập lại Google</h2><p class="t-sm secondary">Phiên đăng nhập Google đã hết hạn. Dữ liệu trên máy này vẫn an toàn, các thay đổi sẽ được gửi đi sau khi bạn đăng nhập lại.</p><button type="button" class="btn primary" data-toast="Đã đăng nhập lại Google">${ic('google-logo')}Đăng nhập lại Google</button></section>`;
  const webReminderNotice = () => `<div class="well gd-notice">${ic('bell', 'lg')}<p class="t-sm">Ở bản này, nhắc nhở chỉ hiện khi ứng dụng đang mở. Khi bạn đóng ứng dụng, các giờ nhắc bên dưới sẽ chưa kêu.</p></div>`;

  /* ---------- rendering ---------- */
  const parts = (id) => DIALOGS[id]();
  const sheetHtml = (id) => {
    const d = parts(id);
    return `<div class="gd-head"><h2 class="t-title">${d.title}</h2>${d.lead ? `<p class="t-sm secondary">${d.lead}</p>` : ''}</div>`
      + `<div class="gd-body">${d.body}</div><div class="gd-foot">${d.actions.map(button).join('')}</div>`;
  };
  /* A static bottom sheet over a dimmed phone, for the mobile mockup. */
  const dialogPhone = (caption, id) => {
    const p = parts(id);
    return phone(caption, `<div class="scroll" style="opacity:.35"></div><div class="overlay"><div class="ov-sheet fixed"><div class="ov-head"><div class="grabber"></div><h2 class="t-title">${p.title}</h2>${p.lead ? `<p class="t-sm secondary">${p.lead}</p>` : ''}</div><div class="ov-body">${p.body}</div><div class="ov-foot gd-foot">${p.actions.map(button).join('')}</div></div></div>`, '', { bar: false });
  };

  const notify = (message) => (typeof toast === 'function' ? toast(message) : window.alert(message));
  function dialogElement() {
    let el = document.getElementById('genDlg');
    if (!el) { el = document.createElement('dialog'); el.id = 'genDlg'; document.body.appendChild(el); }
    return el;
  }
  function openDialog(id) {
    const el = dialogElement();
    el.innerHTML = `<div class="dlg gd-sheet">${sheetHtml(id)}</div>`;
    if (typeof hydrateIcons === 'function') hydrateIcons(el);
    if (!el.open) el.showModal();
  }
  function openCategoryPicker(ids, selected) {
    const el = dialogElement();
    el.innerHTML = `<div class="dlg gd-sheet"><div class="gd-head"><h2 class="t-title">Chọn hạng mục</h2></div><div class="gd-body">${categoryPickerBody(ids, selected)}</div><div class="gd-foot"><button type="button" class="btn outline">Đóng</button></div></div>`;
    if (!el.open) el.showModal();
    el.querySelector('[data-cat-search]').focus();
  }
  const closeDialog = () => { const el = document.getElementById('genDlg'); if (el && el.open) el.close(); };

  document.addEventListener('click', (e) => {
    const t = e.target;
    const pill = t.closest('.gd-pills .pill');
    if (pill) { const box = pill.parentElement; if (box.hasAttribute('data-multi')) pill.classList.toggle('on'); else { box.querySelectorAll('.pill').forEach((p) => p.classList.toggle('on', p === pill)); } return; }
    const sw = t.closest('.gd-switch .switch');
    if (sw) { sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true')); return; }
    const step = t.closest('[data-step]');
    if (step) {
      const box = step.closest('.gd-group'); const value = box.querySelector('[data-step-value]');
      const next = Math.min(28, Math.max(1, +value.textContent + +step.dataset.step)); value.textContent = next; box.querySelector('[data-step-text]').textContent = day(next); return;
    }
    const picked = t.closest('[data-pick-cat]');
    if (picked) { document.dispatchEvent(new CustomEvent('category-picked', { detail: { id: picked.dataset.pickCat } })); closeDialog(); return; }
    if (!window.DIALOGS_INTERACTIVE) return;
    const open = t.closest('[data-dlg]');
    if (open) return openDialog(open.dataset.dlg);
    const go = t.closest('[data-go]');
    if (go) return openDialog(go.dataset.go);
    const done = t.closest('[data-toast]');
    if (done) { closeDialog(); return notify(done.dataset.toast); }
    if (t.closest('#genDlg .gd-foot .btn')) closeDialog();
  });

  document.addEventListener('input', (e) => {
    if (!e.target.matches('[data-cat-search]')) return;
    const box = e.target.closest('dialog, .overlay, .gd-sheet') || document;
    const query = fold(e.target.value.trim()); let shown = 0;
    box.querySelectorAll('[data-key]').forEach((row) => { const hit = !query || row.dataset.key.includes(query); row.hidden = !hit; if (hit) shown++; });
    const none = box.querySelector('.gd-none'); if (none) none.hidden = shown > 0;
  });

  window.DIALOG_IDS = Object.keys(DIALOGS);
  Object.assign(window, { openDialog, openCategoryPicker, categoryPickerBody, dialogPhone, dialogSheetHtml: sheetHtml, localDataCard, firstRunCard, unknownPathCard, syncProblemCard, webReminderNotice, PAYMENTS });
})();
