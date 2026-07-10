import { Ride } from './model';
import { ParkLog, Schedule } from '../core/models';
import { isRideCurrentlyInMaintenance } from './ride-status.util';
import { isRideOpeningLate } from './lateness/ride-opening-lateness.util';
import { isPrincipalLoginLate } from './lateness/principal-login-lateness.util';
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

  if (isRideOpeningLate(ride, schedules, logs)) {
    issues.push('Ouverture en retard');
  }

  if (isPrincipalLoginLate(ride, schedules, logs)) {
    issues.push('Pilote principal en retard');
  }

  return [...new Set(issues)];
}
