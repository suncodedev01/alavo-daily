import { describe, expect, it } from 'vitest';

import { extractJsonLdBlocks } from './jsonLd';

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
