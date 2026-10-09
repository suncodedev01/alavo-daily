import { MealReminders } from '../../meal-reminders';
import { MorningMenuReminders } from '../../morning-menu';

/** Drawn once for the session: everything the recipes module schedules while the app is open. */
export function RecipesBackground() {
  return (
    <>
      <MorningMenuReminders />
      <MealReminders />
    </>
  );
}
