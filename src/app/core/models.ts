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
