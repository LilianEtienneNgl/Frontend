const SLOT_LABELS: readonly string[] = ['Pilote principal', 'Opérateur 1', 'Opérateur 2', 'Zonard'];

/**
 * Which of the 4 numbered pilot slots (IdPilote_1..4) someone occupies right now reliably
 * determines their role - confirmed against real connection logs, where each slot's comment is
 * consistently the same role name whenever that specific slot is the one that changed. Using the
 * connection log's own comment per-lookup was unreliable instead: a log records a snapshot of all
 * 4 slots for every event, so a lookup by "who's in this slot in the log" picks up whichever
 * comment happened to be attached to the log, even when it described a *different* slot changing.
 */
export function getSlotRoleLabel(slotIndex: number): string {
  return SLOT_LABELS[slotIndex] ?? 'Inconnu';
}
