import { StickerTile } from '@alavo-daily/design-system';

export interface IconGridProps {
  icons: readonly string[];
  value: string;
  onChange: (icon: string) => void;
  label: string;
}

const OPTION_CLASS =
  'focus-ring grid h-12 place-items-center rounded-lg text-text-secondary hover:bg-surface-tint aria-pressed:bg-accent aria-pressed:text-accent-fg';

export function IconGrid({ icons, value, onChange, label }: IconGridProps) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-6 gap-1">
      {icons.map((icon) => (
        <button
          key={icon}
          type="button"
          aria-label={icon}
          aria-pressed={icon === value}
          className={OPTION_CLASS}
          onClick={() => onChange(icon)}
        >
          <StickerTile icon={icon} kind="category" size="sm" />
        </button>
      ))}
    </div>
  );
}
