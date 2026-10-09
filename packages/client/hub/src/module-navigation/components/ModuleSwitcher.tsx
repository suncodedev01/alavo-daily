import {
  hasSticker,
  IconTile,
  Icon,
  Menu,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  ModulePill,
  Sheet,
  StickerTile,
  cn,
} from '@alavo-daily/design-system';
import { useT, type ModuleManifest } from '@alavo-daily/common';

import { useModules } from '../../module-registry';
import { HOME_MODULE } from '../logic/navigation';
import { useSelectModule } from '../hooks/useModuleNavigation';

function useSwitcherEntries(): ModuleManifest[] {
  return [HOME_MODULE, ...useModules()];
}

export function ModuleSwitcherMenu({ current }: { current: ModuleManifest }) {
  const t = useT();
  const select = useSelectModule();
  const entries = useSwitcherEntries();
  const label = `${t('Chuyển ứng dụng')}: ${t(current.name)}`;
  return (
    <Menu trigger={<ModulePill variant="row" icon={current.icon} name={t(current.name)} aria-label={label} />}>
      <MenuLabel>{t('Ứng dụng')}</MenuLabel>
      {entries.map((entry) => (
        <MenuItem
          key={entry.id}
          leading={<StickerTile icon={entry.icon} kind="module" size="sm" />}
          selected={entry.id === current.id}
          onSelect={() => select(entry.id)}
        >
          <span className="grid">
            <span>{t(entry.name)}</span>
            <span className="truncate text-xs text-text-muted">{t(entry.description)}</span>
          </span>
        </MenuItem>
      ))}
      <MenuSeparator />
      <MenuItem icon="plus" hint={t('Sắp có')} disabled>
        {t('Thêm ứng dụng')}
      </MenuItem>
    </Menu>
  );
}

export interface ModuleSwitcherSheetProps {
  current: ModuleManifest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModuleSwitcherSheet({ current, open, onOpenChange }: ModuleSwitcherSheetProps) {
  const t = useT();
  const select = useSelectModule();
  const entries = useSwitcherEntries();
  const choose = (id: string) => {
    onOpenChange(false);
    select(id);
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('Chuyển ứng dụng')}>
      <div className="grid gap-1">
        {entries.map((entry) => (
          <SwitcherRow
            key={entry.id}
            entry={entry}
            current={entry.id === current.id}
            onChoose={() => choose(entry.id)}
          />
        ))}
        <SwitcherRow entry={MORE_APPS_ENTRY} current={false} disabled />
      </div>
    </Sheet>
  );
}

type RowEntry = Pick<ModuleManifest, 'name' | 'icon' | 'description'>;

const MORE_APPS_ENTRY: RowEntry = { name: 'Thêm ứng dụng', icon: 'plus', description: 'Sắp có' };

interface SwitcherRowProps {
  entry: RowEntry;
  current: boolean;
  disabled?: boolean;
  onChoose?: () => void;
}

function SwitcherRow({ entry, current, disabled = false, onChoose }: SwitcherRowProps) {
  const t = useT();
  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={current ? 'true' : undefined}
      onClick={onChoose}
      className={cn(
        'focus-ring flex min-h-14 w-full items-center gap-3 rounded-lg px-2 text-left hover:bg-surface-tint disabled:opacity-50',
        current && 'bg-accent text-accent-fg hover:bg-accent',
      )}
    >
      {hasSticker(entry.icon) ? (
        <StickerTile icon={entry.icon} kind="module" size="lg" />
      ) : (
        <IconTile icon={entry.icon} tone="solid" />
      )}
      <span className="grid min-w-0 flex-1">
        <span className="truncate text-base font-medium">{t(entry.name)}</span>
        <span className="truncate text-xs text-text-muted">{t(entry.description)}</span>
      </span>
      {current ? <Icon name="check" size="lg" /> : null}
    </button>
  );
}
