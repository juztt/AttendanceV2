import { loadStore, saveStore, logAudit } from '@/lib/store';
import { uid, now } from '@/lib/utils';
import type { PayRule, Shift, Holiday, Location, LeaveType, Branch, AppSetting } from '@/types';

export function getPayRules(companyId: string): PayRule[] {
  return loadStore().payRules.filter((r) => r.company_id === companyId);
}

export function upsertPayRule(rule: PayRule, actorId: string): PayRule {
  const store = loadStore();
  const idx = store.payRules.findIndex((r) => r.id === rule.id);
  if (idx >= 0) {
    const before = JSON.parse(JSON.stringify(store.payRules[idx]));
    store.payRules[idx] = { ...rule, updated_at: now() };
    logAudit(rule.company_id, actorId, 'pay_rules', rule.id, 'update', before, store.payRules[idx]);
  } else {
    const r: PayRule = { ...rule, id: rule.id || uid('pr'), created_at: now(), updated_at: now() };
    store.payRules.push(r);
    logAudit(rule.company_id, actorId, 'pay_rules', r.id, 'create', null, r);
  }
  saveStore(store);
  return rule;
}

export function deletePayRule(id: string, actorId: string) {
  const store = loadStore();
  const r = store.payRules.find((x) => x.id === id);
  if (!r) return;
  const before = JSON.parse(JSON.stringify(r));
  store.payRules = store.payRules.filter((x) => x.id !== id);
  logAudit(r.company_id, actorId, 'pay_rules', id, 'delete', before, null);
  saveStore(store);
}

export function getShifts(companyId: string): Shift[] {
  return loadStore().shifts.filter((s) => s.company_id === companyId);
}

export function upsertShift(shift: Shift, actorId: string): Shift {
  const store = loadStore();
  const idx = store.shifts.findIndex((s) => s.id === shift.id);
  if (idx >= 0) {
    const before = JSON.parse(JSON.stringify(store.shifts[idx]));
    store.shifts[idx] = { ...shift, updated_at: now() };
    logAudit(shift.company_id, actorId, 'shifts', shift.id, 'update', before, store.shifts[idx]);
  } else {
    const s: Shift = { ...shift, id: shift.id || uid('sh'), created_at: now(), updated_at: now() };
    store.shifts.push(s);
    logAudit(shift.company_id, actorId, 'shifts', s.id, 'create', null, s);
  }
  saveStore(store);
  return shift;
}

export function deleteShift(id: string, actorId: string) {
  const store = loadStore();
  const s = store.shifts.find((x) => x.id === id);
  if (!s) return;
  store.shifts = store.shifts.filter((x) => x.id !== id);
  logAudit(s.company_id, actorId, 'shifts', id, 'delete', s, null);
  saveStore(store);
}

export function getHolidays(companyId: string): Holiday[] {
  return loadStore().holidays.filter((h) => h.company_id === companyId).sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
}

export function upsertHoliday(holiday: Holiday, actorId: string): Holiday {
  const store = loadStore();
  const idx = store.holidays.findIndex((h) => h.id === holiday.id);
  if (idx >= 0) {
    store.holidays[idx] = { ...holiday, updated_at: now() };
    logAudit(holiday.company_id, actorId, 'holidays', holiday.id, 'update', store.holidays[idx], holiday);
  } else {
    const h: Holiday = { ...holiday, id: holiday.id || uid('hl'), created_at: now(), updated_at: now() };
    store.holidays.push(h);
    logAudit(holiday.company_id, actorId, 'holidays', h.id, 'create', null, h);
  }
  saveStore(store);
  return holiday;
}

export function deleteHoliday(id: string, actorId: string) {
  const store = loadStore();
  const h = store.holidays.find((x) => x.id === id);
  if (!h) return;
  store.holidays = store.holidays.filter((x) => x.id !== id);
  logAudit(h.company_id, actorId, 'holidays', id, 'delete', h, null);
  saveStore(store);
}

export function getLocations(companyId: string): Location[] {
  return loadStore().locations.filter((l) => l.company_id === companyId);
}

export function upsertLocation(loc: Location, actorId: string): Location {
  const store = loadStore();
  const idx = store.locations.findIndex((l) => l.id === loc.id);
  if (idx >= 0) {
    store.locations[idx] = { ...loc, updated_at: now() };
    logAudit(loc.company_id, actorId, 'locations', loc.id, 'update', store.locations[idx], loc);
  } else {
    const l: Location = { ...loc, id: loc.id || uid('loc'), created_at: now(), updated_at: now() };
    store.locations.push(l);
    logAudit(loc.company_id, actorId, 'locations', l.id, 'create', null, l);
  }
  saveStore(store);
  return loc;
}

export function getLeaveTypes(companyId: string): LeaveType[] {
  return loadStore().leaveTypes.filter((l) => l.company_id === companyId);
}

export function getBranches(companyId: string): Branch[] {
  return loadStore().branches.filter((b) => b.company_id === companyId);
}

export function getSettings(companyId: string): AppSetting[] {
  return loadStore().appSettings.filter((s) => s.company_id === companyId);
}
