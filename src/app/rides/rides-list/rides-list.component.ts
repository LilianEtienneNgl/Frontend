import { Component, input, output } from '@angular/core';
import { Ride } from '../model';
import { getRideStatusInfo } from '../../core/ride-status.util';

export interface RideListItem {
  ride: Ride;
  issues: string[];
  isAlerte: boolean;
}

@Component({
  selector: 'app-rides-list',
  templateUrl: './rides-list.component.html',
  styleUrl: './rides-list.component.scss'
})
export class RidesListComponent {
  readonly items = input<RideListItem[]>([]);
  readonly sortKey = input<'name'>('name');
  readonly sortDir = input<'asc' | 'desc'>('asc');

  readonly sortChange = output<'name'>();
  readonly rideSelected = output<Ride>();

  readonly getRideStatusInfo = getRideStatusInfo;

  toggleSort(key: 'name'): void {
    this.sortChange.emit(key);
  }

  openRide(ride: Ride): void {
    this.rideSelected.emit(ride);
  }

  connectedOperatorsCount(ride: Ride): number {
    const status = ride.status;
    if (!status) {
      return 0;
    }

    const pilotCount = [status.pilotId1, status.pilotId2, status.pilotId3, status.pilotId4].filter(
      (pilotId) => pilotId != null && pilotId > 0
    ).length;
    const supportCount = status.staffId != null && status.staffId > 0 ? 1 : 0;

    return pilotCount + supportCount;
  }

  sortLabel(key: 'name'): string {
    if (this.sortKey() !== key) {
      return '';
    }
    return this.sortDir() === 'asc' ? '(↑)' : '(↓)';
  }
}
