import { Button, Eyebrow } from '@alavo-daily/design-system';

export interface PickerHeadingProps {
  label: string;
  manageLabel?: string;
  onManage?: () => void;
}

export function PickerHeading({ label, manageLabel, onManage }: PickerHeadingProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Eyebrow as="p">{label}</Eyebrow>
      {onManage ? (
        <Button variant="ghost" size="sm" leadingIcon="gear" onClick={onManage}>
          {manageLabel}
        </Button>
      ) : null}
    </div>
  );
}
