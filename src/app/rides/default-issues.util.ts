import { Ride } from './model';
import { ParkLog, Schedule } from '../core/models';
import { isRideCurrentlyInMaintenance, currentMaintenanceStartLog } from './ride-status.util';
import { isRideOpeningLate, firstRideOpenLog } from './lateness/ride-opening-lateness.util';
import { isPrincipalLoginLate, firstPrincipalConnection } from './lateness/principal-login-lateness.util';
import { isSameCalendarDay } from '../core/date.util';

export interface RideIssue {
  message: string;
  at: string | null;
}

export function rideDefaultIssues(
  ride: Ride | null | undefined,
  schedules: Schedule[] = [],
  logs: ParkLog[] = []
): RideIssue[] {
  const status = ride?.status;
  if (!status) {
    return [{ message: 'Statut indisponible', at: null }];
  }

  const issues: RideIssue[] = [];

  if (isSameCalendarDay(status.lastRefreshStatus, new Date()) && isRideCurrentlyInMaintenance(ride, logs)) {
    issues.push({ message: 'Attraction en maintenance', at: currentMaintenanceStartLog(ride, logs)?.recordedAt ?? null });
  }

  if (isRideOpeningLate(ride, schedules, logs)) {
    issues.push({ message: 'Ouverture en retard', at: firstRideOpenLog(ride, logs)?.recordedAt ?? null });
  }

  if (isPrincipalLoginLate(ride, schedules, logs)) {
    issues.push({ message: 'Pilote principal en retard', at: firstPrincipalConnection(ride, logs)?.recordedAt ?? null });
  }

  return issues;
}
