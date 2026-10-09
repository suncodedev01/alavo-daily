import { useCookReminders } from '../hooks/useCookReminders';
import { useDefrostReminders } from '../hooks/useDefrostReminders';
import { useShopReminder } from '../hooks/useShopReminder';

/** Keeps the cook, shop and defrost reminders scheduled while the app is open. Draws nothing. */
export function MealReminders() {
  useCookReminders();
  useShopReminder();
  useDefrostReminders();
  return null;
}
