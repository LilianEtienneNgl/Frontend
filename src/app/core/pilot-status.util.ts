import { Ride } from '../rides/model';
import { Staff } from '../staff/model';
import { ParkLog, Schedule } from './models';
import { formatScheduleHour, rideScheduleRanges } from './ride-schedule.util';
import { isSameCalendarDay } from './date.util';

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
const OPEN_TRANSITION_SUFFIX = '-->OUVERTE';

/**
 * Which staff connection gets labeled "Pilote" is not a reliable signal of whether the ride opened
 * on time: a ride is routinely run solo by whoever is present (often logged under an unrelated
 * slot label like "Zonard") well before anyone happens to connect under the "Pilote" tag - e.g. a
 * ride can open and start serving its queue at the scheduled hour while the "Pilote"-tagged
 * connection only appears over an hour later, because that label tracks a paperwork/role
 * designation, not who is actually operating the ride. So lateness can't be judged from any
 * particular role's connection time. Instead, use the ride's own state-change log
 * ("FERMEE-->OUVERTE" / "MAINTENANCE-->OUVERTE") as ground truth for when it actually opened.
 *
 * The live shiftStart on the ride status also can't be used directly, since it reflects only the
 * latest connection and gets overwritten on every reconnect (e.g. after a maintenance-triggered
 * disconnect), which would misreport a legitimate on-time arrival as late.
 *
 * Only ever consider events from the actual current day. Clustering by "the most recent day that
 * has any matching event" would let a ride's opening from yesterday (or whenever it last ran)
 * keep being reported as today's opening on a day where nothing has happened yet - e.g. arriving
 * before anyone has connected today would otherwise re-flag yesterday's already-resolved lateness.
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

const MAINTENANCE_START_COMMENT = 'Mise en Maintenance';
const MAINTENANCE_END_COMMENT = 'Fin de Maintenance';
const LATE_GRACE_MINUTES = 1;

/**
 * A ride can also fail to open on schedule for a reason that has nothing to do with staffing: it
 * was placed in maintenance and only came back up after the scheduled opening time. If a logged
 * maintenance window ("Mise en Maintenance" / "Fin de Maintenance") spans the scheduled opening
 * minute, the delay is explained by that and shouldn't be attributed to the pilot.
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

/**
 * The most recent maintenance start/end log for the ride tells us whether it's currently in
 * maintenance: if the latest of the two is a "Mise en Maintenance" with no "Fin de Maintenance"
 * after it, the ride is still in that state right now.
 */
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

export function isPrincipalPilotLate(ride: Ride | null | undefined, schedules: Schedule[], logs: ParkLog[]): boolean {
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
