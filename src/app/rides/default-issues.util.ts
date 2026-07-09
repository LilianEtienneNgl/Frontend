import { Ride } from './model';
import { ParkLog, Schedule } from '../core/models';
import { isPrincipalPilotLate, isRideCurrentlyInMaintenance } from '../core/pilot-status.util';
import { isSameCalendarDay } from '../core/date.util';

export function rideDefaultIssues(
  ride: Ride | null | undefined,
  schedules: Schedule[] = [],
  logs: ParkLog[] = []
): string[] {
  const status = ride?.status;
  if (!status) {
    return ['Statut indisponible'];
  }

  const issues: string[] = [];

  if (isSameCalendarDay(status.lastRefreshStatus, new Date()) && isRideCurrentlyInMaintenance(ride, logs)) {
    issues.push('Attraction en maintenance');
  }

  if (isPrincipalPilotLate(ride, schedules, logs)) {
    issues.push('Pilote principal en retard');
  }

  return [...new Set(issues)];
}
