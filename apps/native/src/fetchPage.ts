import { invoke } from '@tauri-apps/api/core';

import { callCommand } from './commandError';

export function fetchPage(url: string): Promise<string> {
  return callCommand(() => invoke<string>('fetch_page', { url }));
}
