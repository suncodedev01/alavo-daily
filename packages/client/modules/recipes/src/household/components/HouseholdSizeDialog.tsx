import { useEngineMutation } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, ResponsiveDialog, Stepper } from '@alavo-daily/design-system';

import { useHouseholdSize } from '../hooks/useHouseholdSize';

export interface HouseholdSizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MIN_PEOPLE = 1;
const MAX_PEOPLE = 20;

/** "Khẩu phần mặc định": how many people a new plan or shopping list is for. */
export function HouseholdSizeDialog({ open, onOpenChange }: HouseholdSizeDialogProps) {
  const t = useT();
  const people = useHouseholdSize();
  const update = useEngineMutation('hub.update_settings');
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('Khẩu phần mặc định')}
      description={t('Số người mà thực đơn và danh sách đi chợ tính khẩu phần cho, trừ khi bạn đổi riêng từng món.')}
      footer={<Button onClick={() => onOpenChange(false)}>{t('Đóng')}</Button>}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-row font-medium">{t('Số người ăn')}</span>
        <Stepper
          value={people}
          min={MIN_PEOPLE}
          max={MAX_PEOPLE}
          label={t('Số người ăn')}
          decrementLabel={t('Bớt một người')}
          incrementLabel={t('Thêm một người')}
          format={(value) => t('{{count}} người', { count: value })}
          onChange={(householdSize) => update.mutate({ householdSize })}
        />
      </div>
    </ResponsiveDialog>
  );
}
