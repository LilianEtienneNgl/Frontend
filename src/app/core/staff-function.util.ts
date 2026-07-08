const ROLE_LABELS: Record<string, string> = {
  Pilote: 'Pilote principal',
  'Operateur 1': 'Opérateur 1',
  'Operateur 2': 'Opérateur 2',
  Zonard: 'Zonard',
};

export function getRoleLabel(role: string | null | undefined): string {
  const cleaned = (role ?? '').trim();
  if (!cleaned) {
    return 'Inconnu';
  }
  return ROLE_LABELS[cleaned] ?? cleaned;
}
