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
