import { Staff } from './model';

export function resolveStaffByToken(raw: string, staffById: Record<number, Staff>): Staff | null {
  const cleaned = raw.trim();
  if (!cleaned) {
    return null;
  }

  const asNumber = Number(cleaned);
  if (!Number.isNaN(asNumber) && staffById[asNumber]) {
    return staffById[asNumber];
  }

  const lowered = cleaned.toLowerCase();
  return Object.values(staffById).find((member) => {
    const trigram = member.trigram?.trim().toLowerCase() ?? '';
    const fullName = member.fullName?.trim().toLowerCase() ?? '';
    const first = member.firstName?.trim().toLowerCase() ?? '';
    const last = member.lastName?.trim().toLowerCase() ?? '';
    const firstLast = `${first} ${last}`.trim();
    return lowered === trigram || lowered === fullName || lowered === firstLast;
  }) ?? null;
}
