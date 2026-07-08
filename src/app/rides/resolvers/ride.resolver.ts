import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { RidesService } from '../services/rides.service';
import { Ride } from '../model';

export const rideResolver: ResolveFn<Ride | null> = (route) => {
  const ridesService = inject(RidesService);
  const id = Number(route.paramMap.get('id'));
  if (!Number.isFinite(id) || id <= 0) {
    return of(null);
  }
  return ridesService.getRideById(id).pipe(catchError(() => of(null)));
};
