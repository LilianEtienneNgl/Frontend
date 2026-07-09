import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ParkLog } from './models';

@Injectable({ providedIn: 'root' })
export class LogsService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<ParkLog[]> {
    return this.http.get<ParkLog[]>('/api/logs', { params: { startAt: this.todayDateString() } });
  }

  private todayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
