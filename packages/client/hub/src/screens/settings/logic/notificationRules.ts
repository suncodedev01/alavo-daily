import type { ModuleManifest, NotificationRule } from '@alavo-daily/common';
import type { PickerOption } from '@alavo-daily/design-system';

export const REMINDER_TIMES = [
  '06:30',
  '07:00',
  '08:00',
  '09:00',
  '12:00',
  '16:00',
  '17:00',
  '17:30',
  '18:00',
  '20:00',
  '21:00',
  '22:00',
];

/** The fixed times plus the rule's current one, so a time set elsewhere is never lost. */
export function timeOptions(current: string): PickerOption[] {
  const times = REMINDER_TIMES.includes(current) ? REMINDER_TIMES : [...REMINDER_TIMES, current].sort();
  return times.map((time) => ({ value: time, label: time }));
}

export interface RuleGroup {
  moduleId: string;
  manifest: ModuleManifest | undefined;
  rules: NotificationRule[];
}

/** Groups in manifest order; rules of a module that is not registered come last. */
export function groupRulesByModule(
  rules: NotificationRule[],
  modules: readonly ModuleManifest[],
): RuleGroup[] {
  const moduleIds = [...new Set([...modules.map((manifest) => manifest.id), ...rules.map((rule) => rule.module)])];
  return moduleIds
    .map((moduleId) => ({
      moduleId,
      manifest: modules.find((manifest) => manifest.id === moduleId),
      rules: rules.filter((rule) => rule.module === moduleId),
    }))
    .filter((group) => group.rules.length > 0);
}
