import { Ride } from './model';

export function rideDefaultIssues(ride: Ride | null | undefined): string[] {
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

  return [...new Set(issues)];
}
