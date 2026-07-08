import { Injectable, signal } from '@angular/core';

export function issuesSignature(issues: string[]): string {
  return issues.join('|');
}

@Injectable({ providedIn: 'root' })
export class DismissedAlertsService {
  private readonly dismissed = signal<Record<number, string>>({});

  isDismissed(rideId: number, currentIssuesSignature: string): boolean {
    return this.dismissed()[rideId] === currentIssuesSignature;
  }

  dismiss(rideId: number, currentIssuesSignature: string): void {
    this.dismissed.update((current) => ({ ...current, [rideId]: currentIssuesSignature }));
  }
}
