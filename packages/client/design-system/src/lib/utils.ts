import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const mergeClasses = extendTailwindMerge({
  extend: {
    theme: {
      text: ['display', 'title', 'row', 'meta', 'micro'],
      shadow: ['hairline', 'raised', 'card', 'frame', 'overlay'],
      radius: ['4xl'],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return mergeClasses(clsx(inputs));
}
