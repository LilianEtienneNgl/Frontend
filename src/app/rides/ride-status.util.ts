import { Ride } from './model';
import { ParkLog } from '../core/models';
import { isSameCalendarDay } from '../core/date.util';

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

const STATE_EVENT_TYPE = 9;
const MAINTENANCE_START_COMMENT = 'Mise en Maintenance';
const MAINTENANCE_END_COMMENT = 'Fin de Maintenance';

function latestMaintenanceTransitionLog(ride: Ride | null | undefined, logs: ParkLog[]): ParkLog | null {
  const rideId = ride?.id;
  if (rideId == null) {
    return null;
  }

  return logs
    .filter((log) => log.rideId === rideId && log.eventType === STATE_EVENT_TYPE && log.recordedAt)
    .filter((log) => {
      const comment = (log.comments ?? '').trim();
      return comment === MAINTENANCE_START_COMMENT || comment === MAINTENANCE_END_COMMENT;
    })
    .sort((left, right) => (right.recordedAt ?? '').localeCompare(left.recordedAt ?? ''))[0] ?? null;
}

export function isRideCurrentlyInMaintenance(ride: Ride | null | undefined, logs: ParkLog[]): boolean {
  const latest = latestMaintenanceTransitionLog(ride, logs);
  return (latest?.comments ?? '').trim() === MAINTENANCE_START_COMMENT;
}

export function currentMaintenanceStartLog(ride: Ride | null | undefined, logs: ParkLog[]): ParkLog | null {
  const latest = latestMaintenanceTransitionLog(ride, logs);
  return latest && (latest.comments ?? '').trim() === MAINTENANCE_START_COMMENT ? latest : null;
}

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
