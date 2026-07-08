import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Staff } from '../model';

@Injectable({ providedIn: 'root' })
export class StaffService {
  private readonly http = inject(HttpClient);

  getStaff(): Observable<Staff[]> {
    return this.http.get<Staff[]>('/api/staff');
  }

  getStaffById(id: number): Observable<Staff> {
    return this.http.get<Staff>(`/api/staff/${id}`);
  }

  // Backward compatible aliases.
  getAll(): Observable<Staff[]> {
    return this.getStaff();
  }

  getById(id: number): Observable<Staff> {
    return this.getStaffById(id);
  }
}
