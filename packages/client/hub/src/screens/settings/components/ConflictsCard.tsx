import { useEngineMutation, useEngineQuery, useT, type SyncConflict } from '@alavo-daily/common';
import { Button, Card, IconTile, useToast } from '@alavo-daily/design-system';

import { conflictTitle, describeVersion } from '../logic/describeConflict';

type Keep = 'local' | 'remote';

/** Rows that two devices changed at the same time. The person picks the version to keep. */
export function ConflictsCard() {
  const t = useT();
  const { toast } = useToast();
  const conflicts = useEngineQuery('sync.list_conflicts');
  const resolve = useEngineMutation('sync.resolve_conflict');
  const choose = (id: string, keep: Keep) =>
    resolve.mutate({ id, keep }, { onSuccess: () => toast(t('Đã chọn bản dữ liệu')) });
  if (!conflicts.data?.length) return null;
  return (
    <Card padding="lg" className="grid gap-4">
      <div className="flex items-center gap-4">
        <IconTile icon="git-merge" size="lg" />
        <div>
          <h2 className="text-title font-semibold">{t('Hai thiết bị cùng sửa dữ liệu')}</h2>
          <p className="mt-1 text-sm text-text-muted">
            {t('Chọn bản bạn muốn giữ. Lựa chọn này được áp dụng cho cả hai thiết bị.')}
          </p>
        </div>
      </div>
      {conflicts.data.map((conflict) => (
        <ConflictItem key={conflict.id} conflict={conflict} disabled={resolve.isPending} onChoose={choose} />
      ))}
    </Card>
  );
}

interface ConflictItemProps {
  conflict: SyncConflict;
  disabled: boolean;
  onChoose: (id: string, keep: Keep) => void;
}

function ConflictItem({ conflict, disabled, onChoose }: ConflictItemProps) {
  const t = useT();
  return (
    <section aria-label={conflictTitle(conflict, t)} className="grid gap-3 rounded-lg bg-surface-tint p-4">
      <h3 className="text-sm font-semibold">{conflictTitle(conflict, t)}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Version
          heading={t('Bản trên máy này')}
          text={describeVersion(conflict.entityType, conflict.local, t)}
          action={t('Giữ bản trên máy này')}
          disabled={disabled}
          onChoose={() => onChoose(conflict.id, 'local')}
        />
        <Version
          heading={t('Bản từ thiết bị khác')}
          text={describeVersion(conflict.entityType, conflict.remote, t)}
          action={t('Dùng bản từ thiết bị khác')}
          disabled={disabled}
          onChoose={() => onChoose(conflict.id, 'remote')}
        />
      </div>
    </section>
  );
}

interface VersionProps {
  heading: string;
  text: string;
  action: string;
  disabled: boolean;
  onChoose: () => void;
}

function Version({ heading, text, action, disabled, onChoose }: VersionProps) {
  return (
    <div className="grid content-between gap-3 rounded-lg bg-card p-3">
      <div className="min-w-0">
        <p className="text-meta text-text-muted">{heading}</p>
        <p className="mt-1 break-words text-sm">{text}</p>
      </div>
      <Button variant="outline" size="sm" disabled={disabled} onClick={onChoose} className="justify-self-start">
        {action}
      </Button>
    </div>
  );
}
