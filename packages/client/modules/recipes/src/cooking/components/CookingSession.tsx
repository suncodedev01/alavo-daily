import type { Recipe } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, Card, EmptyState, Icon, ResponsiveDialog, useLayout } from '@alavo-daily/design-system';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { CookingFooter } from './CookingFooter';
import { CookingHeader } from './CookingHeader';
import { IngredientChecklist } from './IngredientChecklist';
import { StepTimerPanel } from './StepTimerPanel';
import type { TimerBank } from '../logic/timerBank';
import { useCheckedIngredients } from '../hooks/useCheckedIngredients';
import { useStepNavigation } from '../hooks/useStepNavigation';
import { useTimerAlert } from '../hooks/useTimerAlert';
import { useKeepAwake } from '../hooks/useKeepAwake';
import { useTimerBank } from '../hooks/useTimerBank';

export interface CookingSessionProps {
  recipe: Recipe;
  servings: number;
}

export function CookingSession({ recipe, servings }: CookingSessionProps) {
  const t = useT();
  const layout = useLayout();
  const navigate = useNavigate();
  const stepCount = recipe.steps.length;
  const { stepIndex, goPrevious, goNext } = useStepNavigation(stepCount);
  const bank = useTimerBank(recipe.steps);
  const awake = useKeepAwake();
  const [alertText, dismissAlert] = useTimerAlert(bank, recipe.steps);
  const [checked, toggleChecked] = useCheckedIngredients();
  const [listOpen, setListOpen] = useState(false);
  const leave = () => navigate(`/recipes/list/${recipe.id}`);
  const checklist = (
    <IngredientChecklist
      ingredients={recipe.ingredients}
      baseServings={recipe.servings}
      servings={servings}
      checked={checked}
      onToggle={toggleChecked}
    />
  );
  if (stepCount === 0) return <NoSteps onEdit={() => navigate(`/recipes/edit/${recipe.id}`)} />;
  return (
    <div className="flex h-dvh flex-col bg-paper text-text-primary">
      <CookingHeader
        name={recipe.name}
        servings={servings}
        awake={awake}
        stepNumber={stepIndex + 1}
        stepCount={stepCount}
        bank={bank}
        stepIndex={stepIndex}
        onClose={leave}
      />
      {alertText ? <AlertBanner text={alertText} onDismiss={dismissAlert} /> : null}
      <div className="grid min-h-0 flex-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">
        <StepPanel text={recipe.steps[stepIndex]?.text ?? ''} bank={bank} stepIndex={stepIndex} />
        {layout === 'wide' ? <Card className="max-h-full self-start overflow-y-auto">{checklist}</Card> : null}
      </div>
      <CookingFooter
        stepIndex={stepIndex}
        stepCount={stepCount}
        onPrevious={goPrevious}
        onNext={goNext}
        onFinish={leave}
        onOpenIngredients={() => setListOpen(true)}
      />
      {layout === 'narrow' ? (
        <ResponsiveDialog
          open={listOpen}
          onOpenChange={setListOpen}
          title={t('Nguyên liệu')}
          closeLabel={t('Đóng')}
        >
          {checklist}
        </ResponsiveDialog>
      ) : null}
    </div>
  );
}

interface StepPanelProps {
  text: string;
  bank: TimerBank;
  stepIndex: number;
}

function StepPanel({ text, bank, stepIndex }: StepPanelProps) {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-col justify-center gap-8 overflow-y-auto pb-4 lg:col-span-2">
      <p className="text-2xl leading-snug font-medium lg:text-display">{text}</p>
      <StepTimerPanel bank={bank} step={stepIndex} />
    </div>
  );
}

function AlertBanner({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  const t = useT();
  return (
    <div
      role="alert"
      className="mx-4 flex items-center gap-3 rounded-xl bg-accent px-4 py-3 text-base font-medium text-accent-fg lg:mx-6"
    >
      <Icon name="bell-ringing" size="lg" />
      <span className="min-w-0 flex-1">{text}</span>
      <Button variant="affirm" size="sm" onClick={onDismiss}>
        {t('Đã rõ')}
      </Button>
    </div>
  );
}

function NoSteps({ onEdit }: { onEdit: () => void }) {
  const t = useT();
  return (
    <div className="grid h-dvh place-items-center bg-paper">
      <EmptyState
        icon="cooking-pot"
        title={t('Món này chưa có các bước nấu')}
        description={t('Thêm các bước vào công thức để dùng chế độ nấu ăn.')}
        action={<Button onClick={onEdit}>{t('Sửa công thức')}</Button>}
      />
    </div>
  );
}
