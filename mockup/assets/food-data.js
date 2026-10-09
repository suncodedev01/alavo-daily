/* Món ăn: fixtures + derived helpers. Costs are in thousand ₫ at the recipe's base servings. */
const MODULES = [
  { id: 'today', name: 'Hôm nay', icon: 'house', desc: 'Tổng hợp mọi ứng dụng', views: [['today', 'house', 'Hôm nay'], ['explore', 'compass', 'Khám phá']] },
  { id: 'spend', name: 'Chi tiêu', icon: 'wallet', desc: 'Thu chi, ngân sách, mục tiêu', views: [['overview', 'squares-four', 'Tổng quan'], ['transactions', 'receipt', 'Giao dịch'], ['budgets', 'chart-pie-slice', 'Ngân sách'], ['goals', 'target', 'Mục tiêu'], ['report', 'chart-bar', 'Báo cáo'], ['import', 'upload-simple', 'Nhập sao kê']] },
  { id: 'food', name: 'Món ăn', icon: 'cooking-pot', desc: 'Công thức, thực đơn, đi chợ', views: [['recipes', 'book-open', 'Công thức'], ['plan', 'calendar-blank', 'Thực đơn tuần'], ['shopping', 'shopping-bag', 'Đi chợ']] },
];
const VIEW_MODULE = Object.fromEntries(MODULES.flatMap((m) => m.views.map(([v]) => [v, m.id])));

const AISLES = ['Thịt & cá', 'Rau củ', 'Gia vị', 'Khác'];
const HOUSEHOLD = 2;

const RECIPES = [
  { id: 'ga-kho', name: 'Gà kho gừng', tags: ['Món chính'], prep: 15, cook: 40, servings: 4, level: 'Dễ', fav: true, kcal: 420, icon: 'cooking-pot',
    ing: [['Đùi gà', 600, 'g', 'Thịt & cá', 54], ['Gừng', 50, 'g', 'Rau củ', 4], ['Hành tím', 3, 'củ', 'Rau củ', 6], ['Nước mắm', 2, 'muỗng canh', 'Gia vị', 3], ['Đường', 1, 'muỗng canh', 'Gia vị', 1], ['Tiêu xay', 0.5, 'muỗng cà phê', 'Gia vị', 1]],
    steps: [['Rửa gà, chặt miếng vừa ăn. Ướp với nước mắm, đường và hành tím băm.', 15], ['Phi thơm hành và gừng thái sợi, cho gà vào xào săn mặt.', 5], ['Thêm nước lọc xâm xấp, hạ lửa nhỏ.', 0], ['Kho liu riu, trở đều tay cho đến khi nước sệt lại.', 30], ['Nêm lại cho vừa miệng, rắc tiêu và tắt bếp.', 0]] },
  { id: 'pho-bo', name: 'Phở bò', tags: ['Món chính'], prep: 40, cook: 150, servings: 4, level: 'Khó', fav: true, kcal: 480, icon: 'cooking-pot',
    ing: [['Xương bò', 1000, 'g', 'Thịt & cá', 85], ['Thịt bò thái mỏng', 300, 'g', 'Thịt & cá', 110], ['Bánh phở', 500, 'g', 'Khác', 20], ['Hành tây', 2, 'củ', 'Rau củ', 8], ['Gừng', 80, 'g', 'Rau củ', 6], ['Quế, hồi, thảo quả', 1, 'bộ', 'Gia vị', 25], ['Hành lá', 4, 'cây', 'Rau củ', 5], ['Giá đỗ', 200, 'g', 'Rau củ', 8]],
    steps: [['Chần xương qua nước sôi, rửa sạch bọt.', 10], ['Nướng hành tây và gừng đến khi thơm, cạo bỏ lớp cháy.', 10], ['Cho xương, hành, gừng và gia vị vào nồi, hầm lửa nhỏ.', 120], ['Nêm nếm nước dùng cho vừa ăn.', 0], ['Trụng bánh phở, xếp thịt bò sống lên trên rồi chan nước dùng sôi.', 0]] },
  { id: 'bun-cha', name: 'Bún chả', tags: ['Món chính'], prep: 30, cook: 20, servings: 4, level: 'Vừa', fav: false, kcal: 510, icon: 'fork-knife',
    ing: [['Thịt ba chỉ', 400, 'g', 'Thịt & cá', 72], ['Thịt nạc vai xay', 200, 'g', 'Thịt & cá', 36], ['Bún tươi', 600, 'g', 'Khác', 18], ['Rau sống', 1, 'mớ', 'Rau củ', 10], ['Cà rốt', 1, 'củ', 'Rau củ', 4], ['Tỏi', 4, 'tép', 'Rau củ', 2], ['Nước mắm', 4, 'muỗng canh', 'Gia vị', 5], ['Đường', 3, 'muỗng canh', 'Gia vị', 2]],
    steps: [['Ướp thịt ba chỉ và thịt xay với tỏi, nước mắm, đường trong 30 phút.', 30], ['Viên thịt xay thành miếng dẹt, kẹp cùng thịt ba chỉ vào vỉ nướng.', 0], ['Nướng than hoặc nồi chiên không dầu, lật đều hai mặt.', 15], ['Pha nước chấm chua ngọt, thả cà rốt thái lát.', 0], ['Xếp bún, rau sống, chả nướng ra đĩa và chan nước chấm.', 0]] },
  { id: 'canh-chua', name: 'Canh chua cá lóc', tags: ['Canh'], prep: 20, cook: 20, servings: 4, level: 'Dễ', fav: false, kcal: 240, icon: 'cooking-pot',
    ing: [['Cá lóc', 500, 'g', 'Thịt & cá', 75], ['Cà chua', 3, 'quả', 'Rau củ', 12], ['Dứa', 0.25, 'quả', 'Rau củ', 8], ['Đậu bắp', 5, 'trái', 'Rau củ', 6], ['Giá đỗ', 100, 'g', 'Rau củ', 4], ['Me chua', 30, 'g', 'Gia vị', 3], ['Ngò om', 1, 'nhúm', 'Rau củ', 3]],
    steps: [['Làm sạch cá, cắt khúc, ướp chút muối.', 10], ['Nấu nước me, cho cà chua và dứa vào đun sôi.', 5], ['Thả cá vào, đun lửa vừa đến khi cá chín.', 8], ['Cho đậu bắp, giá đỗ, nêm vừa ăn rồi rắc ngò om.', 0]] },
  { id: 'rau-muong', name: 'Rau muống xào tỏi', tags: ['Rau', 'Nhanh'], prep: 5, cook: 5, servings: 2, level: 'Dễ', fav: false, kcal: 110, icon: 'fork-knife',
    ing: [['Rau muống', 1, 'bó', 'Rau củ', 10], ['Tỏi', 5, 'tép', 'Rau củ', 2], ['Dầu ăn', 1, 'muỗng canh', 'Gia vị', 1], ['Hạt nêm', 1, 'muỗng cà phê', 'Gia vị', 1]],
    steps: [['Nhặt và rửa rau, để ráo nước.', 0], ['Phi thơm tỏi với dầu nóng.', 0], ['Cho rau vào xào lửa lớn, nêm hạt nêm rồi tắt bếp ngay.', 3]] },
  { id: 'com-tam', name: 'Cơm tấm sườn', tags: ['Món chính'], prep: 20, cook: 25, servings: 2, level: 'Vừa', fav: true, kcal: 640, icon: 'fork-knife',
    ing: [['Sườn cốt lết', 400, 'g', 'Thịt & cá', 68], ['Gạo tấm', 300, 'g', 'Khác', 12], ['Trứng', 2, 'quả', 'Khác', 7], ['Dưa leo', 1, 'quả', 'Rau củ', 4], ['Cà chua', 1, 'quả', 'Rau củ', 4], ['Mỡ hành', 2, 'muỗng canh', 'Gia vị', 3]],
    steps: [['Ướp sườn với sả, tỏi, nước mắm và mật ong.', 20], ['Nấu cơm tấm với lượng nước vừa phải.', 20], ['Nướng sườn đến khi xém cạnh.', 12], ['Chiên trứng, thái dưa leo và cà chua.', 0], ['Xếp cơm, sườn, trứng, rưới mỡ hành và nước mắm pha.', 0]] },
  { id: 'banh-xeo', name: 'Bánh xèo', tags: ['Món chính'], prep: 30, cook: 25, servings: 4, level: 'Vừa', fav: false, kcal: 460, icon: 'fork-knife',
    ing: [['Bột bánh xèo', 300, 'g', 'Khác', 18], ['Tôm', 300, 'g', 'Thịt & cá', 75], ['Thịt ba chỉ', 200, 'g', 'Thịt & cá', 36], ['Giá đỗ', 200, 'g', 'Rau củ', 8], ['Hành lá', 3, 'cây', 'Rau củ', 3], ['Nước cốt dừa', 200, 'ml', 'Gia vị', 15], ['Rau sống', 1, 'mớ', 'Rau củ', 10]],
    steps: [['Pha bột với nước cốt dừa, nghệ và hành lá, để nghỉ.', 30], ['Xào tôm và thịt ba chỉ sơ cho chín.', 5], ['Tráng bột trên chảo nóng, cho nhân và giá đỗ lên một nửa bánh.', 0], ['Đậy nắp 3 phút cho vỏ giòn rồi gập đôi.', 3]] },
  { id: 'dau-hu', name: 'Đậu hũ sốt cà', tags: ['Món chính', 'Nhanh'], prep: 10, cook: 15, servings: 2, level: 'Dễ', fav: false, kcal: 260, icon: 'cooking-pot',
    ing: [['Đậu hũ', 4, 'miếng', 'Khác', 16], ['Cà chua', 3, 'quả', 'Rau củ', 12], ['Hành lá', 2, 'cây', 'Rau củ', 2], ['Nước mắm', 1, 'muỗng canh', 'Gia vị', 1]],
    steps: [['Cắt đậu hũ thành miếng, chiên vàng hai mặt.', 8], ['Xào cà chua đến khi mềm và ra nước sệt.', 5], ['Cho đậu hũ vào, nêm nước mắm, rắc hành lá.', 0]] },
];
const recipeById = (id) => RECIPES.find((r) => r.id === id);
const TAGS = ['Tất cả', 'Yêu thích', 'Món chính', 'Canh', 'Rau', 'Nhanh'];

/* weekly plan: Mon 5/10 .. Sun 11/10 */
const SLOTS = [['sang', 'Sáng'], ['trua', 'Trưa'], ['toi', 'Tối']];
const WEEK_DAYS = [[5, 'T2'], [6, 'T3'], [7, 'T4'], [8, 'T5'], [9, 'T6'], [10, 'T7'], [11, 'CN']];
const PLAN = {
  5: { trua: ['com-tam'], toi: ['canh-chua'] },
  6: { trua: ['bun-cha'], toi: ['dau-hu'] },
  7: { toi: ['ga-kho'] },
  8: { trua: ['com-tam'], toi: ['canh-chua', 'rau-muong'] },
  9: { trua: ['bun-cha'], toi: ['ga-kho', 'rau-muong'] },
  10: { trua: ['pho-bo'], toi: ['banh-xeo'] },
  11: { trua: ['bun-cha'], toi: ['canh-chua'] },
};
const planOf = (d, s) => (PLAN[d] && PLAN[d][s]) || [];

/* scaling + formatting */
const scaleQ = (q, from, to) => (q * to) / from;
const fmtQ = (q) => (Math.round(q * 10) / 10).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
const fmtAmount = (q, u) => (u === 'g' && q >= 1000 ? fmtQ(q / 1000) + ' kg' : u === 'ml' && q >= 1000 ? fmtQ(q / 1000) + ' lít' : fmtQ(q) + ' ' + u);
const recipeCost = (r, servings = r.servings) => Math.round(r.ing.reduce((s, i) => s + i[4], 0) * servings / r.servings);
const totalTime = (r) => r.prep + r.cook;
const fmtMin = (m) => (m >= 60 ? Math.floor(m / 60) + ' giờ' + (m % 60 ? ' ' + (m % 60) + ' phút' : '') : m + ' phút');

/* shopping: merge by name + unit for the days from `fromDay` onward, scaled to HOUSEHOLD */
const HAVE_AT_HOME = new Set(['Nước mắm', 'Đường', 'Tiêu xay', 'Dầu ăn', 'Hạt nêm', 'Gừng', 'Tỏi']);
function buildShopping(fromDay = TODAY) {
  const map = new Map();
  for (const [d] of WEEK_DAYS) {
    if (d < fromDay) continue;
    for (const [slot] of SLOTS) for (const id of planOf(d, slot)) {
      const r = recipeById(id);
      for (const [n, q, u, aisle, c] of r.ing) {
        const key = n + '|' + u;
        const e = map.get(key) || { key, name: n, unit: u, aisle, q: 0, c: 0, from: [] };
        e.q += scaleQ(q, r.servings, HOUSEHOLD);
        e.c += (c * HOUSEHOLD) / r.servings;
        if (!e.from.includes(r.name)) e.from.push(r.name);
        map.set(key, e);
      }
    }
  }
  return [...map.values()].map((e) => ({ ...e, c: Math.round(e.c), have: HAVE_AT_HOME.has(e.name) }));
}

/* notifications */
const NOTIFS = [
  { id: 1, mod: 'food', t: '17:30', title: 'Đến giờ nấu bữa tối', body: 'Gà kho gừng cần khoảng 55 phút. Bạn còn thiếu 1 nguyên liệu.', unread: true },
  { id: 2, mod: 'spend', t: '08:15', title: 'Ăn uống đã dùng 92% ngân sách', body: 'Còn 203.000 ₫ cho 22 ngày tới.', unread: true },
  { id: 3, mod: 'food', t: 'Hôm qua · 16:00', title: 'Đi chợ chiều nay?', body: 'Có món cần mua cho 3 ngày tới trong danh sách đi chợ.', unread: false },
  { id: 4, mod: 'spend', t: 'Hôm qua · 09:00', title: 'Thẻ tín dụng đến hạn Thứ Hai 12/10', body: 'Cần thanh toán 2.340.000 ₫.', unread: false },
  { id: 5, mod: 'food', t: 'Thứ Tư · 19:40', title: 'Hết giờ hầm xương', body: 'Nồi nước dùng phở đã đủ 2 giờ.', unread: false },
];
const NOTIF_RULES = [
  { mod: 'spend', rules: [['Cảnh báo khi dùng 85% ngân sách', 'Nhắc ngay khi một danh mục gần hết', 'Khi xảy ra', true], ['Nhắc hoá đơn trước 2 ngày', 'Điện, nước, internet, thẻ tín dụng', '09:00', true], ['Tóm tắt chi tiêu cuối tuần', 'Gửi vào Chủ Nhật', '20:00', true]] },
  { mod: 'food', rules: [['Nhắc nấu bữa tối', 'Tính lùi từ thời gian nấu của món', '17:30', true], ['Nhắc đi chợ', 'Khi thực đơn còn nguyên liệu chưa mua, vào Thứ Bảy', '16:00', true], ['Nhắc rã đông tối hôm trước', 'Cho món có thịt hoặc cá', '21:00', false], ['Hẹn giờ trong chế độ nấu ăn', 'Kêu khi hết giờ từng bước', 'Luôn bật', true]] },
];
const modName = (id) => MODULES.find((m) => m.id === id).name;

const COMING_APPS = [
  ['Công việc', 'checks', 'Việc cần làm, nhắc theo ngày'],
  ['Sức khoẻ', 'heartbeat', 'Cân nặng, giấc ngủ, uống thuốc'],
  ['Thói quen', 'fire', 'Theo dõi chuỗi ngày'],
  ['Ghi chú', 'book-open', 'Ghi nhanh, gắn thẻ'],
  ['Du lịch', 'airplane-tilt', 'Lịch trình và chi phí chuyến đi'],
  ['Học tập', 'graduation-cap', 'Lịch học, thẻ ghi nhớ'],
];
