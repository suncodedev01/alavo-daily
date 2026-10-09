export interface ExtractedI18nKeys {
  keys: string[];
  locations: Record<string, string[]>;
  hardcodedJsx: Record<string, string[]>;
  dynamicCalls: string[];
}

export function extractI18nKeys(): ExtractedI18nKeys;
