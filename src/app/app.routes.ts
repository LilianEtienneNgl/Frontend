import { Routes } from '@angular/router';
import { RideComponent } from './rides/ride/ride.component';
import { RidePage } from './rides/ride-page/ride-page';
import { ridesResolver } from './rides/resolvers/rides.resolver';
import { rideResolver } from './rides/resolvers/ride.resolver';

export const routes: Routes = [
  { path: '', component: RideComponent, resolve: { rides: ridesResolver } },
  { path: 'rides/:id', component: RidePage, resolve: { ride: rideResolver } },
  { path: '**', redirectTo: '' }
];
