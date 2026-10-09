(() => {
  const TOLERANCE = 1;
  const TOUCH_MIN = 44;
  const PHONE_MAX_WIDTH = 1023;
  const MIN_OVERLAP = 2;
  const GENERATED_ID = /_r_|^:r|^radix-/;
  const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE', 'OPTION']);
  const INTERACTIVE =
    'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], ' +
    '[role=radio], [role=tab], [role=menuitem], [role=checkbox], [role=switch], [role=option], [role=link]';

  const style = (el) => getComputedStyle(el);
  const rectOf = (el) => el.getBoundingClientRect();
  const isScrollMode = (value) => value === 'auto' || value === 'scroll';
  const isClipMode = (value) => value === 'hidden' || value === 'clip';
  const insideSvg = (el) => el.tagName !== 'svg' && el.closest('svg') !== null;

  function isRendered(el) {
    if (SKIPPED_TAGS.has(el.tagName) || insideSvg(el) || el.closest('[inert]')) return false;
    const s = style(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = rectOf(el);
    return r.width > 2 && r.height > 2;
  }

  function describeStep(node) {
    let step = node.tagName.toLowerCase();
    if (node.id && !GENERATED_ID.test(node.id)) step += `#${node.id}`;
    const role = node.getAttribute('role');
    if (role) step += `[role=${role}]`;
    const label = node.getAttribute('aria-label');
    if (label) step += `[aria-label="${label.slice(0, 24)}"]`;
    const classes = [...node.classList].filter((name) => !name.includes(':') && !name.includes('[')).slice(0, 3);
    return classes.length ? `${step}.${classes.join('.')}` : step;
  }

  function describe(el) {
    const steps = [];
    for (let node = el, depth = 0; node && node !== document.body && depth < 3; depth += 1) {
      steps.unshift(describeStep(node));
      node = node.parentElement;
    }
    return steps.join(' > ');
  }

  function snippet(el) {
    return (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 32);
  }

  function finding(kind, el, detail) {
    return { kind, selector: describe(el), text: snippet(el), detail };
  }

  const num = (value) => Math.round(value * 10) / 10;

  function isDeclaredScroller(el) {
    return el.classList.contains('overflow-x-auto') || el.classList.contains('overflow-x-scroll');
  }

  function pseudoRect(el, pseudo, origin) {
    const s = getComputedStyle(el, pseudo);
    if (s.content === 'none' || s.position !== 'absolute') return null;
    const left = origin.left + parseFloat(s.left);
    const top = origin.top + parseFloat(s.top);
    const width = parseFloat(s.width);
    const height = parseFloat(s.height);
    if ([left, top, width, height].some(Number.isNaN)) return null;
    return { left, top, right: left + width, bottom: top + height };
  }

  function hitArea(el) {
    const own = rectOf(el);
    const box = { left: own.left, top: own.top, right: own.right, bottom: own.bottom };
    if (style(el).position === 'static') return box;
    for (const pseudo of ['::before', '::after']) {
      const extra = pseudoRect(el, pseudo, own);
      if (!extra) continue;
      box.left = Math.min(box.left, extra.left);
      box.top = Math.min(box.top, extra.top);
      box.right = Math.max(box.right, extra.right);
      box.bottom = Math.max(box.bottom, extra.bottom);
    }
    return box;
  }

  function isHitAreaOverflow(el, scrollWidth) {
    const area = hitArea(el);
    return area.right - area.left >= scrollWidth - TOLERANCE;
  }

  function isScrollerBleed(el) {
    const box = rectOf(el);
    const scrollers = el.querySelectorAll('.overflow-x-auto, .overflow-x-scroll');
    return [...scrollers].some((scroller) => {
      const r = rectOf(scroller);
      const bleeds = r.left < box.left - TOLERANCE || r.right > box.right + TOLERANCE;
      return bleeds && r.left >= -TOLERANCE && r.right <= innerWidth + TOLERANCE;
    });
  }

  function horizontalOverflow() {
    const flagged = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (!isRendered(el) || ['INPUT', 'TEXTAREA'].includes(el.tagName)) continue;
      const { scrollWidth, clientWidth } = el;
      if (clientWidth === 0 || scrollWidth <= clientWidth + TOLERANCE) continue;
      const s = style(el);
      if (s.textOverflow === 'ellipsis') continue;
      if (isScrollMode(s.overflowX) && isDeclaredScroller(el)) continue;
      if (isHitAreaOverflow(el, scrollWidth) || isScrollerBleed(el)) continue;
      flagged.push({ el, scrollWidth, clientWidth, overflowX: s.overflowX });
    }
    const innermost = flagged.filter((a) => !flagged.some((b) => b.el !== a.el && a.el.contains(b.el)));
    return innermost.map(
      ({ el, scrollWidth, clientWidth, overflowX }) =>
        finding('h-overflow', el, `scrollWidth ${scrollWidth} > clientWidth ${clientWidth} (overflow-x ${overflowX})`),
    );
  }

  function boxOwnerOf(el) {
    let node = el;
    while (node.parentElement && ['inline', 'contents'].includes(style(node).display)) node = node.parentElement;
    return node;
  }

  function textRects(node) {
    const range = document.createRange();
    range.selectNodeContents(node);
    return [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
  }

  function textNodes() {
    const found = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const owner = node.parentElement;
      if (owner && node.nodeValue.trim() && isRendered(owner)) found.push({ node, owner });
    }
    return found;
  }

  function clippedByVisibleAncestor(el) {
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      const s = style(node);
      if (!isClipMode(s.overflowX) && !isScrollMode(s.overflowX)) continue;
      const r = rectOf(node);
      if (r.left >= -TOLERANCE && r.right <= innerWidth + TOLERANCE) return true;
    }
    return false;
  }

  function sticksOutOfBox(rect, box) {
    return rect.right > box.right + TOLERANCE || rect.left < box.left - TOLERANCE;
  }

  function textFindings({ node, owner }) {
    const boxOwner = boxOwnerOf(owner);
    if (style(boxOwner).textOverflow === 'ellipsis') return [];
    const box = rectOf(boxOwner);
    const results = [];
    for (const rect of textRects(node)) {
      if (sticksOutOfBox(rect, box)) {
        const over = Math.max(rect.right - box.right, box.left - rect.left);
        results.push(finding('text-outside-box', owner, `text ${num(rect.left)}..${num(rect.right)} box ${num(box.left)}..${num(box.right)} (+${num(over)}px)`));
        break;
      }
      const outsideViewport = rect.right > innerWidth + TOLERANCE || rect.left < -TOLERANCE;
      if (outsideViewport && !clippedByVisibleAncestor(boxOwner)) {
        results.push(finding('text-outside-viewport', owner, `text ${num(rect.left)}..${num(rect.right)} viewport 0..${innerWidth}`));
        break;
      }
    }
    return results;
  }

  function textOutOfBounds() {
    return textNodes().flatMap(textFindings);
  }

  function pageHorizontalScroll() {
    const root = document.scrollingElement || document.documentElement;
    if (root.scrollWidth <= innerWidth) return [];
    return [finding('page-h-scroll', document.body, `scrollWidth ${root.scrollWidth} > viewport ${innerWidth}`)];
  }

  function isPlainInlineLink(el, s) {
    return el.tagName === 'A' && s.display === 'inline';
  }

  function isVisuallyHiddenControl(el, r) {
    return style(el).opacity === '0' || r.width <= 4 || r.height <= 4;
  }

  function touchTarget(el) {
    const isField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
    const label = isField ? el.closest('label') : null;
    return label ?? el;
  }

  function smallTargets() {
    if (innerWidth > PHONE_MAX_WIDTH) return [];
    const results = [];
    for (const el of document.querySelectorAll(INTERACTIVE)) {
      if (!isRendered(el)) continue;
      const own = rectOf(el);
      if (isPlainInlineLink(el, style(el)) || isVisuallyHiddenControl(el, own)) continue;
      const target = touchTarget(el);
      const area = target === el ? hitArea(el) : rectOf(target);
      const width = area.right - area.left;
      const height = area.bottom - area.top;
      if (width < TOUCH_MIN - 0.5 || height < TOUCH_MIN - 0.5) {
        results.push(finding('small-target', el, `${num(width)}x${num(height)} < ${TOUCH_MIN}`));
      }
    }
    return results;
  }

  function hasClippedText(el, box) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.nodeValue.trim()) continue;
      if (textRects(node).some((r) => r.bottom > box.bottom + TOLERANCE || r.top < box.top - TOLERANCE)) return true;
    }
    return false;
  }

  function isMediaOrField(el) {
    return ['IMG', 'SVG', 'VIDEO', 'CANVAS', 'INPUT', 'TEXTAREA', 'HTML', 'BODY'].includes(el.tagName.toUpperCase());
  }

  function verticalClipping() {
    const results = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (isMediaOrField(el) || !isRendered(el)) continue;
      const s = style(el);
      if (!isClipMode(s.overflowY) || el.clientHeight === 0) continue;
      if (el.scrollHeight <= el.clientHeight + TOLERANCE + 1) continue;
      if (s.webkitLineClamp !== 'none' && s.webkitLineClamp) continue;
      if (!hasClippedText(el, rectOf(el))) continue;
      results.push(finding('v-clip', el, `scrollHeight ${el.scrollHeight} > clientHeight ${el.clientHeight} (overflow-y ${s.overflowY})`));
    }
    return results;
  }

  function pinnedLayerOf(el) {
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      if (['fixed', 'sticky'].includes(style(node).position)) return node;
    }
    return null;
  }

  function scrollerOf(el) {
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      if (isScrollMode(style(node).overflowY)) return node;
    }
    return null;
  }

  function sameLayer(a, b) {
    if (scrollerOf(a) !== scrollerOf(b)) return false;
    const dialogA = a.closest('[role=dialog], [role=alertdialog]');
    const dialogB = b.closest('[role=dialog], [role=alertdialog]');
    return dialogA === dialogB && pinnedLayerOf(a) === pinnedLayerOf(b);
  }

  function intersection(a, b) {
    const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return { width, height };
  }

  function visibleRect(el) {
    let { left, right, top, bottom } = rectOf(el);
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      const s = style(node);
      if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      const r = rectOf(node);
      left = Math.max(left, r.left);
      right = Math.min(right, r.right);
      top = Math.max(top, r.top);
      bottom = Math.min(bottom, r.bottom);
    }
    return { left, right, top, bottom };
  }

  function overlappingButtons() {
    const items = [...document.querySelectorAll(INTERACTIVE)]
      .filter((el) => isRendered(el) && !isVisuallyHiddenControl(el, rectOf(el)))
      .map((el) => ({ el, rect: visibleRect(el) }));
    const results = [];
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i];
        const b = items[j];
        if (a.el.contains(b.el) || b.el.contains(a.el) || !sameLayer(a.el, b.el)) continue;
        const { width, height } = intersection(a.rect, b.rect);
        if (width <= MIN_OVERLAP || height <= MIN_OVERLAP) continue;
        const other = `${describe(b.el)} "${snippet(b.el)}"`;
        results.push(finding('overlap', a.el, `overlaps ${other} by ${num(width)}x${num(height)}`));
      }
    }
    return results;
  }

  window.__uiAudit = () => [
    ...pageHorizontalScroll(),
    ...horizontalOverflow(),
    ...textOutOfBounds(),
    ...smallTargets(),
    ...verticalClipping(),
    ...overlappingButtons(),
  ];
})();
