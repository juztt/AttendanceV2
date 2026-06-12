// Apply default seed data to a brand-new company.
//
// Two entry points:
//   - seedCompanyDefaultsLocal(companyId):  for demo mode (no Supabase)
//   - seedCompanyDefaultsRemote(companyId): for Supabase mode
//                                          (also calls the local one so
//                                          localStorage stays consistent)
//
// Both are idempotent: rows are only inserted if no row with the
// same id (or natural key) already exists for the company.

import { loadStore, saveStore } from '@/lib/store';
import type { Shift, PayRule, Holiday, Location, LeaveType } from '@/types';
import {
  SHIFT_TEMPLATES,
  PAY_RULE_TEMPLATES,
  LEAVE_TYPE_TEMPLATES,
  LOCATION_TEMPLATES,
  HOLIDAY_TEMPLATES,
} from './thailand';

function attach<T extends { company_id?: string }>(row: T, companyId: string): T {
  return { ...row, company_id: companyId };
}

/**
 * Seed the local store with the default Thai templates.
 *
 * Skips any row whose id already exists for the company, so
 * re-running on the same store is a no-op.
 */
export function seedCompanyDefaultsLocal(companyId: string): void {
  if (!companyId) return;
  const store = loadStore();

  const upsertById = <T extends { id: string; company_id?: string }>(
    list: T[],
    templates: Omit<T, 'company_id'>[],
  ) => {
    let changed = false;
    for (const tpl of templates) {
      const exists = list.some((x) => x.id === (tpl as any).id);
      if (exists) continue;
      list.push(attach(tpl as any, companyId) as T);
      changed = true;
    }
    return changed;
  };

  const c1 = upsertById<Shift>(store.shifts, SHIFT_TEMPLATES as any);
  const c2 = upsertById<PayRule>(store.payRules, PAY_RULE_TEMPLATES as any);
  const c3 = upsertById<LeaveType>(store.leaveTypes, LEAVE_TYPE_TEMPLATES as any);
  const c4 = upsertById<Location>(store.locations, LOCATION_TEMPLATES as any);
  const c5 = upsertById<Holiday>(store.holidays, HOLIDAY_TEMPLATES as any);

  if (c1 || c2 || c3 || c4 || c5) saveStore(store);
}

/**
 * Push the default templates into Supabase for the given company.
 *
 * Strategy: query existing ids for each table, then insert only
 * the templates that are missing. This keeps the operation
 * idempotent without needing a unique constraint on `id` for
 * every table.
 *
 * Each table runs in its own try/catch so a single RLS failure
 * (e.g. anon-key can't insert holidays) does not block the rest.
 * All errors are logged so the dev console shows exactly which
 * table failed and why.
 *
 * The local store is ALWAYS updated first so the UI is populated
 * even if the Supabase writes fail entirely.
 */
export async function seedCompanyDefaultsRemote(companyId: string): Promise<void> {
  if (!companyId) {
    console.warn('[seed] companyId is empty, skipping');
    return;
  }
  const { getSupabase, isSupabaseConfigured } = await import('@/lib/supabase/client');
  if (!isSupabaseConfigured) {
    console.warn('[seed] Supabase not configured, skipping remote seed');
    return;
  }
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[seed] Supabase client unavailable, skipping remote seed');
    return;
  }

  console.log('[seed] seeding company', companyId);

  // Always refresh the local store so the UI is populated even if
  // the Supabase writes fail.
  seedCompanyDefaultsLocal(companyId);

  type SeedingRow = { id: string };
  const summary: Array<{ table: string; ok: boolean; inserted: number; error?: string }> = [];

  async function insertMissing<T extends SeedingRow>(
    table: string,
    templates: Omit<T, 'company_id'>[],
  ): Promise<void> {
    if (templates.length === 0 || !supabase) return;
    const client = supabase;
    try {
      const { data: existing, error: selErr } = await client
        .from(table)
        .select('id')
        .eq('company_id', companyId);
      if (selErr) {
        console.warn(`[seed] ${table}: select failed —`, selErr.message);
        summary.push({ table, ok: false, inserted: 0, error: selErr.message });
        return;
      }
      const existingIds = new Set((existing ?? []).map((r) => r.id));
      const missing = templates
        .filter((t) => !existingIds.has(t.id))
        .map((t) => ({ ...(t as object), company_id: companyId }));
      if (missing.length === 0) {
        console.log(`[seed] ${table}: all ${templates.length} templates already present`);
        summary.push({ table, ok: true, inserted: 0 });
        return;
      }
      const { error: insErr } = await client.from(table).insert(missing);
      if (insErr) {
        console.error(`[seed] ${table}: insert failed —`, insErr.message);
        summary.push({ table, ok: false, inserted: 0, error: insErr.message });
      } else {
        console.log(`[seed] ${table}: inserted ${missing.length} rows`);
        summary.push({ table, ok: true, inserted: missing.length });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[seed] ${table} crashed —`, msg);
      summary.push({ table, ok: false, inserted: 0, error: msg });
    }
  }

  await Promise.all([
    insertMissing<Shift>('shifts', SHIFT_TEMPLATES as any),
    insertMissing<PayRule>('pay_rules', PAY_RULE_TEMPLATES as any),
    insertMissing<LeaveType>('leave_types', LEAVE_TYPE_TEMPLATES as any),
    insertMissing<Location>('locations', LOCATION_TEMPLATES as any),
    insertMissing<Holiday>('holidays', HOLIDAY_TEMPLATES as any),
  ]);

  const failed = summary.filter((s) => !s.ok);
  if (failed.length > 0) {
    console.warn(`[seed] ${failed.length} table(s) failed:`, failed);
  } else {
    const total = summary.reduce((n, s) => n + s.inserted, 0);
    console.log(`[seed] done, ${total} new rows across ${summary.length} tables`);
  }
}
