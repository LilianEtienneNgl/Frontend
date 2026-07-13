import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Schedule } from './models';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Schedule[]> {
    return this.http.get<Schedule[]>('/api/hours');
  }

  changeHours(id: number, openTime: string, closeTime: string): Observable<Schedule> {
    return this.http.patch<Schedule>(`/api/hours/${id}`, { openTime, closeTime });
  }
}
