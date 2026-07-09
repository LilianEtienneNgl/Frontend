import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Ride } from '../model';
import { ParkLog, Schedule } from '../../core/models';
import { RidesService } from '../services/rides.service';
import { ScheduleService } from '../../core/schedule.service';
import { LogsService } from '../../core/logs.service';
import { RidesListComponent, RideListItem } from '../rides-list/rides-list.component';
import { rideDefaultIssues } from '../default-issues.util';
import { DismissedAlertsService, issuesSignature } from '../../core/dismissed-alerts.service';
import { getRideDisplayStatus } from '../../core/ride-status.util';

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
  private readonly scheduleService = inject(ScheduleService);
  private readonly logsService = inject(LogsService);
  private readonly dismissedAlertsService = inject(DismissedAlertsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly rides = signal<Ride[]>([]);
  readonly schedules = signal<Schedule[]>([]);
  readonly logs = signal<ParkLog[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly search = signal('');
  readonly alerteOnly = signal(true);

  readonly sortKey = signal<'name'>('name');
  readonly sortDir = signal<'asc' | 'desc'>('asc');

  private readonly mappedItems = computed<RideListItem[]>(() => {
    const schedules = this.schedules();
    const logs = this.logs();

    return this.rides().map((ride) => {
      const issues = rideDefaultIssues(ride, schedules, logs);
      return {
        ride,
        issues,
        isAlerte: issues.length > 0,
        displayStatus: getRideDisplayStatus(ride, logs)
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
      this.fetchRides();
    }

    this.fetchSchedules();
    this.fetchLogs();
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(false);
    this.fetchRides();
    this.fetchSchedules();
    this.fetchLogs();
  }

  private fetchRides(): void {
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

  private fetchSchedules(): void {
    this.scheduleService.getAll().subscribe({
      next: (schedules) => this.schedules.set(schedules),
      error: () => this.schedules.set([])
    });
  }

  private fetchLogs(): void {
    this.logsService.getAll().subscribe({
      next: (logs) => this.logs.set(logs),
      error: () => this.logs.set([])
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
