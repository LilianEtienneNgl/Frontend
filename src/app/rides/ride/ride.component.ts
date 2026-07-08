import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Ride } from '../model';
import { Staff } from '../../staff/model';
import { Schedule } from '../../core/models';
import { RidesService } from '../services/rides.service';
import { StaffService } from '../../staff/services/staff.service';
import { ScheduleService } from '../../core/schedule.service';
import { RidesListComponent, RideListItem } from '../rides-list/rides-list.component';
import { rideDefaultIssues } from '../default-issues.util';
import { DismissedAlertsService, issuesSignature } from '../../core/dismissed-alerts.service';

interface RideAlertEntry {
  rideId: number;
  rideName: string;
  message: string;
  issuesSignature: string;
}

@Component({
  selector: 'app-ride-home-page',
  imports: [FormsModule, RidesListComponent],
  templateUrl: './ride.component.html',
  styleUrl: './ride.component.scss'
})
export class RideComponent implements OnInit {
  private readonly ridesService = inject(RidesService);
  private readonly staffService = inject(StaffService);
  private readonly scheduleService = inject(ScheduleService);
  private readonly dismissedAlertsService = inject(DismissedAlertsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly rides = signal<Ride[]>([]);
  readonly staffById = signal<Record<number, Staff>>({});
  readonly schedules = signal<Schedule[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly search = signal('');
  readonly alerteOnly = signal(true);

  readonly sortKey = signal<'name'>('name');
  readonly sortDir = signal<'asc' | 'desc'>('asc');

  private readonly mappedItems = computed<RideListItem[]>(() => {
    const schedules = this.schedules();
    const staffById = this.staffById();

    return this.rides().map((ride) => {
      const issues = rideDefaultIssues(ride, schedules, staffById);
      return {
        ride,
        issues,
        isAlerte: issues.length > 0
      };
    });
  });

  private readonly visibleItems = computed<RideListItem[]>(() => {
    return this.mappedItems().filter(
      (item) => !this.dismissedAlertsService.isDismissed(item.ride.id, issuesSignature(item.issues))
    );
  });

  readonly items = computed<RideListItem[]>(() => {
    const term = this.search().trim().toLowerCase();
    const alerteOnly = this.alerteOnly();
    const sortDir = this.sortDir();

    const filtered = this.visibleItems().filter((item) => {
      const matchesSearch = !term || (item.ride.name ?? '').toLowerCase().includes(term);
      const matchesAlerte = !alerteOnly || item.isAlerte;
      return matchesSearch && matchesAlerte;
    });

    return filtered.sort((a, b) => {
      const direction = sortDir === 'asc' ? 1 : -1;

      return (a.ride.name ?? '').localeCompare(b.ride.name ?? '', 'fr', { sensitivity: 'base' }) * direction;
    });
  });

  readonly activeAlerts = computed<RideAlertEntry[]>(() => {
    return this.visibleItems()
      .filter((item) => item.isAlerte)
      .flatMap((item) => item.issues.map((message) => ({
        rideId: item.ride.id,
        rideName: item.ride.name || 'Attraction sans nom',
        message,
        issuesSignature: issuesSignature(item.issues)
      })));
  });

  ngOnInit(): void {
    const resolved = this.route.snapshot.data['rides'] as Ride[] | undefined;
    if (resolved && resolved.length >= 0) {
      this.rides.set(resolved);
      this.loading.set(false);
    } else {
      this.ridesService.getRides().subscribe({
        next: (rides) => {
          this.rides.set(rides);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        }
      });
    }

    this.staffService.getStaff().subscribe({
      next: (staff) => {
        const map: Record<number, Staff> = {};
        for (const member of staff) {
          map[member.id] = member;
        }
        this.staffById.set(map);
      },
      error: () => this.staffById.set({})
    });

    this.scheduleService.getAll().subscribe({
      next: (schedules) => this.schedules.set(schedules),
      error: () => this.schedules.set([])
    });
  }

  toggleSort(key: 'name'): void {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
      return;
    }
    this.sortKey.set(key);
    this.sortDir.set('asc');
  }

  openRide(ride: Ride): void {
    this.router.navigate(['/rides', ride.id]);
  }

  toggleAlerteFilter(): void {
    this.alerteOnly.set(!this.alerteOnly());
  }

  setAlerteFilter(enabled: boolean): void {
    this.alerteOnly.set(enabled);
  }

  dismissAlert(entry: RideAlertEntry): void {
    this.dismissedAlertsService.dismiss(entry.rideId, entry.issuesSignature);
  }
}
