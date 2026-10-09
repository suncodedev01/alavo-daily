const JSON_LD_SCRIPT = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

export function extractJsonLdBlocks(html: string): string[] {
  return Array.from(html.matchAll(JSON_LD_SCRIPT), (match) => (match[1] ?? '').trim()).filter(
    (block) => block !== '',
  );
}
