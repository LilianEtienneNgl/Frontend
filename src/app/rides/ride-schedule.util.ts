import { Ride } from './model';
import { Schedule } from '../core/models';

export function formatScheduleHour(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  const raw = value.trim();
  if (!raw) {
    return '-';
  }

  if (/^[-:\s]+$/.test(raw)) {
    return '-';
  }

  const hhmmMatch = raw.match(/(\d{1,2}):(\d{2})/);
  if (hhmmMatch) {
    const hours = hhmmMatch[1].padStart(2, '0');
    return `${hours}:${hhmmMatch[2]}`;
  }

  const compactDigits = raw.match(/^(\d{3,4})$/);
  if (compactDigits) {
    const digits = compactDigits[1].padStart(4, '0');
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }

  if (raw.length >= 5) {
    return raw.slice(0, 5);
  }

  return raw;
}

export function rideScheduleRanges(ride: Ride | null | undefined, schedules: Schedule[]): string[] {
  if (!ride) {
    return [];
  }

  const schedule = schedules.find((entry) => entry.id === ride.id);
  if (!schedule) {
    return [];
  }

  const open = formatScheduleHour(schedule.openTime);
  const close = formatScheduleHour(schedule.closeTime);
  if (open === '-' || close === '-') {
    return [];
  }

  return [`${open} - ${close}`];
}

function parseHourToMinutes(value: string | null | undefined): number | null {
  const formatted = formatScheduleHour(value);
  const match = formatted.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function getRideOpeningReferenceMinutes(ride: Ride | null | undefined, schedules: Schedule[]): number | null {
  const openings = rideScheduleRanges(ride, schedules)
    .map((range) => range.split(' - ')[0] ?? '-')
    .map((value) => parseHourToMinutes(value))
    .filter((value): value is number => value != null)
    .sort((left, right) => left - right);

  return openings[0] ?? null;
}
