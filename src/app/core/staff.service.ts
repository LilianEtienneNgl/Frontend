import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Staff } from './models';

@Injectable({ providedIn: 'root' })
export class StaffService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Staff[]> {
    return this.http.get<Staff[]>('/api/staff');
  }

  getById(id: number): Observable<Staff> {
    return this.http.get<Staff>(`/api/staff/${id}`);
  }
}
