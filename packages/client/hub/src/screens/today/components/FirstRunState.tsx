import { useEngineMutation, useT } from '@alavo-daily/common';
import { Button, Card, EmptyState, useToast } from '@alavo-daily/design-system';

export function FirstRunState() {
  const t = useT();
  const { toast } = useToast();
  const loadDemo = useEngineMutation('hub.load_demo_data');
  return (
    <Card padding="lg">
      <EmptyState
        icon="sparkle"
        title={t('Chưa có dữ liệu nào')}
        description={t(
          'Bạn có thể bắt đầu bằng cách thêm giao dịch hoặc công thức đầu tiên, hoặc nạp dữ liệu mẫu để xem ứng dụng hoạt động.',
        )}
        action={
          <Button
            leadingIcon="download-simple"
            disabled={loadDemo.isPending}
            onClick={() => loadDemo.mutate(undefined, { onSuccess: () => toast(t('Đã nạp dữ liệu mẫu')) })}
          >
            {t('Nạp dữ liệu mẫu')}
          </Button>
        }
      />
    </Card>
  );
}
