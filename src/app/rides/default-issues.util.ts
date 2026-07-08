import { Ride } from './model';
import { Staff } from '../staff/model';
import { Schedule } from '../core/models';
import { isPrincipalPilotLate } from '../core/pilot-status.util';

export function rideDefaultIssues(
  ride: Ride | null | undefined,
  schedules: Schedule[] = [],
  staffById: Record<number, Staff> = {}
): string[] {
  const status = ride?.status;
  if (!status) {
    return ['Statut indisponible'];
  }

  const issues: string[] = [];
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

  if (isPrincipalPilotLate(ride, schedules, staffById)) {
    issues.push('Pilote principal en retard');
  }

  return [...new Set(issues)];
}
