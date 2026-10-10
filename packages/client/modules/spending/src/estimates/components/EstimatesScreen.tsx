import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useEngineQuery } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, Card, IconTile, Pill } from '@alavo-daily/design-system';

import { Loadable, SkeletonRows } from '../../query-state';
import { SpendingScreen } from '../../spending-screen';
import { ESTIMATE_TEMPLATES, type EstimateTemplate } from '../logic/templates';
import { EstimateCard, estimatePath } from './EstimateCard';
import { EstimateFormDialog } from './EstimateFormDialog';

/** The "Dự toán" screen: every estimate, or a way to start the first one. */
export function EstimatesScreen() {
  const t = useT();
  const navigate = useNavigate();
  const estimates = useEngineQuery('spending.list_estimates');
  const [starting, setStarting] = useState<{ template?: EstimateTemplate } | null>(null);
  return (
    <SpendingScreen
      title={t('Dự toán')}
      primaryAction={
        <Button leadingIcon="plus" onClick={() => setStarting({})}>
          {t('Dự toán mới')}
        </Button>
      }
    >
      <Explainer />
      <Loadable query={estimates} skeleton={<SkeletonRows count={3} className="h-28 w-full" />}>
        {(items) =>
          items.length === 0 ? (
            <FirstEstimate onPick={(template) => setStarting({ template })} />
          ) : (
            <ul className="grid gap-3">
              {items.map((estimate) => (
                <li key={estimate.id}>
                  <EstimateCard estimate={estimate} />
                </li>
              ))}
            </ul>
          )
        }
      </Loadable>
      <EstimateFormDialog
        key={starting?.template?.id ?? 'blank'}
        open={starting !== null}
        onOpenChange={(open) => !open && setStarting(null)}
        template={starting?.template}
        onCreated={(view) => navigate(estimatePath(view.estimate.id))}
      />
    </SpendingScreen>
  );
}

function Explainer() {
  const t = useT();
  return (
    <div className="grid gap-2 px-1 text-sm text-text-secondary">
      <p>
        {t(
          'Dùng khi bạn sắp có một khoản chi lớn gồm nhiều thứ: đám cưới, chuyến đi, sửa nhà, học phí, Tết... Bạn liệt kê từng khoản cần mua, ứng dụng cộng lại và trả lời một câu: tiền đã đủ chưa.',
        )}
      </p>
      <p>{t('Mục tiêu tiết kiệm giúp bạn để dành dần. Dự toán giúp bạn biết cần bao nhiêu và đã đủ chưa.')}</p>
    </div>
  );
}

function FirstEstimate({ onPick }: { onPick: (template: EstimateTemplate) => void }) {
  const t = useT();
  return (
    <Card padding="lg" className="grid justify-items-center gap-4 text-center">
      <IconTile icon="calculator" size="lg" />
      <div className="grid gap-1">
        <h2 className="text-title font-semibold">{t('Chưa có dự toán nào')}</h2>
        <p className="text-sm text-text-secondary">{t('Chọn một mẫu để bắt đầu, hoặc tự đặt tên và tự liệt kê.')}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {ESTIMATE_TEMPLATES.map((template) => (
          <Pill key={template.id} leadingIcon={template.icon} onClick={() => onPick(template)}>
            {t(template.label)}
          </Pill>
        ))}
      </div>
    </Card>
  );
}
