/* Fixtures. Amounts are in thousand ₫ (nghìn đồng). Every total below is derived from TX. */
const CATS = {
  food:      { name: 'Ăn uống',  icon: 'fork-knife',   budget: 2600 },
  transport: { name: 'Đi lại',   icon: 'car',          budget: 800 },
  shopping:  { name: 'Mua sắm',  icon: 'shopping-bag', budget: 1500 },
  fun:       { name: 'Giải trí', icon: 'film-strip',   budget: 400 },
  health:    { name: 'Sức khoẻ', icon: 'heartbeat',    budget: 800 },
  bills:     { name: 'Hoá đơn',  icon: 'lightning',    budget: 1200 },
  home:      { name: 'Nhà ở',    icon: 'house-line',   budget: null },
  income:    { name: 'Thu nhập', icon: 'arrow-down-left', budget: null, kind: 'in' },
};

const ICON_CHOICES = ['tag', 'airplane-tilt', 'graduation-cap', 'paw-print', 'gift', 'game-controller', 'book-open', 't-shirt', 'wrench', 'cooking-pot', 'device-mobile', 'first-aid-kit'];
const isIncomeCat = (id) => CATS[id].kind === 'in';
let customCatSeq = 0;
function addCategory({ name, icon, budget, kind }) {
  const id = 'custom' + ++customCatSeq;
  CATS[id] = { name, icon, budget: kind === 'in' ? null : budget || null, kind: kind === 'in' ? 'in' : 'out' };
  recompute();
  return id;
}

const WALLETS = [
  { id: 'tcb',  name: 'Techcombank', kind: 'Tài khoản', balance: 38420 },
  { id: 'momo', name: 'Ví MoMo',     kind: 'Ví điện tử', balance: 1250 },
  { id: 'cash', name: 'Tiền mặt',    kind: 'Tiền mặt',   balance: 820 },
];

const TX = [
  { id: 1,  day: 9, title: 'Highlands Coffee',     cat: 'food',      wallet: 'momo', amt: -65 },
  { id: 2,  day: 9, title: 'Grab đi làm',          cat: 'transport', wallet: 'momo', amt: -48 },
  { id: 3,  day: 8, title: 'Co.opmart Nguyễn Đình Chiểu', cat: 'food', wallet: 'tcb', amt: -412 },
  { id: 4,  day: 8, title: 'Netflix',              cat: 'fun',       wallet: 'tcb',  amt: -260, rec: 'Hằng tháng · ngày 8' },
  { id: 5,  day: 7, title: 'Freelance — thiết kế logo', cat: 'income', wallet: 'tcb', amt: 4500 },
  { id: 6,  day: 7, title: 'Cơm tấm Cô Ba',        cat: 'food',      wallet: 'cash', amt: -55 },
  { id: 7,  day: 7, title: 'Xăng Petrolimex',      cat: 'transport', wallet: 'cash', amt: -120 },
  { id: 8,  day: 6, title: 'Shopee — tai nghe',    cat: 'shopping',  wallet: 'tcb',  amt: -890 },
  { id: 9,  day: 6, title: 'Phở Thìn',             cat: 'food',      wallet: 'cash', amt: -70 },
  { id: 10, day: 6, title: 'Trà sữa Gong Cha',     cat: 'food',      wallet: 'momo', amt: -52 },
  { id: 11, day: 5, title: 'Lương tháng 10',       cat: 'income',    wallet: 'tcb',  amt: 28000 },
  { id: 12, day: 5, title: 'Tiền thuê nhà',        cat: 'home',      wallet: 'tcb',  amt: -7500, rec: 'Hằng tháng · ngày 5' },
  { id: 13, day: 5, title: 'Điện EVN',             cat: 'bills',     wallet: 'tcb',  amt: -640, rec: 'Hằng tháng · ngày 5' },
  { id: 14, day: 4, title: 'Nhà hàng — sinh nhật Mai', cat: 'food',  wallet: 'tcb',  amt: -1150 },
  { id: 15, day: 4, title: 'California Fitness',   cat: 'health',    wallet: 'tcb',  amt: -450, rec: 'Hằng tháng · ngày 4' },
  { id: 16, day: 3, title: 'GrabFood',             cat: 'food',      wallet: 'momo', amt: -138 },
  { id: 17, day: 3, title: 'Be đi Quận 7',         cat: 'transport', wallet: 'momo', amt: -62 },
  { id: 18, day: 2, title: 'Bách Hoá Xanh',        cat: 'food',      wallet: 'cash', amt: -336 },
  { id: 19, day: 2, title: 'Nhà thuốc Long Châu',  cat: 'health',    wallet: 'cash', amt: -215 },
  { id: 20, day: 2, title: 'Spotify Premium',      cat: 'fun',       wallet: 'tcb',  amt: -59,  rec: 'Hằng tháng · ngày 2' },
  { id: 21, day: 1, title: 'Internet FPT',         cat: 'bills',     wallet: 'tcb',  amt: -230, rec: 'Hằng tháng · ngày 1' },
  { id: 22, day: 1, title: 'Highlands Coffee',     cat: 'food',      wallet: 'momo', amt: -59 },
  { id: 23, day: 1, title: 'Cơm trưa văn phòng',   cat: 'food',      wallet: 'cash', amt: -60 },
];

const UPCOMING = [
  { title: 'Thẻ tín dụng Techcombank', date: 'Thứ Hai, 12/10', amt: 2340, icon: 'wallet' },
  { title: 'Internet FPT',             date: 'Thứ Năm, 15/10', amt: 230,  icon: 'lightning' },
  { title: 'Netflix',                  date: 'Chủ Nhật, 18/10', amt: 260, icon: 'film-strip' },
];

const GOALS = [
  { name: 'Quỹ khẩn cấp',   saved: 38500, target: 60000, due: 'Không đặt hạn',   icon: 'piggy-bank' },
  { name: 'Du lịch Đà Lạt', saved: 9200,  target: 15000, due: 'Còn 10 tuần · 20/12', icon: 'calendar-blank' },
  { name: 'MacBook Air',    saved: 8000,  target: 32000, due: 'Còn 6 tháng · 04/2027', icon: 'target' },
];

const LAST_MONTH_SPENT = 14200;
const TODAY = 9;
const WEEKDAY = { 1: 'Thứ Năm', 2: 'Thứ Sáu', 3: 'Thứ Bảy', 4: 'Chủ Nhật', 5: 'Thứ Hai', 6: 'Thứ Ba', 7: 'Thứ Tư', 8: 'Thứ Năm', 9: 'Thứ Sáu' };

const vnd = (k) => (Math.abs(k) * 1000).toLocaleString('vi-VN') + ' ₫';
const signed = (k) => (k > 0 ? '+' : '−') + vnd(k);
const dayLabel = (d) => (d === TODAY ? 'Hôm nay' : d === TODAY - 1 ? 'Hôm qua' : WEEKDAY[d]) + ' · ' + d + '/10';
const walletName = (id) => WALLETS.find((w) => w.id === id).name;

let income, expense, totalBalance, BUDGETED, budgetTotal, budgetSpent, dailySpend, expenseDelta;
const spentByCat = (c) => -TX.filter((t) => t.cat === c && t.amt < 0).reduce((s, t) => s + t.amt, 0);
const meterTone = (pct) => (pct > 1 ? 'over' : pct >= 0.85 ? 'warn' : '');
const pctText = (p) => Math.round(p * 100) + '%';
function recompute() {
  income = TX.filter((t) => t.amt > 0).reduce((s, t) => s + t.amt, 0);
  expense = -TX.filter((t) => t.amt < 0).reduce((s, t) => s + t.amt, 0);
  totalBalance = WALLETS.reduce((s, w) => s + w.balance, 0);
  BUDGETED = Object.entries(CATS).filter(([, c]) => c.budget).map(([id, c]) => ({ id, ...c, spent: spentByCat(id), pct: spentByCat(id) / c.budget }));
  budgetTotal = BUDGETED.reduce((s, b) => s + b.budget, 0);
  budgetSpent = BUDGETED.reduce((s, b) => s + b.spent, 0);
  dailySpend = Array.from({ length: TODAY }, (_, i) => -TX.filter((t) => t.day === i + 1 && t.amt < 0 && t.cat !== 'home').reduce((s, t) => s + t.amt, 0));
  expenseDelta = (expense - LAST_MONTH_SPENT) / LAST_MONTH_SPENT;
}
recompute();

const groupByDay = (list) => {
  const days = [...new Set(list.map((t) => t.day))].sort((a, b) => b - a);
  return days.map((d) => ({ day: d, items: list.filter((t) => t.day === d) }));
};
const txRow = (t, opts = {}) => `
  <button class="tx ${opts.active ? 'on' : ''}" data-id="${t.id}" type="button">
    <span class="cat-tile">${ic(CATS[t.cat].icon)}</span>
    <span class="grow">
      <span class="tx-title trunc">${t.title}</span>
      <span class="tx-sub trunc">${CATS[t.cat].name} · ${walletName(t.wallet)}</span>
    </span>
    <span class="tx-amt ${t.amt > 0 ? 'income' : ''}">${signed(t.amt)}</span>
  </button>`;

const ACCOUNT = { name: 'Linh Nguyễn', email: 'linh.nguyen@gmail.com' };
const SYNC_DEVICES = [
  { name: 'Chrome · Windows', note: 'Máy này', icon: 'desktop' },
  { name: 'iPhone của Linh', note: 'Đồng bộ 13:05 hôm nay', icon: 'device-mobile' },
];
const syncCounts = () => [
  [TX.length, 'giao dịch'],
  [Object.keys(CATS).length, 'hạng mục'],
  [Object.values(CATS).filter((c) => c.budget).length, 'ngân sách'],
  [GOALS.length, 'mục tiêu'],
];
const SYNC_CONFLICT = {
  here:   { title: 'Bản trên máy này', meta: 'Chrome · Windows · sửa lúc 14:20', detail: '23 giao dịch', extra: 'Có 2 giao dịch mới chưa lên Google' },
  remote: { title: 'Bản trên Google Drive', meta: 'iPhone của Linh · sửa lúc 13:05', detail: '22 giao dịch', extra: 'Có 1 giao dịch đã bị xoá trên iPhone' },
};
