import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLIENT_DIR = 'packages/client';
const SEED_DIR = 'packages/engine/infrastructure/src/persistence/migrations';
const LANGUAGE_AWARE_FILES = new Set([
  'packages/client/common/src/format/dateNames.ts',
  'packages/client/common/src/format/quantity.ts',
]);
const DATA_CONSTANTS = new Set(['COMMON_UNITS', 'FOOD_CATEGORY_NAME', 'LANGUAGE_OPTIONS']);
const VOCABULARY_CONSTANTS = new Set(['RECIPE_TAGS', 'FILTERS']);
const SKIPPED_DIRS = new Set(['node_modules', 'testing', 'locales', 'showcase', 'dist']);
const VIETNAMESE_LETTER = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const SQL_STRING = /'((?:[^']|'')*)'/g;

function isSkippedFile(name) {
  return !/\.tsx?$/.test(name) || /\.(test|d)\.tsx?$/.test(name);
}

function listFiles(dir, accept) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return SKIPPED_DIRS.has(name) ? [] : listFiles(path, accept);
    return accept(name) ? [path] : [];
  });
}

function repoPath(path) {
  return relative(ROOT, path).replaceAll('\\', '/');
}

function sourceOf(path) {
  const kind = path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, kind);
}

function literalText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isParenthesizedExpression(node)) return literalText(node.expression);
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = literalText(node.left);
    const right = literalText(node.right);
    return left !== null && right !== null ? left + right : null;
  }
  return null;
}

function isTranslateCall(node) {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  if (ts.isIdentifier(callee)) return callee.text === 't';
  return ts.isPropertyAccessExpression(callee) && callee.name.text === 't';
}

function visitSource(path, found) {
  const source = sourceOf(path);
  const file = repoPath(path);
  const where = (node) => `${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
  const visit = (node, insideTranslate) => {
    if (isTranslateCall(node)) recordTranslateCall(node, where(node), found);
    else if (!insideTranslate) recordVocabulary(node, where(node), found);
    const nested = insideTranslate || isTranslateCall(node);
    ts.forEachChild(node, (child) => visit(child, nested));
  };
  visit(source, false);
}

function recordTranslateCall(node, location, found) {
  const key = node.arguments[0] ? literalText(node.arguments[0]) : null;
  if (key === null) found.dynamicCalls.push(`${location} ${node.getText().replace(/\s+/g, ' ').slice(0, 80)}`);
  else found.add('t', key, location);
}

function isFoldedConcatenation(node) {
  return ts.isBinaryExpression(node) && literalText(node) !== null;
}

function declaredNameOf(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) return current.name.text;
  }
  return null;
}

function isLabelPosition(node) {
  const parent = node.parent;
  if (ts.isArrayLiteralExpression(parent)) return true;
  return ts.isPropertyAssignment(parent) && parent.name.getText() === 'label';
}

function isVocabularyText(node, text) {
  const declared = declaredNameOf(node);
  if (declared !== null && DATA_CONSTANTS.has(declared)) return false;
  const isDeclaredVocabulary = declared !== null && VOCABULARY_CONSTANTS.has(declared);
  return VIETNAMESE_LETTER.test(text) || (isDeclaredVocabulary && isLabelPosition(node));
}

function recordVocabulary(node, location, found) {
  const parent = node.parent;
  const isLiteral = ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
  if (!isLiteral && !isFoldedConcatenation(node)) return;
  if (parent && isFoldedConcatenation(parent)) return;
  const text = literalText(node);
  if (!isVocabularyText(node, text)) return;
  const isJsx = ts.isJsxAttribute(parent) || ts.isJsxExpression(parent);
  found.add(isJsx ? 'jsx' : 'vocabulary', text, location);
}

function recordJsxText(path, found) {
  const source = sourceOf(path);
  const file = repoPath(path);
  const visit = (node) => {
    if (ts.isJsxText(node) && VIETNAMESE_LETTER.test(node.text)) {
      const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      found.add('jsx', node.text.trim().replace(/\s+/g, ' '), `${file}:${line}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

function recordSeeds(found) {
  const files = listFiles(join(ROOT, SEED_DIR), (name) => name.endsWith('.sql'));
  for (const path of files) {
    const file = repoPath(path);
    for (const match of readFileSync(path, 'utf8').matchAll(SQL_STRING)) {
      const text = match[1].replaceAll("''", "'");
      if (VIETNAMESE_LETTER.test(text)) found.add('seed', text, file);
    }
  }
}

function createFound() {
  const sources = { t: new Map(), vocabulary: new Map(), seed: new Map(), jsx: new Map() };
  return {
    sources,
    dynamicCalls: [],
    add(kind, key, location) {
      const places = sources[kind].get(key) ?? [];
      sources[kind].set(key, [...places, location]);
    },
  };
}

/** Collects every Vietnamese text the UI can show, from the code and from database seeds. */
export function extractI18nKeys() {
  const found = createFound();
  const clientFiles = listFiles(join(ROOT, CLIENT_DIR), (name) => !isSkippedFile(name)).filter(
    (path) => !LANGUAGE_AWARE_FILES.has(repoPath(path)),
  );
  for (const path of clientFiles) {
    visitSource(path, found);
    recordJsxText(path, found);
  }
  recordSeeds(found);
  const { t, vocabulary, seed, jsx } = found.sources;
  const locations = {};
  for (const map of [t, vocabulary, seed]) {
    for (const [key, places] of map) locations[key] = [...(locations[key] ?? []), ...places];
  }
  const keys = Object.keys(locations).sort();
  return {
    keys,
    locations,
    hardcodedJsx: Object.fromEntries(jsx),
    dynamicCalls: found.dynamicCalls,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = extractI18nKeys();
  const detailed = process.argv.includes('--details');
  const output = detailed ? result : { keys: result.keys };
  console.log(JSON.stringify(output, null, 2));
}
