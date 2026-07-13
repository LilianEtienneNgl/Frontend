import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { RidesService } from '../services/rides.service';
import { Ride } from '../model';

export const ridesResolver: ResolveFn<Ride[]> = () => {
  const ridesService = inject(RidesService);
  return ridesService.getRides().pipe(catchError(() => of([])));
};