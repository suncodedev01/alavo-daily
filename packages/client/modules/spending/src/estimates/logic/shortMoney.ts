import { formatBalance } from '../../money';

const MILLION = 1_000_000;
const HUNDRED = 100;

/** "40,5 tr" for a million or more, so three amounts fit side by side; smaller amounts in full. */
export function shortMoney(vnd: number): string {
  const millions = Math.abs(vnd) / MILLION;
  if (millions < 1) return formatBalance(vnd);
  const digits = millions >= HUNDRED ? String(Math.round(millions)) : millions.toFixed(1).replace(/\.0$/, '');
  return `${vnd < 0 ? '−' : ''}${digits.replace('.', ',')} tr`;
}
