import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LEVELS = ['major', 'minor', 'patch'];
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function bumpVersion(version, level) {
  const match = SEMVER.exec(version);
  if (!match) throw new Error(`Not a plain major.minor.patch version: ${version}`);
  if (!LEVELS.includes(level)) throw new Error(`Unknown bump level: ${level}`);
  const [major, minor, patch] = match.slice(1).map(Number);
  if (level === 'major') return `${major + 1}.0.0`;
  if (level === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

export function replaceFirstVersionLine(text, version) {
  return text.replace(/^version = "[^"]*"/m, `version = "${version}"`);
}

export function replaceWorkspaceCrateVersions(lockText, version) {
  return lockText.replace(/(name = "alavo-[^"]*"\r?\nversion = )"[^"]*"/g, `$1"${version}"`);
}

const JSON_FILES = ['package.json', 'apps/web/package.json', 'apps/native/package.json'];
const TAURI_CONFIG = 'apps/native/src-tauri/tauri.conf.json';
const CARGO_FILES = ['apps/native/src-tauri/Cargo.toml'];
const ENGINE_WORKSPACE = 'packages/engine/Cargo.toml';
const CARGO_LOCKS = ['packages/engine/Cargo.lock', 'apps/native/src-tauri/Cargo.lock'];

function readText(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function writeText(path, text) {
  writeFileSync(resolve(root, path), text);
}

function setJsonVersion(path, version) {
  const text = readText(path);
  const updated = text.replace(/^(\s*"version":\s*)"[^"]*"/m, `$1"${version}"`);
  writeText(path, updated);
}

function setEngineWorkspaceVersion(version) {
  const text = readText(ENGINE_WORKSPACE);
  const updated = text.replace(
    /(\[workspace\.package\][^[]*?\nversion = )"[^"]*"/,
    `$1"${version}"`,
  );
  writeText(ENGINE_WORKSPACE, updated);
}

function writeEverywhere(version) {
  [...JSON_FILES, TAURI_CONFIG].forEach((path) => setJsonVersion(path, version));
  CARGO_FILES.forEach((path) => writeText(path, replaceFirstVersionLine(readText(path), version)));
  setEngineWorkspaceVersion(version);
  CARGO_LOCKS.forEach((path) =>
    writeText(path, replaceWorkspaceCrateVersions(readText(path), version)),
  );
}

function main(args) {
  const [level, ...flags] = args;
  const current = JSON.parse(readText('package.json')).version;
  const next = bumpVersion(current, level);
  if (!flags.includes('--dry-run')) writeEverywhere(next);
  process.stdout.write(`${next}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
