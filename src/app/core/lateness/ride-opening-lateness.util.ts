import { Ride } from '../../rides/model';
import { ParkLog, Schedule } from '../models';
import { getRideOpeningReferenceMinutes } from '../pilot-status.util';
import { isSameCalendarDay } from '../date.util';

const STATE_EVENT_TYPE = 9;
const OPEN_TRANSITION_SUFFIX = '-->OUVERTE';
const MAINTENANCE_START_COMMENT = 'Mise en Maintenance';
const MAINTENANCE_END_COMMENT = 'Fin de Maintenance';
const LATE_GRACE_MINUTES = 1;

/**
 * Whether the ride itself opened on schedule - independent of any specific staff member. Uses the
 * ride's own state-change log ("FERMEE-->OUVERTE" / "MAINTENANCE-->OUVERTE") as ground truth for
 * when it actually started operating, since a ride is routinely run before anyone happens to
 * connect under a specific role label. See principal-login-lateness.util.ts for the separate,
 * person-specific "did the Pilote principal show up on time" signal.
 */
export function firstRideOpenLog(ride: Ride | null | undefined, logs: ParkLog[]): ParkLog | null {
  const rideId = ride?.id;
  if (rideId == null) {
    return null;
  }

  const today = new Date();

  const candidates = logs
    .filter((log) => log.rideId === rideId && log.eventType === STATE_EVENT_TYPE && log.recordedAt)
    .filter((log) => (log.comments ?? '').trim().endsWith(OPEN_TRANSITION_SUFFIX))
    .filter((log) => isSameCalendarDay(log.recordedAt, today))
    .map((log) => ({ log, date: new Date(log.recordedAt as string) }))
    .filter((entry) => !Number.isNaN(entry.date.getTime()))
    .sort((left, right) => left.date.getTime() - right.date.getTime());

  return candidates[0]?.log ?? null;
}

export function firstRideOpenMinutes(ride: Ride | null | undefined, logs: ParkLog[]): number | null {
  const log = firstRideOpenLog(ride, logs);
  if (!log?.recordedAt) {
    return null;
  }

  const date = new Date(log.recordedAt);
  return Number.isNaN(date.getTime()) ? null : date.getHours() * 60 + date.getMinutes();
}

/**
 * A ride can fail to open on schedule for a reason that has nothing to do with staffing: it was
 * placed in maintenance and only came back up after the scheduled opening time. If a logged
 * maintenance window spans the scheduled opening minute, the delay is explained by that.
 */
function isOpeningDelayJustifiedByMaintenance(
  ride: Ride | null | undefined,
  logs: ParkLog[],
  openingReference: number
): boolean {
  const rideId = ride?.id;
  if (rideId == null) {
    return false;
  }

  const today = new Date();

  const sameDayLogs = logs
    .filter((log) => log.rideId === rideId && log.eventType === STATE_EVENT_TYPE && log.recordedAt)
    .filter((log) => isSameCalendarDay(log.recordedAt, today))
    .map((log) => ({ comment: (log.comments ?? '').trim(), date: new Date(log.recordedAt as string) }))
    .filter((entry) => !Number.isNaN(entry.date.getTime()))
    .sort((left, right) => left.date.getTime() - right.date.getTime());

  let maintenanceStart: number | null = null;
  for (const entry of sameDayLogs) {
    const minutes = entry.date.getHours() * 60 + entry.date.getMinutes();
    if (entry.comment === MAINTENANCE_START_COMMENT) {
      maintenanceStart = minutes;
    } else if (entry.comment === MAINTENANCE_END_COMMENT) {
      if (maintenanceStart != null && maintenanceStart <= openingReference && minutes >= openingReference) {
        return true;
      }
      maintenanceStart = null;
    }
  }

  return false;
}

export function isRideOpeningLate(ride: Ride | null | undefined, schedules: Schedule[], logs: ParkLog[]): boolean {
  const openingReference = getRideOpeningReferenceMinutes(ride, schedules);
  if (openingReference == null) {
    return false;
  }

  const openedAt = firstRideOpenMinutes(ride, logs);
  if (openedAt == null || openedAt - openingReference <= LATE_GRACE_MINUTES) {
    return false;
  }

  return !isOpeningDelayJustifiedByMaintenance(ride, logs, openingReference);
}
