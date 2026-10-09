import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { MAX_POPUPS_PER_ROUTE, NOTIFICATION_BELL_LABELS, POPUP_TRIGGERS, routesFor } from './routes.mjs';

const BROWSER_SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'browser-audit.js');
const FREEZE_MOTION = '*,*::before,*::after{transition-duration:0s!important;animation-duration:0s!important;animation-delay:0s!important;scroll-behavior:auto!important}';
const SETTLE_MS = 450;
const RETRIES = 3;

async function settle(page) {
  await page.waitForFunction(() => !document.querySelector('[class*=animate-pulse]'), null, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(SETTLE_MS);
}

async function navigate(page, route) {
  await page.evaluate(async (target) => {
    const next = `#${target}`;
    if (location.hash === next) {
      location.hash = '#/__reset';
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    location.hash = next;
  }, route);
  await settle(page);
}

async function seed(page, options, { language, theme }) {
  await page.goto(`${options.url}/#/today`);
  await page.waitForFunction(() => Boolean(window.__engine), null, { timeout: 30_000 }).catch(() => {
    throw new Error('window.__engine is missing: run the audit against the dev server (pnpm dev:web)');
  });
  const ids = await page.evaluate(async (settings) => {
    const engine = window.__engine;
    await engine.ready;
    await engine.call('hub.load_demo_data');
    await engine.call('hub.update_settings', settings);
    const recipes = await engine.call('recipes.list');
    const transactions = await engine.call('spending.list_transactions');
    return { recipeId: recipes[0]?.id, transactionId: transactions[0]?.id };
  }, { language, theme });
  await page.reload();
  await settle(page);
  return ids;
}

async function newPage(browser, options, { viewport }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript({ path: BROWSER_SCRIPT });
  const page = await context.newPage();
  await page.addInitScript((css) => {
    addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.append(style);
    });
  }, FREEZE_MOTION);
  return page;
}

async function collect(page, route, scope, combo) {
  const raw = await page.evaluate(() => window.__uiAudit());
  return raw.map((finding) => ({
    ...finding,
    route: scope ? `${route} ${scope}` : route,
    viewport: combo.viewport.name,
    theme: combo.theme,
    language: combo.language,
  }));
}

async function screenshotIfNeeded(page, options, combo, route, found) {
  if (!options.shots || (found.length === 0 && !options.allShots)) return;
  mkdirSync(options.out, { recursive: true });
  const name = `${combo.viewport.name}-${combo.theme}-${combo.language}-${route.replace(/[^a-z0-9]+/gi, '_')}.png`;
  await page.screenshot({ path: path.join(options.out, name) });
}

async function popupTriggers(page) {
  return page.evaluate((selector) => {
    const seen = new Set();
    const result = [];
    document.querySelectorAll(selector).forEach((el, index) => {
      const r = el.getBoundingClientRect();
      const key = `${el.tagName}|${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}`;
      if (r.width < 2 || r.height < 2 || seen.has(key)) return;
      seen.add(key);
      el.setAttribute('data-audit-trigger', String(index));
      result.push(String(index));
    });
    return result;
  }, POPUP_TRIGGERS);
}

function findingKey(finding) {
  return `${finding.kind}|${finding.selector}|${finding.detail}`;
}

async function auditPopups(page, route, options, combo, baseline) {
  const known = new Set(baseline.map(findingKey));
  const found = [];
  const triggers = (await popupTriggers(page)).slice(0, MAX_POPUPS_PER_ROUTE);
  for (const id of triggers) {
    await navigate(page, route);
    await popupTriggers(page);
    const trigger = page.locator(`[data-audit-trigger="${id}"]`).first();
    const label = await trigger.evaluate((el) => (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)).catch(() => null);
    if (label === null) continue;
    const opened = await trigger.click({ timeout: 2000 }).then(() => true).catch(() => false);
    if (!opened) continue;
    await settle(page);
    const scope = `[popup "${label}"]`;
    const popup = await collect(page, route, scope, combo);
    await screenshotIfNeeded(page, options, combo, `${route}${scope}`, popup);
    found.push(...popup.filter((item) => !known.has(findingKey(item))));
    await page.keyboard.press('Escape');
  }
  return found;
}

async function auditNotifications(page, options, combo) {
  await navigate(page, '/today');
  const selector = NOTIFICATION_BELL_LABELS.map((label) => `button[aria-label^="${label}"]`).join(', ');
  const bell = page.locator(selector).first();
  const clicked = await bell.click({ timeout: 2000 }).then(() => true).catch(() => false);
  if (!clicked) return [];
  await settle(page);
  const found = await collect(page, '/today', '[notifications open]', combo);
  await screenshotIfNeeded(page, options, combo, '/today-notifications', found);
  return found;
}

async function auditOneRoute(page, route, options, combo) {
  await navigate(page, route);
  const result = await collect(page, route, '', combo);
  await screenshotIfNeeded(page, options, combo, route, result);
  if (route.includes('/cook/')) return result;
  return [...result, ...(await auditPopups(page, route, options, combo, result))];
}

async function auditWithRetry(page, route, options, combo) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await auditOneRoute(page, route, options, combo);
    } catch (error) {
      if (attempt >= RETRIES) throw error;
      await page.waitForLoadState('load').catch(() => {});
      await settle(page);
    }
  }
}

async function auditRoutes(page, options, combo, ids) {
  const found = [];
  for (const route of routesFor(ids, options.routeFilter)) {
    found.push(...(await auditWithRetry(page, route, options, combo)));
  }
  if (!options.routeFilter) found.push(...(await auditNotifications(page, options, combo)));
  return found;
}

export async function auditCombo(browser, options, combo) {
  const page = await newPage(browser, options, combo);
  try {
    const ids = await seed(page, options, combo);
    return await auditRoutes(page, options, combo, ids);
  } finally {
    await page.context().close();
  }
}
