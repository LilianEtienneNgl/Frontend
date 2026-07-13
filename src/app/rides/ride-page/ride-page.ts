import { Component, OnInit, TemplateRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { RidesService } from '../services/rides.service';
import { StaffService } from '../../staff/services/staff.service';
import { LogsService } from '../../core/logs.service';
import { ScheduleService } from '../../core/schedule.service';
import { ParkLog, Schedule } from '../../core/models';
import { Ride } from '../model';
import { Staff } from '../../staff/model';
import { getRideDisplayStatus } from '../ride-status.util';
import { rideDefaultIssues } from '../default-issues.util';
import { formatScheduleHour, rideScheduleRanges } from '../ride-schedule.util';
import { getSlotRoleLabel } from '../../staff/staff-function.util';
import { resolveStaffByToken } from '../../staff/staff-lookup.util';
import { firstRideOpenLog, isRideOpeningLate } from '../lateness/ride-opening-lateness.util';
import { firstPrincipalConnection, isPrincipalLoginLate } from '../lateness/principal-login-lateness.util';
import { DismissedAlertsService, issuesSignature } from '../../core/dismissed-alerts.service';

interface PilotEntry {
  functionLabel: string;
  name: string;
  shiftStart: string | null;
  rowClass: string;
}

interface RideErrorLog {
  id: number;
  label: string;
  message: string;
  recordedAt: string | null;
  isLateOpening: boolean;
  isLatePrincipalLogin: boolean;
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
  private readonly dismissedAlertsService = inject(DismissedAlertsService);
  private readonly modalService = inject(NgbModal);

  readonly ride = signal<Ride | null>(null);
  readonly staffById = signal<Record<number, Staff>>({});
  readonly logs = signal<ParkLog[]>([]);
  readonly schedules = signal<Schedule[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly displayStatus = computed(() => getRideDisplayStatus(this.ride(), this.logs()));

  readonly pilotEntries = computed<PilotEntry[]>(() => {
    const status = this.ride()?.status;
    if (!status) {
      return [];
    }
    const ride = this.ride();
    const logs = this.logs();
    const principalConnection = firstPrincipalConnection(ride, logs);
    const late = isPrincipalLoginLate(ride, this.schedules(), logs);
    const entries: PilotEntry[] = [];
    const pilots: [number | null, string | null][] = [
      [status.pilotId1, status.shiftStart1],
      [status.pilotId2, status.shiftStart2],
      [status.pilotId3, status.shiftStart3],
      [status.pilotId4, status.shiftStart4]
    ];
    pilots.forEach(([pilotId, shiftStart], index) => {
      if (pilotId != null && pilotId > 0) {
        const formattedShiftStart = this.formatHour(shiftStart);
        entries.push({
          functionLabel: getSlotRoleLabel(index),
          name: this.staffName(pilotId),
          shiftStart: formattedShiftStart,
          rowClass: index === 0 ? this.pilotRowClass(principalConnection, late) : ''
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

  readonly currentIssues = computed(() => rideDefaultIssues(this.ride(), this.schedules(), this.logs()));

  readonly defaultAlerts = computed<RideDefaultAlert[]>(() => {
    const ride = this.ride();
    const issues = this.currentIssues();
    if (!issues.length || !ride) {
      return [];
    }
    if (this.dismissedAlertsService.isDismissed(ride.id, issuesSignature(issues.map((issue) => issue.message)))) {
      return [];
    }

    return issues.map((issue) => ({
      hour: this.formatHour(issue.at ?? ride.status?.lastRefreshStatus),
      message: issue.message,
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

  readonly lateOpeningLogId = computed<number | null>(() => {
    const ride = this.ride();
    if (!isRideOpeningLate(ride, this.schedules(), this.logs())) {
      return null;
    }
    return firstRideOpenLog(ride, this.logs())?.id ?? null;
  });

  readonly latePrincipalLoginLogId = computed<number | null>(() => {
    const ride = this.ride();
    if (!isPrincipalLoginLate(ride, this.schedules(), this.logs())) {
      return null;
    }
    return firstPrincipalConnection(ride, this.logs())?.id ?? null;
  });

  readonly rideErrorLogs = computed<RideErrorLog[]>(() => {
    const rideId = this.ride()?.id;
    const latestLogDay = this.latestLogDay();
    const lateOpeningLogId = this.lateOpeningLogId();
    const latePrincipalLoginLogId = this.latePrincipalLoginLogId();

    if (rideId == null || latestLogDay == null) {
      return [];
    }

    return this.logs()
      .filter((log) => log.rideId === rideId)
      .filter((log) => this.isSameDay(log.recordedAt, latestLogDay))
      .sort((a, b) => (b.recordedAt ?? '').localeCompare(a.recordedAt ?? ''))
      .flatMap((log) => {
        const info = this.errorInfo(log.eventType, log.comments, log.userIds, log.recordedAt);
        if (!info) {
          return [];
        }
        return [{
          id: log.id,
          label: info.label,
          message: info.message,
          recordedAt: log.recordedAt,
          isLateOpening: log.id === lateOpeningLogId,
          isLatePrincipalLogin: log.id === latePrincipalLoginLogId
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

  private pilotRowClass(principalConnection: ParkLog | null, isLate: boolean): string {
    if (principalConnection == null) {
      return '';
    }

    return isLate ? 'pilot-row-danger' : 'pilot-row-success';
  }

  private errorInfo(eventType: number | null, comments: string | null, userIds: string | null, recordedAt: string | null): { label: string; message: string } | null {
    const raw = (comments ?? '').trim();
    const actorName = this.logActorName(userIds, comments, recordedAt);
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
    const staff = resolveStaffByToken(raw, this.staffById());
    return staff ? this.staffName(staff.id) : null;
  }

  private logActorName(userIds: string | null, comments: string | null, recordedAt: string | null): string {
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

    const rawComments = (comments ?? '').trim();
    const displayComments = rawComments === 'NigloLand' ? 'Staff' : rawComments;
    return this.resolvePilotName(rawComments) ?? this.supportStaffNameAt(recordedAt) ?? (displayComments || 'Inconnu');
  }

  private supportStaffNameAt(recordedAt: string | null): string | null {
    const status = this.ride()?.status;
    if (!status || status.staffId == null || status.staffId <= 0 || !recordedAt) {
      return null;
    }

    if (this.formatHour(status.staffShiftStart) !== this.formatHour(recordedAt)) {
      return null;
    }

    return this.staffName(status.staffId);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  dismissAlerts(): void {
    const ride = this.ride();
    if (!ride) {
      return;
    }
    this.dismissedAlertsService.dismiss(ride.id, issuesSignature(this.currentIssues().map((issue) => issue.message)));
  }

  openEditWaitingTimeModal(content: TemplateRef<unknown>): void {
    this.modalService.open(content, { centered: true });
  }

  saveWaitingTime(modal: NgbModalRef, rawValue: string): void {
    const ride = this.ride();
    const waitingTime = Number(rawValue);
    if (!ride || !Number.isFinite(waitingTime) || waitingTime < 0) {
      return;
    }

    this.ridesService.changeWaitingTime(ride.id, waitingTime).subscribe({
      next: (updatedRide) => {
        this.ride.set(updatedRide);
        modal.close();
      }
    });
  }
}