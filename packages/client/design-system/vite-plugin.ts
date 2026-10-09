import { fileURLToPath } from 'node:url';

import type { Plugin } from 'vite';

const designSystemSource = fileURLToPath(new URL('./src', import.meta.url));

/**
 * The design system imports its own files as `@/...`. Add this plugin to any Vite or Vitest
 * config that consumes the package from source, so those imports resolve inside the package
 * and never against the consumer's own folders.
 */
export function designSystemAlias(): Plugin {
  return {
    name: 'design-system-alias',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const fromDesignSystem = importer?.split('\\').join('/').includes('/design-system/');
      if (!source.startsWith('@/') || !fromDesignSystem) return null;
      return this.resolve(`${designSystemSource}/${source.slice(2)}`, importer, {
        ...options,
        skipSelf: true,
      });
    },
  };
}
