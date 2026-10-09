import { useEngineMutation, type Recipe } from '@alavo-daily/common/engine';
import { formatAmount, formatMinutes, scaleQuantity } from '@alavo-daily/common/format';
import { useLanguage, useT } from '@alavo-daily/common';
import { Button, Card, Eyebrow, Icon, IconButton, Sticker, stickerFor, Stepper } from '@alavo-daily/design-system';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { useReportError } from '../../engine-errors';
import { LEVEL_LABELS, MAX_SERVINGS, MIN_SERVINGS } from '../../vocabulary';

export function RecipeCover({ recipe }: { recipe: Recipe }) {
  const t = useT();
  if (recipe.photo) {
    return (
      <img
        src={recipe.photo}
        alt={t('Ảnh món {{name}}', { name: recipe.name })}
        className="h-56 w-full rounded-xl object-cover max-lg:h-44"
      />
    );
  }
  return (
    <div className="grid h-40 place-items-center rounded-xl bg-surface-brand text-cover-fg max-lg:h-32">
      <Sticker name={stickerFor(recipe.icon, 'recipe').sticker} size={72} />
    </div>
  );
}

export function RecipeHeading({ recipe }: { recipe: Recipe }) {
  const t = useT();
  const reportError = useReportError();
  const setFavorite = useEngineMutation('recipes.set_favorite');
  const label = recipe.favorite ? t('Bỏ yêu thích') : t('Yêu thích');
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-2xl font-semibold">{recipe.name}</h2>
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t('Nhóm món')}>
          {recipe.tags.map((tag) => (
            <li key={tag} className="rounded-4xl bg-surface-tint px-3 py-0.5 text-xs text-text-secondary">
              {tag}
            </li>
          ))}
        </ul>
      </div>
      <IconButton
        icon="heart"
        weight={recipe.favorite ? 'fill' : 'regular'}
        variant="outline"
        size="lg"
        label={label}
        aria-pressed={recipe.favorite}
        onClick={() =>
          setFavorite.mutate({ id: recipe.id, favorite: !recipe.favorite }, { onError: reportError })
        }
      />
    </div>
  );
}

export interface RecipeMetaProps {
  recipe: Recipe;
  servings: number;
  onServingsChange: (servings: number) => void;
}

export function RecipeMeta({ recipe, servings, onServingsChange }: RecipeMetaProps) {
  const language = useLanguage();
  const t = useT();
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-4">
      <MetaCell label={t('Chuẩn bị')}>{formatMinutes(recipe.prepMin, language)}</MetaCell>
      <MetaCell label={t('Nấu')}>{formatMinutes(recipe.cookMin, language)}</MetaCell>
      <MetaCell label={t('Khẩu phần')}>
        <Stepper
          value={servings}
          onChange={onServingsChange}
          min={MIN_SERVINGS}
          max={MAX_SERVINGS}
          label={t('Khẩu phần')}
          decrementLabel={t('Giảm khẩu phần')}
          incrementLabel={t('Tăng khẩu phần')}
        />
      </MetaCell>
      <MetaCell label={t('Độ khó')}>{t(LEVEL_LABELS[recipe.level])}</MetaCell>
    </dl>
  );
}

function MetaCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid content-start gap-1">
      <dt>
        <Eyebrow>{label}</Eyebrow>
      </dt>
      <dd className="text-title font-semibold">{children}</dd>
    </div>
  );
}

export function IngredientList({ recipe, servings }: { recipe: Recipe; servings: number }) {
  const language = useLanguage();
  const t = useT();
  return (
    <Card padding="md">
      <h3 className="mb-2 text-title font-semibold">{t('Nguyên liệu')}</h3>
      {recipe.ingredients.length === 0 ? (
        <EmptyPart
          recipeId={recipe.id}
          text={t('Món này chưa có nguyên liệu.')}
          actionLabel={t('Thêm nguyên liệu')}
        />
      ) : (
        <ul aria-label={t('Nguyên liệu')}>
          {recipe.ingredients.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <span className="min-w-0">{item.name}</span>
              <span className="shrink-0 font-medium">
                {formatAmount(scaleQuantity(item.quantity, recipe.servings, servings), item.unit, language)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function StepList({ recipe }: { recipe: Recipe }) {
  const t = useT();
  return (
    <Card padding="md">
      <h3 className="mb-2 text-title font-semibold">{t('Các bước')}</h3>
      {recipe.steps.length === 0 ? (
        <EmptyPart
          recipeId={recipe.id}
          text={t('Món này chưa có các bước nấu.')}
          actionLabel={t('Thêm các bước')}
        />
      ) : (
        <ol aria-label={t('Các bước')} className="grid gap-3">
          {recipe.steps.map((step, index) => (
            <li key={step.id} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-tint text-xs font-semibold">
                {index + 1}
              </span>
              <div className="grid min-w-0 gap-1.5">
                <p className="text-sm leading-relaxed">{step.text}</p>
                {step.timerMin > 0 ? <TimerBadge minutes={step.timerMin} /> : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

interface EmptyPartProps {
  recipeId: string;
  text: string;
  actionLabel: string;
}

function EmptyPart({ recipeId, text, actionLabel }: EmptyPartProps) {
  const navigate = useNavigate();
  return (
    <div className="grid justify-items-start gap-2">
      <p className="text-sm text-text-muted">{text}</p>
      <Button variant="ghost" leadingIcon="plus" onClick={() => navigate(`/recipes/edit/${recipeId}`)}>
        {actionLabel}
      </Button>
    </div>
  );
}

function TimerBadge({ minutes }: { minutes: number }) {
  const language = useLanguage();
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-4xl bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-fg">
      <Icon name="timer" />
      {formatMinutes(minutes, language)}
    </span>
  );
}
