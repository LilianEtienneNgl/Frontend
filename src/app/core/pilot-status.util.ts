import { Ride } from '../rides/model';
import { Staff } from '../staff/model';
import { Schedule } from './models';
import { formatScheduleHour, rideScheduleRanges } from './ride-schedule.util';

const PRINCIPAL_JOB_FUNCTION_ID = 1;

export function isPrincipalJobFunction(jobFunctionId: number | null | undefined): boolean {
  return jobFunctionId === PRINCIPAL_JOB_FUNCTION_ID;
}

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

export function isPrincipalPilotLate(
  ride: Ride | null | undefined,
  schedules: Schedule[],
  staffById: Record<number, Staff>
): boolean {
  const status = ride?.status;
  if (!status) {
    return false;
  }

  const openingReference = getRideOpeningReferenceMinutes(ride, schedules);
  if (openingReference == null) {
    return false;
  }

  const pilots: [number | null, string | null][] = [
    [status.pilotId1, status.shiftStart1],
    [status.pilotId2, status.shiftStart2],
    [status.pilotId3, status.shiftStart3],
    [status.pilotId4, status.shiftStart4]
  ];

  for (const [pilotId, shiftStart] of pilots) {
    if (pilotId != null && pilotId > 0 && isPrincipalJobFunction(staffById[pilotId]?.jobFunctionId)) {
      const connectedAt = parseHourToMinutes(shiftStart);
      return connectedAt != null && connectedAt > openingReference;
    }
  }

  return false;
}
