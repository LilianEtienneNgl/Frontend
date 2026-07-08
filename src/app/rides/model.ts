export interface RideName {
  rideId: number;
  name: string | null;
}

export interface RideStatus {
  screenId: number | null;
  rideId: number | null;
  status: number | null;
  queueLength: string | null;
  pilotId1: number | null;
  pilotId2: number | null;
  pilotId3: number | null;
  pilotId4: number | null;
  staffId: number | null;
  shiftStart1: string | null;
  shiftStart2: string | null;
  shiftStart3: string | null;
  shiftStart4: string | null;
  staffShiftStart: string | null;
  lastRefreshStatus: string | null;
  lastQueueRefresh: string | null;
  screenPresence: string | null;
  reserveStatus: string | null;
  pilotIds: number[];
  pilotCount: number;
}

export interface Ride {
  id: number;
  type: string | null;
  keys: string | null;
  options: string | null;
  defaultBreakTime: string | null;
  phone: string | null;
  vehicleName: string | null;
  rideName: RideName | null;
  name: string | null;
  status: RideStatus | null;
}
