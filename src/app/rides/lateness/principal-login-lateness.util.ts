import { Ride } from '../model';
import { ParkLog, Schedule } from '../../core/models';
import { getRideOpeningReferenceMinutes } from '../ride-schedule.util';
import { getSetupTimeMinutes } from '../services/setup-time.services';
import { isSameCalendarDay } from '../../core/date.util';

const CONNECTION_EVENT_TYPE = 2;
const LATE_GRACE_MINUTES = 1;

function connectionSlot0(log: ParkLog): number | null {
  const raw = (log.userIds ?? '').split(';')[0] ?? '';
  const id = Number(raw.trim());
  return Number.isNaN(id) || id <= 0 ? null : id;
}

export function firstPrincipalConnection(ride: Ride | null | undefined, logs: ParkLog[]): ParkLog | null {
  const rideId = ride?.id;
  if (rideId == null) {
    return null;
  }

  const today = new Date();

  const rideLogs = logs
    .filter((log) => log.rideId === rideId && log.eventType === CONNECTION_EVENT_TYPE && log.recordedAt)
    .filter((log) => isSameCalendarDay(log.recordedAt, today))
    .sort((left, right) => (left.recordedAt ?? '').localeCompare(right.recordedAt ?? ''));

  let previousSlot0: number | null = null;
  for (const log of rideLogs) {
    const slot0 = connectionSlot0(log);
    if (slot0 !== null && slot0 !== previousSlot0) {
      return log;
    }
    previousSlot0 = slot0;
  }

  return null;
}

function firstPrincipalConnectionMinutes(ride: Ride | null | undefined, logs: ParkLog[]): number | null {
  const log = firstPrincipalConnection(ride, logs);
  if (!log?.recordedAt) {
    return null;
  }

  const date = new Date(log.recordedAt);
  return Number.isNaN(date.getTime()) ? null : date.getHours() * 60 + date.getMinutes();
}

export function isPrincipalLoginLate(ride: Ride | null | undefined, schedules: Schedule[], logs: ParkLog[]): boolean {
  const openingReference = getRideOpeningReferenceMinutes(ride, schedules);
  if (openingReference == null) {
    return false;
  }

  const requiredArrivalReference = openingReference - getSetupTimeMinutes(ride?.id);

  const connectedAt = firstPrincipalConnectionMinutes(ride, logs);
  return connectedAt != null && connectedAt - requiredArrivalReference > LATE_GRACE_MINUTES;
}
