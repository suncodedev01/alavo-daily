import type { CategoryKind, CategoryShare } from '@alavo-daily/common/engine';
import { formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { StickerTile } from '@alavo-daily/design-system';

import { useLookups } from '../../lookups';
import { SectionCard } from '../../overview';
import { shareText } from '../logic/shareText';

const HEAD_CELL = 'px-2 py-2 text-xs font-medium text-text-muted lg:px-3';
const CELL = 'px-2 py-2 lg:px-3';
const COUNT_CELL = 'max-lg:hidden';

export function CategoryTable({ categories, kind }: { categories: readonly CategoryShare[]; kind: CategoryKind }) {
  const t = useT();
  const lookups = useLookups();
  const rows = categories.filter((item) => item.kind === kind);
  return (
    <SectionCard title={t('Chi tiết theo hạng mục')}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">{t('Chi tiết theo hạng mục')}</caption>
          <thead>
            <tr className="border-b border-line-hairline text-left">
              <th scope="col" className={HEAD_CELL}>{t('Hạng mục')}</th>
              <th scope="col" className={`${HEAD_CELL} ${COUNT_CELL} text-right`}>{t('Giao dịch')}</th>
              <th scope="col" className={`${HEAD_CELL} text-right`}>{t('Tổng')}</th>
              <th scope="col" className={`${HEAD_CELL} text-right`}>{t('Tỷ lệ')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.categoryId} className="border-b border-line-hairline last:border-b-0">
                <th scope="row" className={`${CELL} text-left font-medium`}>
                  <span className="flex items-center gap-2">
                    <StickerTile icon={lookups.categoryIcon(item.categoryId)} kind="category" size="sm" />
                    <span className="min-w-0">{lookups.categoryName(item.categoryId) || t(item.name)}</span>
                  </span>
                </th>
                <td className={`${CELL} ${COUNT_CELL} text-right text-text-muted`}>{item.transactionCount}</td>
                <td className={`${CELL} text-right whitespace-nowrap`}>{formatVnd(item.totalVnd)}</td>
                <td className={`${CELL} text-right text-text-muted`}>{shareText(item.share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
