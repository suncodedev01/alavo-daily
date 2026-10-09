import type { CategoryKind } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Eyebrow, Icon, Segmented, Switch } from '@alavo-daily/design-system';

export function KindSwitch({ kind, onChange }: { kind: CategoryKind; onChange: (kind: CategoryKind) => void }) {
  const t = useT();
  return (
    <Segmented
      className="w-full"
      label={t('Loại giao dịch')}
      value={kind}
      onChange={(value) => onChange(value === 'income' ? 'income' : 'expense')}
      options={[
        { value: 'expense', label: t('Chi tiêu') },
        { value: 'income', label: t('Thu nhập') },
      ]}
    />
  );
}

export function RecurringRow({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const t = useT();
  return (
    <div className="flex items-center gap-3">
      <Icon name="repeat" size="lg" className="text-text-muted" />
      <div className="min-w-0 flex-1">
        <Eyebrow as="p">{t('Định kỳ')}</Eyebrow>
        <p className="text-sm text-text-primary">{t('Lặp lại hằng tháng')}</p>
      </div>
      <Switch label={t('Lặp lại hằng tháng')} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
