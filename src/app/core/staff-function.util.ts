const STAFF_FUNCTION_LABELS: Record<number, string> = {
  1: 'Pilote principal',
  2: 'Opérateur 1',
  3: 'Opérateur 2',
  4: 'Zonard',
};

export function getStaffFunctionLabel(jobFunctionId: number | null | undefined): string {
  if (jobFunctionId == null) {
    return 'Inconnu';
  }
  return STAFF_FUNCTION_LABELS[jobFunctionId] ?? 'Inconnu';
}
