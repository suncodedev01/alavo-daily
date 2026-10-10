/* Color palettes: a palette is a set of CSS variables selected by data-palette on <html>.
   The CSS lives in palettes.css (generated); this file picks one, remembers it, renders the picker,
   and suggests palettes for a feng shui element (mệnh). */
(function () {
  const KEY = 'alavo-palette';
  const MENH_KEY = 'alavo-menh';
  const YEAR_KEY = 'alavo-menh-year';
  const THEME_KEY = 'alavo-theme-mode';
  const LANG_KEY = 'alavo-language';
  const DEFAULT_ID = 'vang';
  const PALETTES = [
  {
    "id": "vang",
    "name": "Vàng kim",
    "tag": "Màu tài lộc trực tiếp nhất",
    "fit": "Hợp mệnh Thổ và Kim. Mệnh Mộc và Thủy nên cân nhắc, vì một số nguồn xếp vàng vào nhóm kiêng.",
    "sw": {
      "nen": "#FAF7F0",
      "nut": "#FFC53D",
      "nhan": "#FFF7C2",
      "chu": "#2D1A0B",
      "chu_nut": "#311C0C"
    }
  },
  {
    "id": "phuquy",
    "name": "Phú quý · Tím vàng",
    "tag": "Màu của giàu sang",
    "fit": "Tím gần nhóm màu mệnh Hỏa, vàng hợp mệnh Thổ. Tím và vàng đều hay được gợi ý cho góc tài lộc (Đông Nam).",
    "sw": {
      "nen": "#F5F3F7",
      "nut": "#FFC53D",
      "nhan": "#FFF7C2",
      "chu": "#1E1226",
      "chu_nut": "#311C0C"
    }
  },
  {
    "id": "tho",
    "name": "Thổ · Nâu đất",
    "tag": "Nâu đất, màu cát",
    "fit": "Màu bản mệnh Thổ, tương sinh cho mệnh Kim.",
    "sw": {
      "nen": "#F7F5F3",
      "nut": "#A5622C",
      "nhan": "#F6ECE4",
      "chu": "#18120C",
      "chu_nut": "#FFFFFF"
    }
  },
  {
    "id": "kim",
    "name": "Kim · Trắng bạc",
    "tag": "Trắng, xám, bạc",
    "fit": "Màu bản mệnh Kim, tương sinh cho mệnh Thủy. Một số nguồn cho rằng màu trắng không hợp để giữ tiền.",
    "sw": {
      "nen": "#F3F5F6",
      "nut": "#5D7692",
      "nhan": "#EAEDF0",
      "chu": "#05070A",
      "chu_nut": "#FFFFFF"
    }
  },
  {
    "id": "thuy",
    "name": "Thủy · Xanh biển",
    "tag": "Xanh biển, tĩnh và ổn định",
    "fit": "Màu bản mệnh Thủy (cùng với đen), tương sinh cho mệnh Mộc.",
    "sw": {
      "nen": "#F3F5F7",
      "nut": "#1D6ED7",
      "nhan": "#E2ECF9",
      "chu": "#080C11",
      "chu_nut": "#FFFFFF"
    }
  },
  {
    "id": "moc",
    "name": "Mộc · Xanh lá",
    "tag": "Xanh lá, tăng trưởng",
    "fit": "Màu bản mệnh Mộc, gắn với sự phát triển và dồi dào. Tương sinh cho mệnh Hỏa.",
    "sw": {
      "nen": "#F3F6F5",
      "nut": "#1E804C",
      "nhan": "#E4F7ED",
      "chu": "#12261C",
      "chu_nut": "#FFFFFF"
    }
  },
  {
    "id": "hoa",
    "name": "Hỏa · Tím hồng",
    "tag": "Tím hồng, nổi bật",
    "fit": "Màu bản mệnh Hỏa (cùng với đỏ, cam), tương sinh cho mệnh Thổ.",
    "sw": {
      "nen": "#F6F3F7",
      "nut": "#AF38C7",
      "nhan": "#F3E5F6",
      "chu": "#1F1122",
      "chu_nut": "#FFFFFF"
    }
  },
  {
    "id": "hong",
    "name": "Hồng đào",
    "tag": "Hồng ngọt, dịu mắt",
    "fit": "Cùng nhóm màu hợp mệnh Hỏa, tương sinh cho mệnh Thổ.",
    "sw": {
      "nen": "#F7F3F4",
      "nut": "#D22866",
      "nhan": "#F7E3EA",
      "chu": "#180C10",
      "chu_nut": "#FFFFFF"
    }
  }
];

  /* Five elements in the order of the generating cycle: each one generates the next. */
  const CYCLE = ['kim', 'thuy', 'moc', 'hoa', 'tho'];
  const MENH = {
    kim:  { name: 'Kim',  ban: 'trắng, xám, bạc',                     sinh: 'vàng, nâu đất',     ky: 'đỏ, hồng' },
    thuy: { name: 'Thủy', ban: 'đen, xanh biển',                      sinh: 'trắng, xám, bạc',   ky: 'nâu, vàng đất' },
    moc:  { name: 'Mộc',  ban: 'xanh lá',                             sinh: 'xanh biển, đen',    ky: 'trắng, xám' },
    hoa:  { name: 'Hỏa',  ban: 'đỏ, cam, hồng, tím',                  sinh: 'xanh lá',           ky: 'đen, xanh dương' },
    tho:  { name: 'Thổ',  ban: 'vàng nhạt, nâu sáng, màu cát',        sinh: 'đỏ, hồng, cam',     ky: 'xanh lá' },
  };
  const ELEMENTS_OF = { vang: ['tho'], tho: ['tho'], kim: ['kim'], thuy: ['thuy'], moc: ['moc'], hoa: ['hoa'], hong: ['hoa'], phuquy: ['hoa', 'tho'] };
  const RELATION_LABEL = { ban: 'Hợp mệnh', sinh: 'Tương sinh', ky: 'Nên hạn chế', pha: 'Hợp một phần', trung: '' };

  /* Nạp âm: 30 pairs of years share one element, in the order of the 60-year cycle starting at Giáp Tý (year 4). */
  const PAIR_ELEMENTS = ['kim', 'hoa', 'moc', 'tho', 'kim', 'hoa', 'thuy', 'tho', 'kim', 'moc', 'thuy', 'tho', 'hoa', 'moc', 'thuy',
    'kim', 'hoa', 'moc', 'tho', 'kim', 'hoa', 'thuy', 'tho', 'kim', 'moc', 'thuy', 'tho', 'hoa', 'moc', 'thuy'];
  const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  const MIN_YEAR = 1900;
  const MAX_YEAR = 2100;

  const root = document.documentElement;
  const isKnown = (id) => PALETTES.some((p) => p.id === id);
  const read = (key) => { try { return localStorage.getItem(key); } catch (e) { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch (e) { /* private window: the choice lasts for this page only */ } };

  /* ---------- appearance: light, dark or follow the device; display language ---------- */
  const THEME_MODES = [['light', 'Nền sáng'], ['dark', 'Nền tối'], ['system', 'Theo thiết bị']];
  const LANGUAGES = [['vi', 'Tiếng Việt'], ['en', 'English']];
  const knownMode = (m) => THEME_MODES.some((x) => x[0] === m);
  const knownLang = (l) => LANGUAGES.some((x) => x[0] === l);
  const appearance = { mode: knownMode(read(THEME_KEY)) ? read(THEME_KEY) : 'light', lang: knownLang(read(LANG_KEY)) ? read(LANG_KEY) : 'vi' };
  const deviceDark = () => !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  function applyThemeMode() {
    const dark = appearance.mode === 'dark' || (appearance.mode === 'system' && deviceDark());
    root.dataset.theme = dark ? 'dark' : 'light';
  }
  function setThemeMode(mode) { if (!knownMode(mode)) return; appearance.mode = mode; write(THEME_KEY, mode); applyThemeMode(); markOptions(); }
  function setLanguage(lang) { if (!knownLang(lang)) return; appearance.lang = lang; write(LANG_KEY, lang); markOptions(); }
  function markOptions() {
    document.querySelectorAll('[data-theme-mode]').forEach((b) => {
      const on = b.dataset.themeMode === appearance.mode; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on);
    });
    document.querySelectorAll('[data-language]').forEach((b) => {
      const on = b.dataset.language === appearance.lang; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on);
    });
  }
  const optionButtons = (options, attr) => options.map(([id, label]) => `<button class="opt-btn" type="button" data-${attr}="${id}" aria-pressed="false">${label}</button>`).join('');
  const themeModeCard = () => `<section class="card opt-card" aria-label="Giao diện">
    <div class="opt-head"><span class="cat-tile">${ic('moon')}</span><div class="grow"><h2 class="t-title">Giao diện</h2><p class="t-sm secondary">Chọn giao diện sáng, tối hoặc theo thiết bị.</p></div></div>
    <div class="opt-seg opt-seg-3" role="group" aria-label="Giao diện">${optionButtons(THEME_MODES, 'theme-mode')}</div></section>`;
  const languageCard = () => `<section class="card opt-card" aria-label="Ngôn ngữ">
    <div class="opt-head"><span class="cat-tile">${ic('globe')}</span><div class="grow"><h2 class="t-title">Ngôn ngữ</h2><p class="t-sm secondary">Ngôn ngữ hiển thị của ứng dụng.</p></div></div>
    <div class="opt-seg opt-seg-2 opt-narrow" role="group" aria-label="Ngôn ngữ">${optionButtons(LANGUAGES, 'language')}</div></section>`;
  const appearanceCards = () => themeModeCard() + languageCard();

  /* ---------- palette selection ---------- */
  const currentPalette = () => root.dataset.palette || DEFAULT_ID;
  function applyPalette(id) { if (id === DEFAULT_ID) delete root.dataset.palette; else root.dataset.palette = id; }
  function markSelected() {
    markOptions();
    document.querySelectorAll('[data-palette-pick]').forEach((b) => {
      const on = b.dataset.palettePick === currentPalette();
      b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on);
    });
  }
  function setPalette(id) { if (!isKnown(id)) return; applyPalette(id); write(KEY, id); markSelected(); }

  /* ---------- feng shui logic ---------- */
  const next = (e, steps) => CYCLE[(CYCLE.indexOf(e) + steps) % CYCLE.length];
  const generates = (e) => next(e, 1);
  const overcomes = (e) => next(e, 2);
  function relationOfElement(element, person) {
    if (element === person) return 'ban';
    if (generates(element) === person) return 'sinh';
    if (overcomes(element) === person) return 'ky';
    return 'trung';
  }
  function relationOfPalette(paletteId, person) {
    const rels = ELEMENTS_OF[paletteId].map((e) => relationOfElement(e, person));
    const helps = rels.some((r) => r === 'ban' || r === 'sinh');
    if (rels.includes('ky')) return helps ? 'pha' : 'ky';
    if (rels.includes('ban')) return 'ban';
    return rels.includes('sinh') ? 'sinh' : 'trung';
  }
  function menhOfYear(year) {
    const i = (year - 4) % 60;
    return PAIR_ELEMENTS[Math.floor(((i + 60) % 60) / 2)];
  }
  const canChiOfYear = (year) => `${CAN[((year - 4) % 10 + 10) % 10]} ${CHI[((year - 4) % 12 + 12) % 12]}`;
  const parseYear = (text) => { const y = Number(String(text).trim()); return Number.isInteger(y) && y >= MIN_YEAR && y <= MAX_YEAR ? y : null; };
  const bestPalette = (person) => PALETTES
    .filter((p) => relationOfPalette(p.id, person) === 'ban')
    .sort((a, b) => ELEMENTS_OF[a.id].length - ELEMENTS_OF[b.id].length)[0];

  /* ---------- state of the element picker ---------- */
  const menhState = { menh: isKnownMenh(read(MENH_KEY)) ? read(MENH_KEY) : null, year: read(YEAR_KEY) || '', early: false };
  function isKnownMenh(id) { return Object.prototype.hasOwnProperty.call(MENH, id || ''); }

  function lunarYear() {
    const year = parseYear(menhState.year);
    if (year === null) return null;
    return menhState.early ? year - 1 : year;
  }

  /* ---------- rendering ---------- */
  const swatch = (label, color) => `<span class="pal-sw"><i style="background:${color}"></i><b>${label}</b></span>`;
  const relationBadge = (relation) => RELATION_LABEL[relation] ? `<span class="pal-rel rel-${relation}">${RELATION_LABEL[relation]}</span>` : '';
  const card = (p) => `<button class="pal-card" type="button" data-palette-pick="${p.id}" aria-pressed="false">
    <span class="pal-top"><span class="pal-name">${p.name}</span><span class="pal-badge" data-rel-slot="${p.id}"></span><span class="pal-on">${ic('check')}Đang dùng</span></span>
    <span class="pal-tag">${p.tag}</span>
    <span class="pal-prev" style="background:${p.sw.nen};color:${p.sw.chu}"><span class="pal-sticker" style="background-color:color-mix(in srgb, ${p.sw.nut} 24%, ${p.sw.nen})"></span><span>Aa · Chữ chính</span><span class="pal-btn" style="background:${p.sw.nut};color:${p.sw.chu_nut}">Nút</span><span class="pal-btn" style="background:${p.sw.nhan};color:${p.sw.chu}">Nhấn</span></span>
    <span class="pal-sws">${swatch('Nền', p.sw.nen)}${swatch('Nút', p.sw.nut)}${swatch('Nhấn', p.sw.nhan)}${swatch('Chữ', p.sw.chu)}</span>
    <span class="pal-fit">${p.fit}</span></button>`;

  const chip = (p) => `<button class="pal-chip" type="button" data-palette-pick="${p.id}" aria-pressed="false"><i style="background:${p.sw.nut}"></i>${p.name}</button>`;
  function chipsFor(person, relation) {
    return PALETTES.filter((p) => relationOfPalette(p.id, person) === relation).map(chip).join('') || '<span class="menh-none">Không có bộ nào</span>';
  }
  function menhResult() {
    const person = menhState.menh;
    if (!person) return '<p class="menh-hint">Nhập năm sinh hoặc chọn mệnh để xem bộ màu hợp.</p>';
    const m = MENH[person];
    const year = lunarYear();
    const who = year === null ? '' : `<p class="menh-who">Năm âm lịch ${year} · ${canChiOfYear(year)} · mệnh ${m.name}</p>`;
    const best = bestPalette(person);
    return `${who}
      <div class="menh-row"><h4>Hợp mệnh ${m.name}</h4><p>Màu bản mệnh: ${m.ban}.</p><div class="pal-chips">${chipsFor(person, 'ban')}</div></div>
      <div class="menh-row"><h4>Tương sinh</h4><p>Màu hỗ trợ: ${m.sinh}.</p><div class="pal-chips">${chipsFor(person, 'sinh')}</div></div>
      <div class="menh-row"><h4>Nên hạn chế</h4><p>Màu tương khắc: ${m.ky}.</p><div class="pal-chips">${chipsFor(person, 'ky')}</div></div>
      ${best ? `<button class="btn primary" type="button" data-palette-pick="${best.id}">Dùng bộ ${best.name}</button>` : ''}`;
  }
  function menhPicker() {
    const pills = Object.keys(MENH).map((id) => `<button class="pill" type="button" data-menh-pick="${id}" aria-pressed="false">${MENH[id].name}</button>`).join('');
    return `<section class="menh" aria-label="Chọn bộ màu theo mệnh">
      <h3 class="t-title">Chọn bộ màu theo mệnh</h3>
      <div class="menh-in">
        <label class="menh-field"><span>Năm sinh</span><input type="text" inputmode="numeric" maxlength="4" placeholder="1995" value="${menhState.year}" data-menh-year autocomplete="off"></label>
        <button class="pill" type="button" data-menh-early aria-pressed="false">Sinh trước Tết (tháng 1–2)</button>
      </div>
      <div class="menh-pills" role="group" aria-label="Mệnh">${pills}</div>
      <div class="menh-result" data-menh-result></div></section>`;
  }
  function paletteCards() {
    return `${menhPicker()}<section class="pal"><div class="pal-grid">${PALETTES.map(card).join('')}</div>
      <p class="pal-note">Gợi ý theo quan niệm phong thủy phổ biến, không có cơ sở khoa học và các nguồn đôi khi khác nhau. Mệnh được tính theo năm âm lịch bằng bảng Nạp Âm. Màu tương sinh và tương khắc suy ra từ quy luật ngũ hành. Hãy chọn màu bạn thấy dễ nhìn nhất.</p></section>`;
  }

  /* ---------- keeping the picker in sync ---------- */
  function refreshMenh() {
    document.querySelectorAll('[data-menh-pick]').forEach((b) => {
      const on = b.dataset.menhPick === menhState.menh;
      b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on);
    });
    document.querySelectorAll('[data-menh-early]').forEach((b) => { b.setAttribute('aria-pressed', String(menhState.early)); b.classList.toggle('on', menhState.early); });
    document.querySelectorAll('[data-menh-year]').forEach((input) => { if (input !== document.activeElement && input.value !== menhState.year) input.value = menhState.year; });
    document.querySelectorAll('[data-menh-result]').forEach((box) => { box.innerHTML = menhResult(); });
    document.querySelectorAll('.menh').forEach((section) => { section.dataset.ready = 'true'; });
    document.querySelectorAll('[data-rel-slot]').forEach((slot) => {
      slot.innerHTML = menhState.menh ? relationBadge(relationOfPalette(slot.dataset.relSlot, menhState.menh)) : '';
    });
    markSelected();
  }
  function chooseMenh(id) {
    const year = lunarYear();
    if (year !== null && menhOfYear(year) !== id) { menhState.year = ''; write(YEAR_KEY, ''); }
    menhState.menh = id; write(MENH_KEY, id); refreshMenh();
  }
  function onYearInput(text) {
    menhState.year = text; write(YEAR_KEY, text);
    const year = lunarYear();
    if (year !== null) { menhState.menh = menhOfYear(year); write(MENH_KEY, menhState.menh); }
    refreshMenh();
  }

  function init() {
    if (isKnown(read(KEY))) applyPalette(read(KEY));
    applyThemeMode();
    if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (appearance.mode === 'system') applyThemeMode(); });
    document.addEventListener('click', (e) => {
      const mode = e.target.closest('[data-theme-mode]');
      if (mode) return setThemeMode(mode.dataset.themeMode);
      const lang = e.target.closest('[data-language]');
      if (lang) return setLanguage(lang.dataset.language);
      const pick = e.target.closest('[data-palette-pick]');
      if (pick) return setPalette(pick.dataset.palettePick);
      const menh = e.target.closest('[data-menh-pick]');
      if (menh) return chooseMenh(menh.dataset.menhPick);
      if (e.target.closest('[data-menh-early]')) { menhState.early = !menhState.early; onYearInput(menhState.year); }
    });
    document.addEventListener('input', (e) => { if (e.target.matches('[data-menh-year]')) onYearInput(e.target.value); });
    document.addEventListener('DOMContentLoaded', () => {
      refreshMenh();
      new MutationObserver(() => { if (document.querySelector('.menh:not([data-ready])')) refreshMenh(); else markSelected(); })
        .observe(document.body, { childList: true, subtree: true });
    });
  }
  init();
  window.PALETTES = PALETTES; window.currentPalette = currentPalette; window.setPalette = setPalette; window.paletteCards = paletteCards;
  window.setThemeMode = setThemeMode; window.appearanceCards = appearanceCards; window.currentThemeMode = () => appearance.mode;
  window.menhOfYear = menhOfYear; window.relationOfPalette = relationOfPalette;
})();
