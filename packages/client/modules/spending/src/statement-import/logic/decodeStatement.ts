const LEGACY_VIETNAMESE_ENCODING = 'windows-1258';

/** Bank exports are UTF-8 most of the time; older ones use the Windows Vietnamese code page. */
export function decodeStatement(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder(LEGACY_VIETNAMESE_ENCODING).decode(bytes);
  }
}
