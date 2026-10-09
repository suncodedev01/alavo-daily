const JSON_LD_SCRIPT = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const CONTROL_CHARACTERS = /[\u0000-\u001f]/g;
const WRAPPER_MARKS = [
  /<!--/,
  /-->/,
  /(?:\/\/|\/\*)\s*<!\[CDATA\[(?:\s*\*\/)?/,
  /(?:\/\/|\/\*)\s*\]\]>(?:\s*\*\/)?/,
  /<!\[CDATA\[/,
  /\]\]>/,
];
const COMMENT_AND_CDATA_MARKS = new RegExp(WRAPPER_MARKS.map((mark) => mark.source).join('|'), 'g');
const RECIPE_TYPE = 'Recipe';

export function extractJsonLdBlocks(html: string): string[] {
  return Array.from(html.matchAll(JSON_LD_SCRIPT), (match) => (match[1] ?? '').trim()).filter(
    (block) => block !== '',
  );
}

/**
 * Every schema.org Recipe object found in the JSON-LD blocks of a page, each as its own JSON
 * text. Recipes sit at the top of a block, inside an array, or inside an `@graph` list.
 */
export function extractRecipeJsonLd(html: string): string[] {
  return extractJsonLdBlocks(html)
    .flatMap(recipesInBlock)
    .map((recipe) => JSON.stringify(recipe));
}

function recipesInBlock(block: string): object[] {
  const parsed = parseLeniently(block);
  return parsed === undefined ? [] : collectRecipes(parsed);
}

/** Real pages often wrap the JSON in comment marks or leave raw line breaks inside strings. */
function parseLeniently(text: string): unknown {
  const cleaned = text.replace(COMMENT_AND_CDATA_MARKS, '').trim();
  const attempts = [text, cleaned, cleaned.replace(CONTROL_CHARACTERS, ' ')];
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch {
      continue;
    }
  }
  return undefined;
}

function collectRecipes(node: unknown): object[] {
  if (Array.isArray(node)) return node.flatMap(collectRecipes);
  if (!isRecord(node)) return [];
  if (isRecipe(node)) return [node];
  return collectRecipes(node['@graph']);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRecipe(node: Record<string, unknown>): boolean {
  const types = [node['@type']].flat();
  return types.some((type) => typeof type === 'string' && type.split(/[/:#]/).pop() === RECIPE_TYPE);
}
