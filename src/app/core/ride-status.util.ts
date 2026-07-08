export interface RideStatusInfo {
  label: string;
  swatchClass: string;
  badgeClass: string;
}

const STATUS_MAP: Record<number, RideStatusInfo> = {
  1: { label: 'Ouverte', swatchClass: 'bg-success', badgeClass: 'text-bg-success' },
  2: { label: 'Fermée', swatchClass: 'bg-danger', badgeClass: 'text-bg-danger' },
  3: { label: 'Maintenance', swatchClass: 'bg-warning', badgeClass: 'text-bg-warning' }
};

const UNKNOWN_STATUS: RideStatusInfo = {
  label: 'Inconnu',
  swatchClass: 'bg-white border border-secondary',
  badgeClass: 'text-bg-light border'
};

export function getRideStatusInfo(status: number | null | undefined): RideStatusInfo {
  if (status != null && STATUS_MAP[status]) {
    return STATUS_MAP[status];
  }
  return UNKNOWN_STATUS;
}
