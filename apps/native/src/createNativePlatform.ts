import type { PlatformServices } from '@alavo-daily/common';

/** Native implementation, used by the Tauri app. Reminders while closed need OS scheduling that is not built yet. */
export function createNativePlatform(): PlatformServices {
  return {
    capabilities: {
      backgroundReminders: false,
      keepAwake: true,
      importFromUrl: false,
      googleSync: false,
    },
    keepAwake: async () => () => undefined,
    saveTextFile: downloadTextFile,
    openLink: async (url) => void window.open(url, '_blank', 'noopener,noreferrer'),
    notify: async () => false,
  };
}

async function downloadTextFile(filename: string, content: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
