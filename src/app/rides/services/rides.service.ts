import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Ride } from '../model';

@Injectable({ providedIn: 'root' })
export class RidesService {
  private readonly http = inject(HttpClient);

  getRides(): Observable<Ride[]> {
    return this.http.get<Ride[]>('/api/rides');
  }

  getRideById(id: number): Observable<Ride> {
    return this.http.get<Ride>(`/api/rides/${id}`);
  }

  // Backward compatible aliases.
  getAll(): Observable<Ride[]> {
    return this.getRides();
  }

  getById(id: number): Observable<Ride> {
    return this.getRideById(id);
  }
}
