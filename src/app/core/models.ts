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

export interface Staff {
  id: number;
  firstName: string | null;
  lastName: string | null;
  trigram: string | null;
  locationId: number | null;
  profileId: number | null;
  jobFunctionId: number | null;
  fullName: string;
}

export interface ParkLog {
  id: number;
  rideId: number | null;
  recordedAt: string | null;
  eventType: number | null;
  userIds: string | null;
  comments: string | null;
}

export interface Schedule {
  id: number;
  lpt: number;
  openTime: string;
  closeTime: string;
}
