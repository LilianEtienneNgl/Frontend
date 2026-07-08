import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ParkLog } from './models';

@Injectable({ providedIn: 'root' })
export class LogsService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<ParkLog[]> {
    return this.http.get<ParkLog[]>('/api/logs');
  }
}
