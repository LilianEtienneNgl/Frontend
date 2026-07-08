import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RidesService } from '../rides/services/rides.service';
import { StaffService } from '../staff/services/staff.service';
import { LogsService } from '../core/logs.service';
import { ScheduleService } from '../core/schedule.service';
import { ParkLog, Schedule } from '../core/models';
import { Ride } from '../rides/model';
import { Staff } from '../staff/model';
import { getRideStatusInfo } from '../core/ride-status.util';
import { rideDefaultIssues } from '../rides/default-issues.util';
import { formatScheduleHour, rideScheduleRanges } from '../core/ride-schedule.util';
import { getStaffFunctionLabel } from '../core/staff-function.util';
import { getRideOpeningReferenceMinutes, isPrincipalJobFunction, parseHourToMinutes } from '../core/pilot-status.util';

interface PilotEntry {
  functionLabel: string;
  name: string;
  shiftStart: string | null;
  rowClass: string;
}

interface RideErrorLog {
  label: string;
  message: string;
  recordedAt: string | null;
}

interface RideDefaultAlert {
  hour: string;
  message: string;
}

@Component({
  selector: 'app-ride-page',
  imports: [],
  templateUrl: './ride-page.html',
  styleUrl: './ride-page.scss'
})
export class RidePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ridesService = inject(RidesService);
  private readonly staffService = inject(StaffService);
  private readonly logsService = inject(LogsService);
  private readonly scheduleService = inject(ScheduleService);

  readonly ride = signal<Ride | null>(null);
  readonly staffById = signal<Record<number, Staff>>({});
  readonly logs = signal<ParkLog[]>([]);
  readonly schedules = signal<Schedule[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly getRideStatusInfo = getRideStatusInfo;

  readonly openingReference = computed(() => getRideOpeningReferenceMinutes(this.ride(), this.schedules()));

  readonly pilotEntries = computed<PilotEntry[]>(() => {
    const status = this.ride()?.status;
    if (!status) {
      return [];
    }
    const openingReference = this.openingReference();
    const entries: PilotEntry[] = [];
    const pilots: [number | null, string | null][] = [
      [status.pilotId1, status.shiftStart1],
      [status.pilotId2, status.shiftStart2],
      [status.pilotId3, status.shiftStart3],
      [status.pilotId4, status.shiftStart4]
    ];
    pilots.forEach(([pilotId, shiftStart]) => {
      if (pilotId != null && pilotId > 0) {
        const formattedShiftStart = this.formatHour(shiftStart);
        const isPrincipal = isPrincipalJobFunction(this.staffById()[pilotId]?.jobFunctionId);
        entries.push({
          functionLabel: getStaffFunctionLabel(this.staffById()[pilotId]?.jobFunctionId),
          name: this.staffName(pilotId),
          shiftStart: formattedShiftStart,
          rowClass: isPrincipal ? this.pilotRowClass(formattedShiftStart, openingReference) : ''
        });
      }
    });
    return entries;
  });

  readonly supportStaff = computed(() => {
    const status = this.ride()?.status;
    if (!status || status.staffId == null || status.staffId <= 0) {
      return null;
    }
    return {
      name: this.staffName(status.staffId),
      shiftStart: this.formatHour(status.staffShiftStart)
    };
  });

  readonly rideSchedules = computed(() => rideScheduleRanges(this.ride(), this.schedules()));

  readonly defaultAlerts = computed<RideDefaultAlert[]>(() => {
    const ride = this.ride();
    const issues = rideDefaultIssues(ride, this.schedules(), this.staffById());
    if (!issues.length) {
      return [];
    }

    const alertHour = this.formatHour(ride?.status?.lastRefreshStatus);
    return issues.map((message) => ({
      hour: alertHour,
      message,
    }));
  });

  readonly latestLogDay = computed<Date | null>(() => {
    let latest: Date | null = null;

    for (const log of this.logs()) {
      if (!log.recordedAt) {
        continue;
      }

      const recordedAt = new Date(log.recordedAt);
      if (Number.isNaN(recordedAt.getTime())) {
        continue;
      }

      if (latest == null || recordedAt.getTime() > latest.getTime()) {
        latest = recordedAt;
      }
    }

    return latest;
  });

  readonly rideErrorLogs = computed<RideErrorLog[]>(() => {
    const rideId = this.ride()?.id;
    const latestLogDay = this.latestLogDay();

    if (rideId == null || latestLogDay == null) {
      return [];
    }

    return this.logs()
      .filter((log) => log.rideId === rideId)
      .filter((log) => this.isSameDay(log.recordedAt, latestLogDay))
      .sort((a, b) => (b.recordedAt ?? '').localeCompare(a.recordedAt ?? ''))
      .flatMap((log) => {
        const info = this.errorInfo(log.eventType, log.comments, log.userIds);
        if (!info) {
          return [];
        }
        return [{
          label: info.label,
          message: info.message,
          recordedAt: log.recordedAt,
        }];
      });
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const resolvedRide = this.route.snapshot.data['ride'] as Ride | null | undefined;

    if (resolvedRide) {
      this.ride.set(resolvedRide);
      this.loading.set(false);
    } else {
      this.ridesService.getRideById(id).subscribe({
        next: (ride) => {
          this.ride.set(ride);
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

    this.logsService.getAll().subscribe({
      next: (logs) => this.logs.set(logs),
      error: () => this.logs.set([])
    });

    this.scheduleService.getAll().subscribe({
      next: (schedules) => this.schedules.set(schedules),
      error: () => this.schedules.set([])
    });
  }

  private staffName(id: number): string {
    const member = this.staffById()[id];
    if (!member) {
      return `#${id}`;
    }

    const first = member.firstName?.trim() ?? '';
    const last = member.lastName?.trim() ?? '';
    const combined = `${first} ${last}`.trim();
    if (combined) {
      return combined;
    }

    return member.fullName || member.trigram || `#${id}`;
  }

  formatHour(value: string | null | undefined): string {
    return formatScheduleHour(value);
  }

  waitingTimeLabel(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }
    return `${value} mins`;
  }

  private isSameDay(value: string | null | undefined, reference: Date): boolean {
    if (!value) {
      return false;
    }

    const target = new Date(value);
    if (Number.isNaN(target.getTime())) {
      return false;
    }

    return target.getFullYear() === reference.getFullYear()
      && target.getMonth() === reference.getMonth()
      && target.getDate() === reference.getDate();
  }

  private pilotRowClass(shiftStart: string | null | undefined, openingReference: number | null): string {
    const connectedAt = parseHourToMinutes(shiftStart);
    if (connectedAt == null) {
      return '';
    }

    if (openingReference == null) {
      return 'pilot-row-success';
    }

    return connectedAt > openingReference ? 'pilot-row-danger' : 'pilot-row-success';
  }

  private errorInfo(eventType: number | null, comments: string | null, userIds: string | null): { label: string; message: string } | null {
    const raw = (comments ?? '').trim();
    const actorName = this.logActorName(userIds, comments);
    switch (eventType) {
      case 2:
        return {
        label: 'Connexion compte',
        message: `Connexion de : ${actorName}`
      };

      case 3:
        return {
        label: 'Déconnexion compte',
        message: `Déconnexion de : ${actorName}`
      };

      case 4:
        return {
        label: 'Déconnexion automatique',
        message: raw || 'Déconnexion automatique système'
      };

      case 5:
        return {
        label: 'Action agent',
        message: raw ? `Action déclenchée par ${raw}` : 'Action agent'
      };

      case 9: {
        const readable = raw
          .replace('FERMEE-->OUVERTE', 'Fermée vers ouverte')
          .replace('OUVERTE-->FERMEE', 'Ouverte vers fermée')
          .replace('MAINTENANCE-->FERMEE', 'Maintenance vers fermée')
          .replace('FERMEE-->MAINTENANCE', 'Fermée vers maintenance')
          .replace('OUVERTE-->MAINTENANCE', 'Ouverte vers maintenance');
        return {
        label: 'Changement état attraction',
        message: readable || 'Changement état attraction'
      };
      }

      case 10: {
        const queueMatch = raw.match(/^\d+$/);
        return {
        label: 'Mise à jour file d\'attente',
        message: queueMatch ? `Temps d'attente  est passé à  : ${raw} mins` : raw || 'Mise à jour file d\'attente'
        };
      }

      default:
        return null;
    }
  }

  private resolvePilotName(raw: string): string | null {
    const cleaned = raw.trim();
    if (!cleaned) {
      return null;
    }

    const asNumber = Number(cleaned);
    if (!Number.isNaN(asNumber)) {
      const resolvedById = this.staffName(asNumber);
      return resolvedById.startsWith('#') ? null : resolvedById;
    }

    const lowered = cleaned.toLowerCase();
    const byText = Object.values(this.staffById()).find((member) => {
      const trigram = member.trigram?.trim().toLowerCase() ?? '';
      const fullName = member.fullName?.trim().toLowerCase() ?? '';
      const first = member.firstName?.trim().toLowerCase() ?? '';
      const last = member.lastName?.trim().toLowerCase() ?? '';
      const firstLast = `${first} ${last}`.trim();
      return lowered === trigram || lowered === fullName || lowered === firstLast;
    });

    if (byText) {
      return this.staffName(byText.id);
    }

    return null;
  }

  private logActorName(userIds: string | null, comments: string | null): string {
    const normalizedUserIds = (userIds ?? '').trim();
    if (normalizedUserIds) {
      const resolvedNames = normalizedUserIds
        .split(/[;,|]/)
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .map((value) => this.resolvePilotName(value))
        .filter((value): value is string => value != null)
        .filter((value, index, values) => values.indexOf(value) === index);

      if (resolvedNames.length > 0) {
        return resolvedNames[resolvedNames.length - 1];
      }
    }

    return this.resolvePilotName((comments ?? '').trim()) ?? 'Inconnu';
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}