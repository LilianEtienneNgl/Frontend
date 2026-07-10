import { Ride } from '../../rides/model';
import { ParkLog, Schedule } from '../models';
import { getRideOpeningReferenceMinutes } from '../pilot-status.util';
import { isSameCalendarDay } from '../date.util';

const CONNECTION_EVENT_TYPE = 2;
const LATE_GRACE_MINUTES = 1;

function connectionSlot0(log: ParkLog): number | null {
  const raw = (log.userIds ?? '').split(';')[0] ?? '';
  const id = Number(raw.trim());
  return Number.isNaN(id) || id <= 0 ? null : id;
}

/**
 * Whoever occupies the first pilot slot (IdPilote_1 / status.pilotId1) reliably is the Pilote
 * principal - confirmed against real connection logs, where each numbered slot consistently maps
 * to the same role whenever it's the slot that actually changed (see staff-function.util.ts for
 * the same finding applied to role labeling). Track that slot's value across today's connection
 * logs in chronological order and return the first log where it changes into a new occupant:
 * that's when the day's first Pilote principal actually logged in, regardless of whether they're
 * still connected now or have since been relieved by someone else.
 */
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

/**
 * Whether the Pilote principal's own first login of the day was on time - a personal punctuality
 * signal, independent of whether the ride itself ended up opening on time (someone else may have
 * covered, or the ride may have opened late for an unrelated maintenance reason - see
 * ride-opening-lateness.util.ts for that separate signal).
 */
export function isPrincipalLoginLate(ride: Ride | null | undefined, schedules: Schedule[], logs: ParkLog[]): boolean {
  const openingReference = getRideOpeningReferenceMinutes(ride, schedules);
  if (openingReference == null) {
    return false;
  }

  const connectedAt = firstPrincipalConnectionMinutes(ride, logs);
  return connectedAt != null && connectedAt - openingReference > LATE_GRACE_MINUTES;
}
