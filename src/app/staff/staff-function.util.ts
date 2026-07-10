const SLOT_LABELS: readonly string[] = ['Pilote principal', 'Opérateur 1', 'Opérateur 2', 'Zonard'];

export function getSlotRoleLabel(slotIndex: number): string {
  return SLOT_LABELS[slotIndex] ?? 'Inconnu';
}
