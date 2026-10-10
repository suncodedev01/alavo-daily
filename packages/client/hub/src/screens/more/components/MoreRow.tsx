import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useT, type MoreItem } from '@alavo-daily/common';
import { Icon, IconTile } from '@alavo-daily/design-system';

const ROW_CLASS =
  'focus-ring flex min-h-14 w-full items-center gap-3 rounded-lg px-1 py-2 text-left hover:bg-surface-tint';

/** One row of a "Khác" section. What it does depends on the kind of target the module declared. */
export function MoreRow({ item }: { item: MoreItem }) {
  if ('screen' in item.target) return <ScreenRow item={item} path={item.target.screen} />;
  if ('dialog' in item.target) return <DialogRow item={item} />;
  return <ActionRow item={item} />;
}

function ScreenRow({ item, path }: { item: MoreItem; path: string }) {
  const navigate = useNavigate();
  return <RowButton item={item} onPress={() => navigate(path)} />;
}

function DialogRow({ item }: { item: MoreItem }) {
  const [open, setOpen] = useState(false);
  const Dialog = 'dialog' in item.target ? item.target.dialog : null;
  return (
    <>
      <RowButton item={item} onPress={() => setOpen(true)} />
      {Dialog ? <Dialog open={open} onOpenChange={setOpen} /> : null}
    </>
  );
}

function ActionRow({ item }: { item: MoreItem }) {
  const useAction = 'useAction' in item.target ? item.target.useAction : null;
  return useAction ? <RunnableRow item={item} useAction={useAction} /> : null;
}

function RunnableRow({ item, useAction }: { item: MoreItem; useAction: () => () => void }) {
  const run = useAction();
  return <RowButton item={item} onPress={run} />;
}

function RowButton({ item, onPress }: { item: MoreItem; onPress: () => void }) {
  const t = useT();
  return (
    <button type="button" className={ROW_CLASS} onClick={onPress}>
      <IconTile icon={item.icon} />
      <span className="grid min-w-0 flex-1">
        <span className="truncate text-row font-medium">{t(item.label)}</span>
        <RowDescription item={item} />
      </span>
      <Icon name="caret-right" className="text-text-muted" />
    </button>
  );
}

function RowDescription({ item }: { item: MoreItem }) {
  const t = useT();
  if (item.useDescription) return <ComputedDescription useText={item.useDescription} />;
  return item.description ? <span className="truncate text-sm text-text-muted">{t(item.description)}</span> : null;
}

function ComputedDescription({ useText }: { useText: () => string | undefined }) {
  const text = useText();
  return text ? <span className="truncate text-sm text-text-muted">{text}</span> : null;
}
