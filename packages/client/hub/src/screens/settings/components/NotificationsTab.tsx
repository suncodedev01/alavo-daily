import {
  useEngineMutation,
  useEngineQuery,
  usePlatform,
  useT,
  type ModuleManifest,
  type NotificationRule,
} from '@alavo-daily/common';
import { Card, CardHeader, CardTitle, Icon, StickerTile, OptionPicker, Switch } from '@alavo-daily/design-system';

import { useModules } from '../../../module-registry';
import { groupRulesByModule, timeOptions, type RuleGroup } from '../logic/notificationRules';
import { NotificationPermissionCard } from './NotificationPermissionCard';

export function NotificationsTab() {
  const t = useT();
  const modules = useModules();
  const rules = useEngineQuery('hub.list_notification_rules');
  const { capabilities } = usePlatform();
  const groups = groupRulesByModule(rules.data ?? [], modules);
  return (
    <>
      <NotificationPermissionCard />
      {capabilities.backgroundReminders ? null : <ReminderLimitNote />}
      {groups.map((group) => (
        <RuleGroupCard key={group.moduleId} group={group} />
      ))}
      {rules.data?.length === 0 ? (
        <p className="text-sm text-text-muted">{t('Chưa có loại thông báo nào để cài đặt.')}</p>
      ) : null}
    </>
  );
}

function ReminderLimitNote() {
  const t = useT();
  return (
    <div role="note" className="flex gap-3 rounded-lg bg-surface-tint p-4">
      <Icon name="info" size="lg" className="mt-0.5 text-text-secondary" />
      <p className="text-sm text-text-secondary">
        {t(
          'Ở bản này, nhắc nhở chỉ hiện khi ứng dụng đang mở. Khi bạn đóng ứng dụng, các giờ nhắc bên dưới sẽ chưa kêu.',
        )}
      </p>
    </div>
  );
}

function RuleGroupCard({ group }: { group: RuleGroup }) {
  const t = useT();
  const manifest: ModuleManifest | undefined = group.manifest;
  return (
    <Card padding="lg">
      <CardHeader className="mb-2 justify-start gap-3">
        <StickerTile icon={manifest?.icon ?? 'bell'} kind="module" />
        <CardTitle>{manifest ? t(manifest.name) : group.moduleId}</CardTitle>
      </CardHeader>
      <ul className="divide-y divide-line-hairline">
        {group.rules.map((rule) => (
          <RuleRow key={rule.id} rule={rule} />
        ))}
      </ul>
    </Card>
  );
}

function RuleRow({ rule }: { rule: NotificationRule }) {
  const t = useT();
  const update = useEngineMutation('hub.update_notification_rule');
  const label = t(rule.label);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-3 lg:flex">
      <div className="min-w-0 flex-1 max-lg:order-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-text-muted">{t(rule.description)}</p>
      </div>
      {rule.kind === 'time' && rule.time ? (
        <OptionPicker
          className="w-28 shrink-0 max-lg:order-3 max-lg:col-span-2 max-lg:mt-3 max-lg:w-full"
          align="end"
          label={t('Giờ nhắc {{rule}}', { rule: label })}
          value={rule.time}
          options={timeOptions(rule.time)}
          onChange={(time) => update.mutate({ id: rule.id, time })}
        />
      ) : (
        <span className="text-xs text-text-muted max-lg:order-3 max-lg:col-span-2 max-lg:mt-1">
          {rule.kind === 'always' ? t('Luôn bật') : t('Ngay khi xảy ra')}
        </span>
      )}
      <Switch
        label={label}
        className="max-lg:order-2"
        checked={rule.enabled}
        onCheckedChange={(enabled) => update.mutate({ id: rule.id, enabled })}
      />
    </li>
  );
}
