export const PALETTE_KEY = 'alavo-palette';
export const MENH_KEY = 'alavo-menh';
export const MENH_YEAR_KEY = 'alavo-menh-year';
export const MENH_BEFORE_TET_KEY = 'alavo-menh-before-tet';

export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string | null): void {
  try {
    if (value === null || value === '') window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}
