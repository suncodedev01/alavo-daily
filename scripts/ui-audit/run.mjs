import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { chromium } from 'playwright';

import { parseArgs } from './args.mjs';
import { auditCombo } from './audit-combo.mjs';
import { countByKind, formatTable, groupFindings, toRows } from './report.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SERVER_WAIT_MS = 90_000;

async function isReachable(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + SERVER_WAIT_MS;
  while (Date.now() < deadline) {
    if (await isReachable(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Dev server did not answer at ${url} within ${SERVER_WAIT_MS / 1000}s`);
}

async function ensureServer(url) {
  if (await isReachable(url)) return null;
  const port = new URL(url).port || '5190';
  const child = spawn('pnpm', ['--filter', '@alavo-daily/web', 'dev', '--port', port, '--strictPort'], {
    cwd: REPO_ROOT,
    shell: true,
    stdio: 'ignore',
  });
  await waitForServer(url);
  return child;
}

function buildCombos({ viewports, themes, languages }) {
  return viewports.flatMap((viewport) =>
    themes.flatMap((theme) => languages.map((language) => ({ viewport, theme, language }))),
  );
}

async function runPool(items, size, worker) {
  const queue = [...items];
  const runners = Array.from({ length: size }, async () => {
    for (let item = queue.shift(); item; item = queue.shift()) await worker(item);
  });
  await Promise.all(runners);
}

function writeReport(options, findings) {
  mkdirSync(options.out, { recursive: true });
  writeFileSync(path.join(options.out, 'findings.json'), JSON.stringify(findings, null, 2));
}

async function main() {
  const options = parseArgs(process.argv.slice(2), path.join(REPO_ROOT, '.ui-audit'));
  const server = await ensureServer(options.url);
  const browser = await chromium.launch({ headless: !options.headed });
  const findings = [];
  const combos = buildCombos(options);
  try {
    await runPool(combos, options.concurrency, async (combo) => {
      const found = await auditCombo(browser, options, combo);
      findings.push(...found);
      console.error(`done ${combo.viewport.name} ${combo.theme} ${combo.language}: ${found.length} findings`);
    });
  } finally {
    await browser.close();
    server?.kill();
  }
  writeReport(options, findings);
  console.log(formatTable(toRows(groupFindings(findings)), options.maxRows));
  console.log(`\nTotal: ${findings.length} raw findings`, countByKind(findings));
  process.exitCode = findings.length === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
