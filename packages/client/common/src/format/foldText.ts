/** Lowercases and strips Vietnamese diacritics so a search matches "ca phe" with "Cà phê". */
export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}
