import { useT } from '@alavo-daily/common';
import { Button, cn, IconButton, useLayout } from '@alavo-daily/design-system';

export interface CookingFooterProps {
  stepIndex: number;
  stepCount: number;
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
  onOpenIngredients: () => void;
}

export function CookingFooter(props: CookingFooterProps) {
  const { stepIndex, stepCount, onPrevious, onNext, onFinish, onOpenIngredients } = props;
  const t = useT();
  const layout = useLayout();
  const isLast = stepIndex === stepCount - 1;
  return (
    <footer className="flex items-center gap-3 px-4 pt-3 pb-6 lg:gap-4 lg:px-6 lg:pb-6">
      {layout === 'wide' ? (
        <Button
          variant="outline"
          size="lg"
          className="h-14 text-lg"
          leadingIcon="arrow-left"
          disabled={stepIndex === 0}
          onClick={onPrevious}
        >
          {t('Bước trước')}
        </Button>
      ) : (
        <IconButton
          icon="arrow-left"
          variant="outline"
          size="lg"
          className="size-14 max-lg:size-14"
          label={t('Bước trước')}
          disabled={stepIndex === 0}
          onClick={onPrevious}
        />
      )}
      {layout === 'wide' ? (
        <StepDots stepIndex={stepIndex} stepCount={stepCount} />
      ) : (
        <IconButton
          icon="list-checks"
          variant="outline"
          size="lg"
          className="size-14 max-lg:size-14"
          label={t('Nguyên liệu')}
          onClick={onOpenIngredients}
        />
      )}
      {isLast ? (
        <Button size="lg" className="h-14 text-lg max-lg:flex-1" leadingIcon="check" onClick={onFinish}>
          {t('Hoàn thành')}
        </Button>
      ) : (
        <Button size="lg" className="h-14 text-lg max-lg:flex-1" trailingIcon="arrow-right" onClick={onNext}>
          {t('Bước tiếp')}
        </Button>
      )}
    </footer>
  );
}

function StepDots({ stepIndex, stepCount }: Pick<CookingFooterProps, 'stepIndex' | 'stepCount'>) {
  return (
    <div aria-hidden className="flex flex-1 items-center justify-center gap-2">
      {Array.from({ length: stepCount }, (_, index) => (
        <i
          key={index}
          className={cn(
            'block h-2 rounded-full',
            index === stepIndex ? 'w-6 bg-primary' : index < stepIndex ? 'w-2 bg-primary opacity-40' : 'w-2 bg-line-strong',
          )}
        />
      ))}
    </div>
  );
}
