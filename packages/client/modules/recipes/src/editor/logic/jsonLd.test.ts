import { describe, expect, it } from 'vitest';

import { extractJsonLdBlocks, extractRecipeJsonLd } from './jsonLd';

describe('extractJsonLdBlocks', () => {
  it('returns every JSON-LD script body', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">{"@type":"WebSite"}</script>
        <script>var x = 1;</script>
        <script type='application/ld+json' id="recipe">
          {"@type":"Recipe","name":"Canh chua"}
        </script>
      </head></html>`;
    expect(extractJsonLdBlocks(html)).toEqual([
      '{"@type":"WebSite"}',
      '{"@type":"Recipe","name":"Canh chua"}',
    ]);
  });

  it('returns nothing for a page without JSON-LD', () => {
    expect(extractJsonLdBlocks('<p>hello</p>')).toEqual([]);
  });

  it('skips empty blocks', () => {
    expect(extractJsonLdBlocks('<script type="application/ld+json">  </script>')).toEqual([]);
  });
});

function page(...blocks: string[]): string {
  return blocks.map((block) => `<script type="application/ld+json">${block}</script>`).join('\n');
}

function recipes(html: string): unknown[] {
  return extractRecipeJsonLd(html).map((json) => JSON.parse(json));
}

describe('extractRecipeJsonLd', () => {
  it('finds a recipe at the top of a block', () => {
    expect(recipes(page('{"@type":"Recipe","name":"Canh chua"}'))).toEqual([
      { '@type': 'Recipe', name: 'Canh chua' },
    ]);
  });

  it('skips blocks that are not recipes', () => {
    const html = page('{"@type":"WebSite"}', '{"@type":"Recipe","name":"A"}', '{"@type":"Article"}');
    expect(recipes(html)).toEqual([{ '@type': 'Recipe', name: 'A' }]);
  });

  it('finds a recipe inside an @graph list next to other nodes', () => {
    const graph = '{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":"Recipe","name":"Bún chả"}]}';
    expect(recipes(page(graph))).toEqual([{ '@type': 'Recipe', name: 'Bún chả' }]);
  });

  it('finds a recipe inside a top-level array', () => {
    const list = '[{"@type":"Organization"},{"@type":"Recipe","name":"Phở"}]';
    expect(recipes(page(list))).toEqual([{ '@type': 'Recipe', name: 'Phở' }]);
  });

  it('finds a recipe inside a graph inside an array', () => {
    const nested = '[{"@graph":[{"@type":["Thing","Recipe"],"name":"Gà kho"}]}]';
    expect(recipes(page(nested))).toEqual([{ '@type': ['Thing', 'Recipe'], name: 'Gà kho' }]);
  });

  it('accepts an array of types and a full schema.org type address', () => {
    const html = page(
      '{"@type":["Recipe","NewsArticle"],"name":"A"}',
      '{"@type":"https://schema.org/Recipe","name":"B"}',
      '{"@type":"schema:Recipe","name":"C"}',
    );
    expect(recipes(html).map((own) => (own as { name: string }).name)).toEqual(['A', 'B', 'C']);
  });

  it('does not take a type that only ends with the word', () => {
    expect(recipes(page('{"@type":"NotARecipe","name":"X"}'))).toEqual([]);
  });

  it('returns every recipe when a page lists several', () => {
    const html = page('{"@type":"Recipe","name":"A"}', '{"@graph":[{"@type":"Recipe","name":"B"}]}');
    expect(recipes(html)).toHaveLength(2);
  });

  it('reads a block with raw line breaks inside a string', () => {
    const block = '{"@type":"Recipe","name":"Canh\nchua"}';
    expect(recipes(page(block))).toEqual([{ '@type': 'Recipe', name: 'Canh chua' }]);
  });

  it('reads a block wrapped in comment and CDATA marks', () => {
    const wrapped = '//<![CDATA[\n{"@type":"Recipe","name":"A"}\n//]]>';
    expect(recipes(page(wrapped))).toEqual([{ '@type': 'Recipe', name: 'A' }]);
  });

  it('ignores a block that is not JSON at all', () => {
    expect(recipes(page('not json {', '{"@type":"Recipe","name":"A"}'))).toHaveLength(1);
  });

  it('returns nothing for a page without JSON-LD or without a recipe', () => {
    expect(extractRecipeJsonLd('<p>hello</p>')).toEqual([]);
    expect(extractRecipeJsonLd(page('{"@type":"WebSite"}', '42', 'null'))).toEqual([]);
  });
});
