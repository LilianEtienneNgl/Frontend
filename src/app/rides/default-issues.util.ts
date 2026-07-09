import { Ride } from './model';
import { ParkLog, Schedule } from '../core/models';
import { isPrincipalPilotLate } from '../core/pilot-status.util';
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

  // The status object is a cached snapshot from the ride's terminal - if it hasn't refreshed
  // today, its fields are leftover from a previous day and shouldn't be re-flagged as current
  // issues (e.g. arriving the next morning before the ride has posted anything yet).
  if (isSameCalendarDay(status.lastRefreshStatus, new Date())) {
    const joinedState = [status.reserveStatus, status.screenPresence, status.lastRefreshStatus, status.queueLength]
      .filter((value) => value != null)
      .join(' ')
      .toLowerCase();

    if (/h\s*prep|preparation|prepa/.test(joinedState)) {
      issues.push('H preparation');
    }

    if (
      /deco|deconnect|disconnect|maint|maintenance|offline|panne|ferme|ferm/.test(joinedState) ||
      status.status === 2 ||
      status.status === 3
    ) {
      issues.push('Ouverture deconnectee (deco/maint/etc.)');
    }
  }

  if (isPrincipalPilotLate(ride, schedules, logs)) {
    issues.push('Pilote principal en retard');
  }

  return [...new Set(issues)];
}
