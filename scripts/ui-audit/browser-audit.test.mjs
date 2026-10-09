import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const SCRIPT = fileURLToPath(new URL('./browser-audit.js', import.meta.url));
let browser;
let page;

before(async () => {
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 360, height: 640 } });
});

after(() => browser.close());

async function kindsFor(html) {
  await page.setContent(`<body style="margin:0;font:14px sans-serif">${html}</body>`);
  await page.addScriptTag({ path: SCRIPT });
  const findings = await page.evaluate(() => window.__uiAudit());
  return findings.map((finding) => finding.kind);
}

test('reports a label that sticks out of its pill', async () => {
  const kinds = await kindsFor(
    '<button style="width:70px;height:44px;white-space:nowrap;padding:0 4px">Đồng bộ Google</button>',
  );
  assert.ok(kinds.includes('text-outside-box'), kinds.join());
});

test('accepts a label that wraps inside its pill', async () => {
  const kinds = await kindsFor('<button style="width:70px;min-height:44px">Đồng bộ Google</button>');
  assert.deepEqual(kinds, []);
});

test('ignores text that is cut with an ellipsis on purpose', async () => {
  const kinds = await kindsFor(
    '<div style="width:60px;height:44px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">A very long title</div>',
  );
  assert.deepEqual(kinds, []);
});

test('reports a page that scrolls sideways', async () => {
  const kinds = await kindsFor('<div style="width:500px;height:20px">wide</div>');
  assert.ok(kinds.includes('page-h-scroll'));
});

test('reports a button under 44px on a phone', async () => {
  const kinds = await kindsFor('<button style="width:30px;height:30px">x</button>');
  assert.ok(kinds.includes('small-target'));
});

test('counts a larger invisible hit area as part of the button', async () => {
  const kinds = await kindsFor(
    '<style>b{position:relative;display:block;width:20px;height:20px;margin:30px}b::after{content:"";position:absolute;inset:-12px}</style><button style="all:unset"><b></b></button>',
  );
  assert.ok(!kinds.includes('small-target'));
});

test('reports text cut off at the bottom of a box', async () => {
  const kinds = await kindsFor('<div style="width:200px;height:12px;overflow:hidden">Line one<br>Line two<br>Line three</div>');
  assert.ok(kinds.includes('v-clip'));
});

test('reports two buttons drawn on top of each other', async () => {
  const kinds = await kindsFor(
    '<button style="position:absolute;left:0;top:0;width:80px;height:44px">A</button><button style="position:absolute;left:40px;top:10px;width:80px;height:44px">B</button>',
  );
  assert.ok(kinds.includes('overlap'));
});
