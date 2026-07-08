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
}
