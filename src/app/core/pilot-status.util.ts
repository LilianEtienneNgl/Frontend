import { Ride } from '../rides/model';
import { Staff } from '../staff/model';
import { ParkLog, Schedule } from './models';
import { formatScheduleHour, rideScheduleRanges } from './ride-schedule.util';

export function parseHourToMinutes(value: string | null | undefined): number | null {
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

export function resolveStaffByToken(raw: string, staffById: Record<number, Staff>): Staff | null {
  const cleaned = raw.trim();
  if (!cleaned) {
    return null;
  }

  const asNumber = Number(cleaned);
  if (!Number.isNaN(asNumber) && staffById[asNumber]) {
    return staffById[asNumber];
  }

  const lowered = cleaned.toLowerCase();
  return Object.values(staffById).find((member) => {
    const trigram = member.trigram?.trim().toLowerCase() ?? '';
    const fullName = member.fullName?.trim().toLowerCase() ?? '';
    const first = member.firstName?.trim().toLowerCase() ?? '';
    const last = member.lastName?.trim().toLowerCase() ?? '';
    const firstLast = `${first} ${last}`.trim();
    return lowered === trigram || lowered === fullName || lowered === firstLast;
  }) ?? null;
}

const STATE_EVENT_TYPE = 9;
const MAINTENANCE_START_COMMENT = 'Mise en Maintenance';
const MAINTENANCE_END_COMMENT = 'Fin de Maintenance';

export function isRideCurrentlyInMaintenance(ride: Ride | null | undefined, logs: ParkLog[]): boolean {
  const rideId = ride?.id;
  if (rideId == null) {
    return false;
  }

  const latest = logs
    .filter((log) => log.rideId === rideId && log.eventType === STATE_EVENT_TYPE && log.recordedAt)
    .filter((log) => {
      const comment = (log.comments ?? '').trim();
      return comment === MAINTENANCE_START_COMMENT || comment === MAINTENANCE_END_COMMENT;
    })
    .sort((left, right) => (right.recordedAt ?? '').localeCompare(left.recordedAt ?? ''))[0];

  return (latest?.comments ?? '').trim() === MAINTENANCE_START_COMMENT;
}
