export function isSameCalendarDay(value: string | null | undefined, reference: Date): boolean {
  if (!value) {
    return false;
  }

  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return false;
  }

  return target.getFullYear() === reference.getFullYear()
    && target.getMonth() === reference.getMonth()
    && target.getDate() === reference.getDate();
}
