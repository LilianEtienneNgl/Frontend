import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Ride } from '../model';
import { RidesService } from '../services/rides.service';
import { RidesListComponent, RideListItem } from '../rides-list/rides-list.component';
import { rideDefaultIssues } from '../default-issues.util';

@Component({
  selector: 'app-ride-home-page',
  imports: [FormsModule, RidesListComponent],
  templateUrl: './ride.component.html',
  styleUrl: './ride.component.scss'
})
export class RideComponent implements OnInit {
  private readonly ridesService = inject(RidesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly rides = signal<Ride[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly search = signal('');
  readonly alerteOnly = signal(true);

  readonly sortKey = signal<'name'>('name');
  readonly sortDir = signal<'asc' | 'desc'>('asc');

  readonly items = computed<RideListItem[]>(() => {
    const term = this.search().trim().toLowerCase();
    const alerteOnly = this.alerteOnly();
    const sortKey = this.sortKey();
    const sortDir = this.sortDir();

    const mapped = this.rides().map((ride) => {
      const issues = rideDefaultIssues(ride);
      return {
        ride,
        issues,
        isAlerte: issues.length > 0
      };
    });

    const filtered = mapped.filter((item) => {
      const matchesSearch = !term || (item.ride.name ?? '').toLowerCase().includes(term);
      const matchesAlerte = !alerteOnly || item.isAlerte;
      return matchesSearch && matchesAlerte;
    });

    return filtered.sort((a, b) => {
      const direction = sortDir === 'asc' ? 1 : -1;

      return (a.ride.name ?? '').localeCompare(b.ride.name ?? '', 'fr', { sensitivity: 'base' }) * direction;
    });
  });

  ngOnInit(): void {
    const resolved = this.route.snapshot.data['rides'] as Ride[] | undefined;
    if (resolved && resolved.length >= 0) {
      this.rides.set(resolved);
      this.loading.set(false);
      return;
    }

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
}
