import { invoke } from '@tauri-apps/api/core';

import { callCommand } from './commandError';

export async function saveTextFile(filename: string, content: string): Promise<void> {
  await callCommand(() => invoke<boolean>('save_text_file', { fileName: filename, content }));
}
