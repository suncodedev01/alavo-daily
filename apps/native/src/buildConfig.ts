declare const __ALAVO_GOOGLE_SYNC__: boolean | undefined;

export function isGoogleConfigured(): boolean {
  return typeof __ALAVO_GOOGLE_SYNC__ !== 'undefined' && __ALAVO_GOOGLE_SYNC__;
}
