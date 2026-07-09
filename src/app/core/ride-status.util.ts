import { Ride } from '../rides/model';
import { ParkLog } from './models';
import { isSameCalendarDay } from './date.util';
import { isRideCurrentlyInMaintenance } from './pilot-status.util';

export interface RideStatusInfo {
  label: string;
  swatchClass: string;
  badgeClass: string;
  isMaintenance: boolean;
}

const OPEN_STATUS: RideStatusInfo = {
  label: 'Ouverte',
  swatchClass: 'bg-success',
  badgeClass: 'text-bg-success',
  isMaintenance: false
};

const CLOSED_STATUS: RideStatusInfo = {
  label: 'Fermée',
  swatchClass: 'bg-danger',
  badgeClass: 'text-bg-danger',
  isMaintenance: false
};

const MAINTENANCE_STATUS: RideStatusInfo = {
  label: 'Maintenance',
  swatchClass: 'bg-warning',
  badgeClass: 'text-bg-warning',
  isMaintenance: true
};

const UNKNOWN_STATUS: RideStatusInfo = {
  label: 'Inconnu',
  swatchClass: 'bg-white border border-secondary',
  badgeClass: 'text-bg-light border',
  isMaintenance: false
};

/**
 * The raw status codes (1 = Ouverte, 0 = Fermée) only mean anything if the terminal is actually
 * still reporting in - a ride that hasn't refreshed today (e.g. a disconnected/decommissioned
 * screen) shouldn't be shown as "Fermée", since we don't actually know its state anymore, only
 * what it last reported. Maintenance isn't its own status code - it's derived from the ride's own
 * "Mise en Maintenance" / "Fin de Maintenance" log, same ground truth used for lateness.
 */
export function getRideDisplayStatus(ride: Ride | null | undefined, logs: ParkLog[]): RideStatusInfo {
  const status = ride?.status;
  if (!status || !isSameCalendarDay(status.lastRefreshStatus, new Date())) {
    return UNKNOWN_STATUS;
  }

  if (isRideCurrentlyInMaintenance(ride, logs)) {
    return MAINTENANCE_STATUS;
  }

  if (status.status === 1) {
    return OPEN_STATUS;
  }

  if (status.status === 0) {
    return CLOSED_STATUS;
  }

  return UNKNOWN_STATUS;
}
