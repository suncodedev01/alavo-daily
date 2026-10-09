/* Token-styled popover. Never a native <select> or system menu. */
let _pop = null;
function closePopover() { if (_pop) { _pop.remove(); _pop = null; } }
function popover(anchor, html, onPick, opts = {}) {
  closePopover();
  const el = document.createElement('div');
  el.className = 'pop';
  el.setAttribute('role', 'menu');
  el.innerHTML = html;
  el.style.minWidth = (opts.width || 240) + 'px';
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight;
  let left = opts.align === 'right' ? r.right - w : r.left;
  left = Math.max(8, Math.min(left, innerWidth - w - 8));
  let top = r.bottom + 4;
  if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 4);
  el.style.left = left + 'px';
  el.style.top = top + 'px';
  el.addEventListener('click', (e) => { const t = e.target.closest('[data-pick]'); if (t) { onPick && onPick(t.dataset.pick, t); if (!opts.keepOpen) closePopover(); } });
  _pop = el;
  const first = el.querySelector('[data-pick]'); if (first && opts.focus !== false) first.focus();
  return el;
}
document.addEventListener('mousedown', (e) => { if (_pop && !_pop.contains(e.target) && !e.target.closest('[data-popanchor]')) closePopover(); });
document.addEventListener('keydown', (e) => {
  if (!_pop) return;
  if (e.key === 'Escape') { e.stopPropagation(); closePopover(); return; }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const items = [..._pop.querySelectorAll('[data-pick]')]; const i = items.indexOf(document.activeElement);
    e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
  }
}, true);
