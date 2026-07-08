import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Ride } from './models';

@Injectable({ providedIn: 'root' })
export class RidesService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Ride[]> {
    return this.http.get<Ride[]>('/api/rides');
  }

  getById(id: number): Observable<Ride> {
    return this.http.get<Ride>(`/api/rides/${id}`);
  }
}
