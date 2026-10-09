const CLOCK_TIME = /^(\d{2}):(\d{2})$/;
const DATE_TEXT = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The local time of `date` (`YYYY-MM-DD`) at `time` (`HH:MM`) in milliseconds, or null when either is not valid. */
export function atLocalTime(date: string, time: string): number | null {
  const clock = CLOCK_TIME.exec(time);
  const day = DATE_TEXT.exec(date);
  if (!clock || !day) return null;
  const [hours, minutes] = [Number(clock[1]), Number(clock[2])];
  if (hours > 23 || minutes > 59) return null;
  return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]), hours, minutes).getTime();
}
