import { useGenerateRecurring } from '../../recurring';
import { useBillReminders } from '../hooks/useBillReminders';
import { useWeeklySummaryReminder } from '../hooks/useWeeklySummaryReminder';

/** Draws nothing. Keeps recurring transactions up to date and the spending reminders scheduled. */
export function SpendingBackground() {
  useGenerateRecurring();
  useBillReminders();
  useWeeklySummaryReminder();
  return null;
}
