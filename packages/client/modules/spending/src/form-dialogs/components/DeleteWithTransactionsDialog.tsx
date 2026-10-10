import { useState } from 'react';

import { useT } from '@alavo-daily/common';
import { Button, Icon, OptionPicker, ResponsiveDialog } from '@alavo-daily/design-system';

import { describeEngineError } from '../../engine-errors';

export interface MoveTarget {
  id: string;
  label: string;
  hint?: string;
  icon: string;
}

/** What the person decided to do with the transactions of the thing being deleted. */
export interface TransactionsChoice {
  moveTransactionsTo?: string;
  deleteTransactions?: boolean;
}

export interface DeleteWithTransactionsDialogProps {
  title: string;
  /** Said when there are transactions: "What should happen to them?" */
  description: string;
  /** Said when there are none. */
  emptyDescription: string;
  /** False while the engine is still counting, which keeps the delete button off. */
  ready: boolean;
  hasTransactions: boolean;
  targets: readonly MoveTarget[];
  moveHint: string;
  moveLabel: string;
  targetLabel: string;
  removeLabel: string;
  removeHint: string;
  onConfirm: (choice: TransactionsChoice) => Promise<unknown>;
  onClose: () => void;
}

type Choice = 'move' | 'remove';

const CHOICE_CLASS =
  'focus-ring flex w-full items-start gap-3 rounded-lg p-3 text-left text-sm inset-ring inset-ring-line-hairline hover:bg-surface-tint aria-pressed:bg-accent aria-pressed:text-accent-fg aria-pressed:inset-ring-0';

/** Deleting a wallet or a category that has transactions: move them to another one, or delete them. */
export function DeleteWithTransactionsDialog(props: DeleteWithTransactionsDialogProps) {
  const t = useT();
  const { targets, hasTransactions, onConfirm, onClose } = props;
  const [choice, setChoice] = useState<Choice>(targets.length > 0 ? 'move' : 'remove');
  const [targetId, setTargetId] = useState(targets[0]?.id ?? '');
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const confirm = async () => {
    setPending(true);
    try {
      await onConfirm(choiceToPayload(hasTransactions, choice, targetId));
      onClose();
    } catch (error) {
      setFailure(describeEngineError(error, t));
      setPending(false);
    }
  };
  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={props.title}
      description={hasTransactions ? props.description : props.emptyDescription}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('Huỷ')}
          </Button>
          <Button variant="destructive" disabled={!props.ready || pending} onClick={() => void confirm()}>
            {t('Xoá')}
          </Button>
        </>
      }
    >
      {hasTransactions ? (
        <TransactionChoices {...props} choice={choice} onChoice={setChoice} targetId={targetId} onTarget={setTargetId} />
      ) : null}
      {failure ? (
        <p role="alert" className="text-sm text-destructive-fg">
          {failure}
        </p>
      ) : null}
    </ResponsiveDialog>
  );
}

function choiceToPayload(hasTransactions: boolean, choice: Choice, targetId: string): TransactionsChoice {
  if (!hasTransactions) return {};
  return choice === 'move' ? { moveTransactionsTo: targetId } : { deleteTransactions: true };
}

interface ChoicesProps extends DeleteWithTransactionsDialogProps {
  choice: Choice;
  onChoice: (choice: Choice) => void;
  targetId: string;
  onTarget: (id: string) => void;
}

function TransactionChoices({ targets, moveLabel, moveHint, targetLabel, removeLabel, removeHint, choice, onChoice, targetId, onTarget }: ChoicesProps) {
  const canMove = targets.length > 0;
  return (
    <div className="grid gap-2">
      <button type="button" disabled={!canMove} aria-pressed={choice === 'move'} className={CHOICE_CLASS} onClick={() => onChoice('move')}>
        <Icon name="arrows-left-right" size="lg" />
        <span className="grid gap-1">
          <span className="font-medium">{moveLabel}</span>
          <span className="text-text-muted">{moveHint}</span>
        </span>
      </button>
      {choice === 'move' && canMove ? (
        <OptionPicker
          label={targetLabel}
          value={targetId}
          options={targets.map((target) => ({ value: target.id, label: target.label, hint: target.hint, icon: target.icon }))}
          onChange={onTarget}
        />
      ) : null}
      <button type="button" aria-pressed={choice === 'remove'} className={CHOICE_CLASS} onClick={() => onChoice('remove')}>
        <Icon name="trash" size="lg" />
        <span className="grid gap-1">
          <span className="font-medium">{removeLabel}</span>
          <span className="text-text-muted">{removeHint}</span>
        </span>
      </button>
    </div>
  );
}
