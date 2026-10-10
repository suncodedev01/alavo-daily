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
  const tools = (go, remove) => `<button type="button" class="iconbtn" ${go ? `data-dlg-go="${go}"` : ''} aria-label="Sửa">${ic('pencil-simple')}</button><button type="button" class="iconbtn" ${remove.go ? `data-dlg-go="${remove.go}"` : `data-toast="${remove.toast}"`} aria-label="Xoá">${ic('trash')}</button>`;
  const choice = (id, title, sub, on) => `<button type="button" class="gd-choice ${on ? 'on' : ''}" role="radio" aria-checked="${on}" data-choice="${id}"><b>${title}</b><small>${sub}</small></button>`;
  const listRow = (tile, title, sub, right, actions) =>
    `<div class="gd-row"><span class="cat-tile sm">${ic(tile)}</span><span class="grow"><b>${title}</b><small>${sub}</small></span>${right ? `<span class="gd-amt">${right}</span>` : ''}${actions || ''}</div>`;
  const button = (a) => `<button type="button" class="btn ${a.kind || 'outline'}" ${a.go ? `data-dlg-go="${a.go}"` : ''} ${a.toast ? `data-toast="${a.toast}"` : ''}>${a.label}</button>`;
  const cancel = { label: 'Huỷ' };

  const day = (d) => `Ngày ${d} hằng tháng`;
  const dayStepper = (d, label = 'Ngày trả trong tháng', template = 'Ngày {d} hằng tháng') => `<div class="gd-group" data-step-template="${template}"><span class="eyebrow">${label}</span><div class="gd-stepper"><button type="button" data-step="-1" aria-label="Lùi một ngày">${ic('minus')}</button><b data-step-value>${d}</b><button type="button" data-step="1" aria-label="Tới một ngày">${ic('plus')}</button></div><p class="t-xs muted" data-step-text>${template.replace('{d}', d)}</p></div>`;

  const fold = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  const categoryRows = (ids, selected) => ids.map((id) => `<button type="button" class="gd-row gd-pick" data-pick-cat="${id}" data-key="${fold(CATS[id].name)}"><span class="cat-tile sm">${ic(CATS[id].icon)}</span><span class="grow"><b>${CATS[id].name}</b></span>${id === selected ? ic('check') : ''}</button>`).join('');
  const categoryPickerBody = (ids, selected) => `<label class="gd-field"><span class="field">${ic('magnifying-glass')}<input data-cat-search id="acSearch" placeholder="Tìm hạng mục" aria-label="Tìm hạng mục" autocomplete="off"></span></label><div class="gd-list">${categoryRows(ids, selected)}</div><p class="t-sm muted gd-none" hidden>Không tìm thấy hạng mục nào.</p>`;
  const expenseIds = () => Object.keys(CATS).filter((id) => !isIncomeCat(id));

  const QUICK_COUNT = 6;
  const budgetText = (id) => (CATS[id].budget ? `Ngân sách ${vnd(CATS[id].budget)}` : 'Chưa đặt ngân sách');
  const sortRow = ([id, name, icon]) => `<div class="gd-row gd-sort" data-sort-id="${id}"><span class="gd-rank"></span><span class="cat-tile sm">${ic(icon)}</span><span class="grow"><b>${name}</b></span><button type="button" class="iconbtn" data-move="-1" aria-label="Đưa ${name} lên">${ic('caret-up')}</button><button type="button" class="iconbtn" data-move="1" aria-label="Đưa ${name} xuống">${ic('caret-down')}</button></div>`;
  const dividerHtml = () => `<p class="gd-divider">Từ đây trở xuống chỉ hiện trong "Tất cả hạng mục"</p>`;
  const sortListHtml = (items, quick = Infinity) => {
    const rows = items.map(sortRow);
    if (quick < rows.length) rows.splice(quick, 0, dividerHtml());
    return `<div class="gd-sortlist" data-quick="${quick}">${rows.join('')}</div>`;
  };
  const categoryItems = () => expenseIds().map((id) => [id, CATS[id].name, CATS[id].icon]);
  function refreshSortList(list) {
    const quick = list.dataset.quick === 'Infinity' ? Infinity : +list.dataset.quick;
    list.querySelectorAll('.gd-divider').forEach((el) => el.remove());
    const rows = [...list.querySelectorAll('.gd-sort')];
    rows.forEach((row, i) => { row.querySelector('.gd-rank').textContent = i < quick ? i + 1 : ''; });
    if (rows[quick]) rows[quick].insertAdjacentHTML('beforebegin', dividerHtml());
  }
  function moveSortRow(button) {
    const row = button.closest('.gd-sort'); const list = row.parentElement;
    const rows = [...list.querySelectorAll('.gd-sort')]; const at = rows.indexOf(row) + +button.dataset.move;
    if (!rows[at]) return;
    if (+button.dataset.move < 0) list.insertBefore(row, rows[at]); else rows[at].after(row);
    refreshSortList(list);
  }
  const categoryManageRows = (ids) => ids.map((id) => listRow(CATS[id].icon, CATS[id].name, budgetText(id), '', tools('category-form', { go: 'category-delete' }))).join('');

  const DIALOGS = {
    'category-picker': () => ({
      title: 'Chọn hạng mục', body: categoryPickerBody(expenseIds(), 'food'),
      actions: [{ label: 'Đóng' }, { label: 'Hạng mục mới', kind: 'primary', toast: 'Mở form hạng mục mới' }],
    }),
    'categories': () => ({
      title: 'Quản lý hạng mục', lead: 'Hạng mục giúp bạn biết tiền đi đâu. Đổi tên, đổi biểu tượng hoặc đặt ngân sách cho từng hạng mục.',
      body: `<div class="gd-group"><span class="eyebrow">Chi tiêu</span>${categoryManageRows(expenseIds())}</div><div class="gd-group"><span class="eyebrow">Thu nhập</span>${categoryManageRows(Object.keys(CATS).filter(isIncomeCat))}</div>`,
      actions: [{ label: 'Đóng' }, { label: 'Hạng mục mới', kind: 'primary', go: 'category-form' }],
    }),
    'category-form': () => ({
      title: 'Hạng mục mới',
      body: field('tag', 'Tên hạng mục', 'Tên hạng mục (ví dụ: Thú cưng)') + group('Loại', [['out', 'Chi tiêu'], ['in', 'Thu nhập']], 'out')
        + group('Biểu tượng', ICON_CHOICES.map((n) => [n, '', n]), 'tag') + field('chart-pie-slice', 'Ngân sách tháng (không bắt buộc)', 'Ví dụ: 500.000', '', '₫'),
      actions: [cancel, { label: 'Lưu hạng mục', kind: 'primary', toast: 'Đã lưu hạng mục' }],
    }),
    'category-delete': () => ({
      title: 'Xoá hạng mục Thú cưng?', lead: 'Hạng mục này đã có giao dịch. Bạn muốn làm gì với chúng?',
      body: `<div class="gd-choices" role="radiogroup" aria-label="Xử lý giao dịch của hạng mục">${choice('move', 'Chuyển sang hạng mục khác', 'Tổng chi tiêu và báo cáo không đổi.', true)}${choice('delete', 'Xoá luôn các giao dịch', 'Tổng chi tiêu và báo cáo sẽ giảm tương ứng.', false)}</div>`
        + `<div data-show-for="move">${group('Hạng mục nhận giao dịch', expenseIds().filter((id) => id !== 'pets').slice(0, 6).map((id) => [id, CATS[id].name, CATS[id].icon]), 'food')}</div>`,
      actions: [cancel, { label: 'Xoá', kind: 'destructive', toast: 'Đã xoá hạng mục Thú cưng' }],
    }),
    'quick-categories': () => ({
      title: 'Hạng mục hiện ở ngoài', lead: `${QUICK_COUNT} hạng mục đầu tiên hiện ngay khi bạn ghi chép. Các hạng mục còn lại nằm trong "Tất cả hạng mục". Bấm mũi tên để đổi thứ tự.`,
      body: sortListHtml(categoryItems(), QUICK_COUNT),
      actions: [cancel, { label: 'Lưu thứ tự', kind: 'primary', toast: 'Đã lưu thứ tự hạng mục' }],
    }),
    'entry-defaults': () => ({
      title: 'Mặc định khi ghi chép', lead: 'Ứng dụng mở sẵn những lựa chọn này để bạn ghi nhanh hơn. Bạn vẫn đổi được ở từng giao dịch.',
      body: group('Chi từ ví', WALLETS.map((w) => [w.id, w.name, WALLET_ICON[w.id]]), 'cash') + group('Thanh toán bằng', PAYMENTS.map(([id, label, icon]) => [id, label, icon]), 'cash')
        + toggle('Nhớ hạng mục vừa dùng', 'Lần sau mở sẵn hạng mục bạn vừa chọn', true) + toggle('Ghi chú tự gợi ý', 'Gợi ý từ những ghi chú bạn đã dùng', true),
      actions: [cancel, { label: 'Lưu', kind: 'primary', toast: 'Đã lưu mặc định' }],
    }),
    'month-start': () => ({
      title: 'Ngày bắt đầu tháng', lead: 'Ngân sách và báo cáo tính theo tháng của bạn. Nếu nhận lương vào ngày 5, hãy chọn ngày 5.',
      body: dayStepper(1, 'Tháng bắt đầu từ ngày', 'Tháng tính từ ngày {d} đến hết ngày trước đó của tháng sau'),
      actions: [cancel, { label: 'Lưu', kind: 'primary', toast: 'Đã lưu ngày bắt đầu tháng' }],
    }),
    'spend-reminders': () => ({
      title: 'Nhắc nhở chi tiêu', lead: 'Chọn những lúc bạn muốn được nhắc.',
      body: toggle('Gần hết ngân sách', 'Báo khi một hạng mục dùng từ 85% ngân sách', true) + toggle('Vượt ngân sách', 'Báo ngay khi chi nhiều hơn ngân sách', true)
        + toggle('Khoản định kỳ sắp đến hạn', 'Nhắc trước hạn để bạn kịp chuẩn bị', true) + group('Nhắc trước', [['1', '1 ngày'], ['3', '3 ngày'], ['7', '7 ngày']], '3')
        + toggle('Nhắc ghi chép mỗi tối', 'Nhắc lúc 21:00 nếu hôm nay bạn chưa ghi gì', false) + webReminderNotice(),
      actions: [cancel, { label: 'Lưu', kind: 'primary', toast: 'Đã lưu cài đặt nhắc nhở' }],
    }),
    'display-options': () => ({
      title: 'Cách hiển thị', lead: 'Chọn thông tin hiện ở màn Tổng quan.',
      body: toggle('Ẩn số dư khi mở ứng dụng', 'Số dư hiện dấu ••••• cho đến khi bạn bấm hình con mắt', false) + toggle('Hiện số dư từng tài khoản', 'Danh sách các khoản tiền ở Tổng quan', true)
        + toggle('Hiện giao dịch gần đây', 'Ba giao dịch mới nhất ở Tổng quan', true) + toggle('Hiện gợi ý về ngân sách', 'Thẻ "Cần bạn quyết định" khi một hạng mục sắp hết', true),
      actions: [cancel, { label: 'Lưu', kind: 'primary', toast: 'Đã lưu cách hiển thị' }],
    }),
    'recipe-tags': () => ({
      title: 'Nhóm món', lead: 'Nhóm giúp bạn lọc công thức nhanh. Một công thức có thể thuộc nhiều nhóm.',
      body: ['Món chính', 'Canh', 'Rau', 'Nhanh'].map((t) => listRow('tag', t, `${RECIPES.filter((r) => r.tags.includes(t)).length} công thức`, '', tools('tag-form', { toast: 'Công thức vẫn được giữ, chỉ bỏ khỏi nhóm này' }))).join('')
        + note('"Tất cả" và "Yêu thích" luôn có sẵn, không cần thêm.'),
      actions: [{ label: 'Đóng' }, { label: 'Nhóm mới', kind: 'primary', go: 'tag-form' }],
    }),
    'tag-form': () => ({
      title: 'Nhóm món mới', body: field('tag', 'Tên nhóm', 'Tên nhóm (ví dụ: Món nướng)'),
      actions: [cancel, { label: 'Lưu nhóm', kind: 'primary', toast: 'Đã lưu nhóm món' }],
    }),
    'aisles': () => ({
      title: 'Khu mua sắm', lead: 'Danh sách đi chợ xếp theo các khu này, đúng thứ tự bạn đi trong chợ. Bấm mũi tên để đổi thứ tự.',
      body: sortListHtml(AISLES.map((a, i) => [a, a, ['knife', 'bowl-food', 'cooking-pot', 'tag'][i] || 'tag'])),
      actions: [{ label: 'Huỷ' }, { label: 'Lưu thứ tự', kind: 'primary', toast: 'Đã lưu thứ tự khu mua sắm' }],
    }),
    'household': () => ({
      title: 'Khẩu phần mặc định', lead: 'Công thức tự đổi lượng nguyên liệu theo số người trong nhà.',
      body: group('Số người ăn', ['1', '2', '3', '4', '5', '6'].map((n) => [n, n]), String(HOUSEHOLD)) + toggle('Nhân đôi lượng khi nấu cho khách', 'Hỏi lại số người mỗi khi bạn thêm món vào thực đơn', false),
      actions: [cancel, { label: 'Lưu', kind: 'primary', toast: 'Đã lưu khẩu phần mặc định' }],
    }),
    'meal-slots': () => ({
      title: 'Bữa trong ngày', lead: 'Chọn những bữa bạn muốn lên thực đơn.',
      body: toggle('Bữa sáng', 'Hiện ở thực đơn tuần', false) + toggle('Bữa trưa', 'Hiện ở thực đơn tuần', true) + toggle('Bữa tối', 'Hiện ở thực đơn tuần', true) + toggle('Ăn vặt', 'Hiện ở thực đơn tuần', false),
      actions: [cancel, { label: 'Lưu', kind: 'primary', toast: 'Đã lưu các bữa trong ngày' }],
    }),
    'cook-settings': () => ({
      title: 'Chế độ nấu ăn', lead: 'Tuỳ chỉnh màn hình khi bạn đang đứng bếp.',
      body: group('Cỡ chữ các bước', [['m', 'Vừa'], ['l', 'Lớn'], ['xl', 'Rất lớn']], 'l') + toggle('Giữ màn hình sáng', 'Màn hình không tự tắt khi bạn đang nấu', true) + toggle('Báo khi hết giờ', 'Phát tiếng kêu khi đồng hồ hẹn giờ về 0', true)
        + note('Một số trình duyệt không giữ được màn hình sáng. Khi đó màn hình có thể tự tắt.'),
      actions: [cancel, { label: 'Lưu', kind: 'primary', toast: 'Đã lưu cài đặt nấu ăn' }],
    }),
    'cook-reminders': () => ({
      title: 'Nhắc nấu ăn', lead: 'Chọn những lúc bạn muốn được nhắc.',
      body: toggle('Nhắc nấu bữa tối', 'Kèm tên món trong thực đơn hôm nay', true) + group('Nhắc lúc', [['17', '17:00'], ['1730', '17:30'], ['18', '18:00']], '1730')
        + toggle('Nhắc đi chợ', 'Nhắc khi danh sách đi chợ còn món chưa mua', false) + webReminderNotice(),
      actions: [cancel, { label: 'Lưu', kind: 'primary', toast: 'Đã lưu cài đặt nhắc nhở' }],
    }),
    'shopping-cost': () => ({
      title: 'Ghi chi phí đi chợ', lead: 'Khi bạn bấm "Ghi vào Chi tiêu", khoản chi được ghi với những lựa chọn này.',
      body: group('Chi từ ví', WALLETS.map((w) => [w.id, w.name, WALLET_ICON[w.id]]), 'cash') + group('Hạng mục', [['food', 'Ăn uống', 'fork-knife'], ['home', 'Nhà ở', 'house-line'], ['shopping', 'Mua sắm', 'shopping-bag']], 'food')
        + toggle('Hỏi lại trước khi ghi', 'Cho bạn sửa số tiền trước khi ghi vào Chi tiêu', true),
      actions: [cancel, { label: 'Lưu', kind: 'primary', toast: 'Đã lưu' }],
    }),
    'estimate-form': () => ({
      title: 'Dự toán mới', lead: 'Đặt tên cho việc bạn sắp chi, rồi liệt kê từng khoản cần mua.',
      body: field('calculator', 'Tên dự toán', 'Tên dự toán (ví dụ: Du lịch Đà Lạt)') + group('Bắt đầu từ mẫu', ESTIMATE_TEMPLATES.map((tpl) => [tpl.label, tpl.label, tpl.icon]), 'Du lịch')
        + note('Mẫu Du lịch gợi ý sẵn các nhóm Đi lại, Chỗ ở, Ăn uống và vui chơi, cùng số người, số ngày, số đêm để nhân tự động. Bạn thêm, sửa hay xoá tuỳ ý.')
        + toggle('Chừa khoản dự phòng', 'Việc lớn thường phát sinh thêm ngoài dự tính', true),
      actions: [cancel, { label: 'Tạo dự toán', kind: 'primary', toast: 'Đã tạo dự toán' }],
    }),
    'estimate-item-form': () => ({
      title: 'Thêm khoản cần mua',
      body: field('tag', 'Tên khoản', 'Tên khoản (ví dụ: Thuê xe)') + field('coins', 'Đơn giá', '0', '', '₫') + field('repeat', 'Số lượng', '1')
        + group('Nhân theo', ESTIMATES[0].factors.map((f) => [f.id, `Số ${f.label}`]), [], true) + note('Chọn nếu số tiền thay đổi theo số khách, số người hoặc số ngày.')
        + group('Mức cần thiết', [['must', 'Cần có'], ['should', 'Nên có'], ['nice', 'Có thì tốt']], 'should') + note('Khi tiền chưa đủ, ứng dụng gợi ý bỏ trước các khoản "Có thì tốt".')
        + group('Nhóm', [['a', 'Tiệc cưới'], ['b', 'Hình ảnh'], ['c', 'Nhóm mới']], 'a'),
      actions: [cancel, { label: 'Lưu khoản', kind: 'primary', toast: 'Đã lưu khoản cần mua' }],
    }),
    'estimate-paid': () => ({
      title: 'Tiền đã trả cho khoản này', lead: 'Nhập số tiền bạn đã trả, kể cả tiền đặt cọc. Phần còn lại vẫn được tính là cần chi.',
      body: field('coins', 'Số tiền đã trả', '0', '', '₫') + group('Điền nhanh', [['all', 'Trả đủ'], ['third', 'Cọc 30%'], ['none', 'Chưa trả']], 'third')
        + `<div class="gd-choices" role="radiogroup" aria-label="Cách ghi khoản đã trả">${choice('record', 'Ghi vào Chi tiêu', 'Tạo giao dịch mới và trừ tiền từ ví bạn chọn.', true)}${choice('mark', 'Chỉ cập nhật dự toán', 'Dùng khi bạn đã tự ghi giao dịch này rồi.', false)}</div>`
        + `<div data-show-for="record">${group('Chi từ ví', WALLETS.map((w) => [w.id, w.name, WALLET_ICON[w.id]]), 'tcb')}</div>`,
      actions: [cancel, { label: 'Lưu', kind: 'primary', toast: 'Đã cập nhật tiền đã trả' }],
    }),
    'estimate-sources': () => ({
      title: 'Tính tiền từ ví nào', lead: 'Chỉ những ví bạn bật mới được tính là tiền đang có. Bạn có thể để riêng một ví cho việc này.',
      body: WALLETS.map((w) => toggle(w.name, vnd(w.balance), true)).join(''),
      actions: [cancel, { label: 'Lưu', kind: 'primary', toast: 'Đã lưu' }],
    }),
    'estimate-income-form': () => ({
      title: 'Khoản thu dự kiến', lead: 'Tiền bạn dự kiến nhận để bù cho việc này, ví dụ tiền mừng, tiền thưởng, người thân hỗ trợ.',
      body: field('arrow-down-left', 'Tên khoản thu', 'Tên khoản thu (ví dụ: Tiền mừng)') + field('coins', 'Số tiền dự kiến', '0', '', '₫')
        + note('Khoản thu dự kiến chưa chắc chắn, nên ứng dụng luôn cho bạn xem thêm kết quả khi chưa tính khoản này.'),
      actions: [cancel, { label: 'Lưu khoản thu', kind: 'primary', toast: 'Đã lưu khoản thu dự kiến' }],
    }),
    'estimate-contingency': () => ({
      title: 'Dự phòng phát sinh', lead: 'Việc lớn thường phát sinh thêm ngoài dự tính. Chừa sẵn một phần trăm để không bị hụt.',
      body: group('Chừa thêm', [['0', 'Không'], ['5', '5%'], ['10', '10%'], ['15', '15%'], ['20', '20%']], '10'),
      actions: [cancel, { label: 'Lưu', kind: 'primary', toast: 'Đã lưu' }],
    }),
    'estimate-factors': () => ({
      title: 'Thông số của dự toán', lead: 'Những con số dùng để nhân tự động, ví dụ số khách hay số ngày. Đổi một lần, mọi khoản liên quan tự tính lại.',
      body: ESTIMATES[0].factors.map((f) => field('users', `Số ${f.label}`, '0', String(f.value))).join('') + `<button type="button" class="btn outline" data-dlg-go="factor-form">${ic('plus')}Thêm thông số</button>`,
      actions: [cancel, { label: 'Lưu', kind: 'primary', toast: 'Đã cập nhật thông số' }],
    }),
    'factor-form': () => ({
      title: 'Thêm thông số', lead: 'Ví dụ số phòng, số tuần, số bàn.',
      body: field('tag', 'Tên thông số', 'Tên thông số (ví dụ: phòng)') + field('users', 'Giá trị', '1', '1'),
      actions: [cancel, { label: 'Lưu thông số', kind: 'primary', toast: 'Đã thêm thông số' }],
    }),
    'estimate-delete': () => ({
      title: 'Xoá dự toán Đám cưới?', lead: 'Danh sách các khoản sẽ mất. Những giao dịch đã ghi vào Chi tiêu vẫn được giữ.', body: '',
      actions: [cancel, { label: 'Xoá dự toán', kind: 'destructive', toast: 'Đã xoá dự toán Đám cưới' }],
    }),
    'wallets': () => ({
      title: 'Quản lý ví', lead: 'Ví là nơi tiền của bạn đang nằm: tài khoản ngân hàng, ví điện tử hoặc tiền mặt.',
      body: WALLETS.map((w) => listRow(WALLET_ICON[w.id], w.name, w.kind, vnd(w.balance), tools('wallet-form', { go: 'wallet-delete' }))).join('')
        + listRow('piggy-bank', 'Tiết kiệm', 'Chưa có giao dịch', vnd(0), tools('wallet-form', { go: 'wallet-delete-empty' })),
      actions: [{ label: 'Đóng' }, { label: 'Thêm ví', kind: 'primary', go: 'wallet-form' }],
    }),
    'wallet-delete': () => ({
      title: 'Xoá ví Tiền mặt?', lead: 'Ví này đã có giao dịch. Bạn muốn làm gì với chúng?',
      body: `<div class="gd-choices" role="radiogroup" aria-label="Xử lý giao dịch của ví">${choice('move', 'Chuyển sang ví khác', 'Tổng tiền và báo cáo không đổi.', true)}${choice('delete', 'Xoá luôn các giao dịch', 'Tổng chi tiêu và báo cáo sẽ giảm tương ứng.', false)}</div>`
        + `<div data-show-for="move">${group('Ví nhận giao dịch', WALLETS.filter((w) => w.id !== 'cash').map((w) => [w.id, `${w.name} · ${vnd(w.balance)}`, WALLET_ICON[w.id]]), 'tcb')}</div>`,
      actions: [cancel, { label: 'Xoá', kind: 'destructive', toast: 'Đã xoá ví Tiền mặt' }],
    }),
    'wallet-delete-empty': () => ({
      title: 'Xoá ví Tiết kiệm?', lead: 'Ví này chưa có giao dịch nào, nên xoá luôn được.', body: '',
      actions: [cancel, { label: 'Xoá ví', kind: 'destructive', toast: 'Đã xoá ví Tiết kiệm' }],
    }),
    'payments': () => ({
      title: 'Hình thức thanh toán', lead: 'Cách bạn trả tiền, ví dụ tiền mặt, chuyển khoản hay quẹt thẻ. Mỗi khoản chi chọn một hình thức.',
      body: PAYMENTS.map(([id, label, icon], i) => listRow(icon, label, i === 0 ? 'Mặc định' : `Dùng cho ${[18, 7][i - 1] || 0} giao dịch`, '', i === 0
        ? `<button type="button" class="iconbtn" data-dlg-go="payment-form" aria-label="Sửa">${ic('pencil-simple')}</button>` : tools('payment-form', { go: 'payment-delete' }))).join('')
        + note('Tiền mặt là hình thức mặc định, không xoá được.'),
      actions: [{ label: 'Đóng' }, { label: 'Thêm hình thức', kind: 'primary', go: 'payment-form' }],
    }),
    'payment-form': () => ({
      title: 'Thêm hình thức thanh toán',
      body: field('credit-card', 'Tên hình thức', 'Tên hình thức (ví dụ: Thẻ tín dụng)')
        + group('Biểu tượng', [['money', 'Tiền mặt', 'money'], ['bank', 'Ngân hàng', 'bank'], ['device-mobile', 'Điện thoại', 'device-mobile'], ['credit-card', 'Thẻ', 'credit-card'], ['coins', 'Xu', 'coins']], 'credit-card'),
      actions: [cancel, { label: 'Lưu hình thức', kind: 'primary', toast: 'Đã lưu hình thức thanh toán' }],
    }),
    'payment-delete': () => ({
      title: 'Xoá hình thức Chuyển khoản?', lead: 'Các giao dịch đã dùng hình thức này vẫn được giữ, chỉ không còn hình thức gắn kèm.', body: '',
      actions: [cancel, { label: 'Xoá hình thức', kind: 'destructive', toast: 'Đã xoá hình thức Chuyển khoản' }],
    }),
    'bank-accounts': () => ({
      title: 'Số tài khoản ngân hàng', lead: 'Lưu số tài khoản của các ví ngân hàng để tra cứu và sao chép khi cần. Ứng dụng không kết nối với ngân hàng.',
      body: WALLETS.filter((w) => w.account).map((w) => listRow('bank', w.name, `${maskAccount(w.account)} · ${w.kind}`, '', `<button type="button" class="btn outline sm" data-toast="Đã sao chép số tài khoản">${ic('file-arrow-down')}Sao chép</button>`)).join('')
        + note('Sửa số tài khoản trong màn Tài khoản, ở ví loại Tài khoản.'),
      actions: [{ label: 'Đóng' }, { label: 'Mở màn Tài khoản', kind: 'primary', toast: 'Mở màn Tài khoản' }],
    }),
    'wallet-form': () => ({
      title: 'Thêm ví',
      body: field('wallet', 'Tên ví', 'Tên ví (ví dụ: Techcombank)') + group('Loại ví', WALLET_KINDS, 'bank') + field('bank', 'Số tài khoản (không bắt buộc)', 'Chỉ cho ví loại Tài khoản') + note('Số tài khoản chỉ để bạn tra cứu, ứng dụng không dùng nó để kết nối ngân hàng.') + field('coins', 'Số dư ban đầu', '0', '', '₫'),
      actions: [cancel, { label: 'Lưu ví', kind: 'primary', toast: 'Đã lưu ví' }],
    }),
    'bills': () => ({
      title: 'Khoản định kỳ', lead: 'Các khoản phải trả hằng tháng như tiền mạng, điện hay thẻ tín dụng.',
      body: UPCOMING.map((u, i) => listRow(u.icon, u.title, day([12, 15, 18][i]), vnd(u.amt), tools('bill-form', { toast: 'Khoản này sẽ không còn xuất hiện trong mục sắp đến hạn' }))).join('') + note('Thêm khoản phải trả hằng tháng để được nhắc trước hạn.'),
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

  /* ---------- Tài khoản and Khác (main menu of the spending module) ---------- */
  const maskAccount = (number) => `•••• ${number.slice(-4)}`;
  const accountCardsHtml = () => WALLETS.map((w) => `<section class="card gd-account"><div class="gd-row"><span class="cat-tile">${ic(WALLET_ICON[w.id])}</span><span class="grow"><b>${w.name}</b><small>${w.kind}${w.account ? ' · ' + maskAccount(w.account) : ''}</small></span><span class="gd-amt">${vnd(w.balance)}</span></div>
    <div class="gd-btns"><button type="button" class="btn outline sm" data-dlg="wallet-form">${ic('pencil-simple')}Sửa</button><button type="button" class="btn outline sm" data-dlg="wallet-delete">${ic('trash')}Xoá</button></div></section>`).join('');
  const MORE_BY_MODULE = {
    spend: () => [
    ['Hạng mục', [
      ['tag', 'Quản lý hạng mục', `${Object.keys(CATS).length} hạng mục chi và thu`, { dlg: 'categories' }],
      ['star', 'Hạng mục hiện ở ngoài', 'Chọn và sắp xếp hạng mục hiện ngay khi ghi chép', { dlg: 'quick-categories' }],
    ]],
    ['Kế hoạch', [
      ['calculator', 'Dự toán', 'Liệt kê việc lớn cần chi và xem tiền đã đủ chưa', { view: 'estimates' }],
      ['target', 'Mục tiêu tiết kiệm', 'Đặt mục tiêu và để dành từng chút một', { view: 'goals' }],
      ['chart-pie-slice', 'Ngân sách', 'Giới hạn chi theo hạng mục', { view: 'budgets' }],
      ['repeat', 'Khoản định kỳ', 'Nhắc các khoản phải trả hằng tháng', { dlg: 'bills' }],
      ['calendar-check', 'Ngày bắt đầu tháng', 'Tháng tính từ ngày mấy, hợp với ngày nhận lương', { dlg: 'month-start' }],
    ]],
    ['Tài khoản và thanh toán', [
      ['credit-card', 'Hình thức thanh toán', 'Tiền mặt, chuyển khoản, ví điện tử', { dlg: 'payments' }],
      ['bank', 'Số tài khoản ngân hàng', 'Lưu số tài khoản để tra cứu và sao chép', { dlg: 'bank-accounts' }],
    ]],
    ['Tuỳ chỉnh', [
      ['sliders-horizontal', 'Mặc định khi ghi chép', 'Ví, hình thức thanh toán và hạng mục mở sẵn', { dlg: 'entry-defaults' }],
      ['bell-simple', 'Nhắc nhở chi tiêu', 'Gần hết ngân sách, khoản sắp đến hạn, nhắc ghi chép', { dlg: 'spend-reminders' }],
      ['eye', 'Cách hiển thị', 'Ẩn số dư và chọn thông tin hiện ở Tổng quan', { dlg: 'display-options' }],
    ]],
    ['Dữ liệu', [
      ['upload-simple', 'Nhập sao kê ngân hàng', 'Thêm giao dịch từ tệp sao kê', { view: 'import' }],
      ['download-simple', 'Xuất ra bảng tính', 'Tải chi tiêu về máy', { toast: 'Đã xuất ra bảng tính (bản mẫu)' }],
    ]],
  ],
    food: () => [
      ['Công thức', [
        ['heart', 'Món yêu thích', `${RECIPES.filter((r) => r.fav).length} công thức bạn đã đánh dấu`, { view: 'recipes', tag: 'Yêu thích' }],
        ['tag', 'Nhóm món', 'Món chính, canh, rau, nhanh... để lọc công thức', { dlg: 'recipe-tags' }],
        ['link', 'Nhập công thức', 'Từ trang web hoặc tự gõ', { dlg: 'import-data' }],
      ]],
      ['Thực đơn và đi chợ', [
        ['users', 'Khẩu phần mặc định', `Đang nấu cho ${HOUSEHOLD} người`, { dlg: 'household' }],
        ['calendar-blank', 'Bữa trong ngày', 'Chọn những bữa hiện ở thực đơn tuần', { dlg: 'meal-slots' }],
        ['shopping-bag', 'Khu mua sắm', `${AISLES.length} khu, xếp theo thứ tự đi chợ`, { dlg: 'aisles' }],
        ['wallet', 'Ghi chi phí đi chợ', 'Ví và hạng mục khi ghi vào Chi tiêu', { dlg: 'shopping-cost' }],
      ]],
      ['Tuỳ chỉnh', [
        ['cooking-pot', 'Chế độ nấu ăn', 'Cỡ chữ, giữ màn hình sáng, báo hết giờ', { dlg: 'cook-settings' }],
        ['bell-simple', 'Nhắc nấu ăn', 'Nhắc nấu bữa tối và nhắc đi chợ', { dlg: 'cook-reminders' }],
      ]],
      ['Dữ liệu', [
        ['download-simple', 'Xuất công thức', 'Tải công thức về máy', { toast: 'Đã xuất công thức (bản mẫu)' }],
      ]],
    ],
  };
  const trigger = (t) => (t.view ? `data-view="${t.view}" ${t.tag ? `data-set-tag="${t.tag}"` : ''}` : t.dlg ? `data-dlg="${t.dlg}"` : `data-toast="${t.toast}"`);
  const moreMenuHtml = (moduleId = 'spend') => MORE_BY_MODULE[moduleId]().map(([title, rows]) => `<section class="card p4"><span class="eyebrow">${title}</span>${rows.map(([icon, label, sub, t]) => `<button type="button" class="gd-row gd-pick" ${trigger(t)}><span class="cat-tile sm">${ic(icon)}</span><span class="grow"><b>${label}</b><small>${sub}</small></span>${ic('caret-right')}</button>`).join('')}</section>`).join('');

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
    el.querySelectorAll('.gd-sortlist').forEach(refreshSortList);
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
    const pickedChoice = t.closest('.gd-choice');
    if (pickedChoice) {
      const root = pickedChoice.closest('.gd-body, .ov-body, .gd-sheet') || document;
      root.querySelectorAll('.gd-choice').forEach((c) => { const on = c === pickedChoice; c.classList.toggle('on', on); c.setAttribute('aria-checked', String(on)); });
      root.querySelectorAll('[data-show-for]').forEach((el) => { el.hidden = el.dataset.showFor !== pickedChoice.dataset.choice; });
      return;
    }
    const sw = t.closest('.gd-switch .switch');
    if (sw) { sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true')); return; }
    const step = t.closest('[data-step]');
    if (step) {
      const box = step.closest('.gd-group'); const value = box.querySelector('[data-step-value]');
      const next = Math.min(28, Math.max(1, +value.textContent + +step.dataset.step)); value.textContent = next; box.querySelector('[data-step-text]').textContent = box.dataset.stepTemplate.replace('{d}', next); return;
    }
    const mover = t.closest('[data-move]');
    if (mover) { moveSortRow(mover); return; }
    const picked = t.closest('[data-pick-cat]');
    if (picked) { document.dispatchEvent(new CustomEvent('category-picked', { detail: { id: picked.dataset.pickCat } })); closeDialog(); return; }
    if (!window.DIALOGS_INTERACTIVE) return;
    const open = t.closest('[data-dlg]');
    if (open) return openDialog(open.dataset.dlg);
    const go = t.closest('[data-dlg-go]');
    if (go) return openDialog(go.dataset.dlgGo);
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

  document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('.gd-sortlist').forEach(refreshSortList));
  window.DIALOG_IDS = Object.keys(DIALOGS);
  Object.assign(window, { accountCardsHtml, moreMenuHtml, WALLET_ICON, openDialog, openCategoryPicker, categoryPickerBody, dialogPhone, dialogSheetHtml: sheetHtml, localDataCard, firstRunCard, unknownPathCard, syncProblemCard, webReminderNotice, PAYMENTS });
})();
