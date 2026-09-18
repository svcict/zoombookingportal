import { getSupabaseAdmin, isSupabaseConfigured } from './supabase';

// Write-through persistence for the app data that server.ts keeps in plain
// in-memory arrays (host accounts, meeting types, bookings, Zoom API logs,
// failed login logs). Without Supabase configured, these are all no-ops and
// the app behaves exactly as before (pure in-memory, reset on restart) -
// same fallback pattern as the rest of the app's Supabase integration.
//
// Each table stores one row per record as an `{ id, data: jsonb }` pair -
// see supabase/migrations/0001_app_data_tables.sql for why.

export function persistenceEnabled(): boolean {
  return isSupabaseConfigured();
}

export async function loadTable<T>(table: string): Promise<T[] | null> {
  if (!persistenceEnabled()) return null;
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(table)
    .select('data')
    .order('created_at', { ascending: false });
  if (error) {
    console.error(`[db] Failed to load table "${table}":`, error.message);
    return null;
  }
  return (data || []).map((row: any) => row.data as T);
}

export async function upsertRow(table: string, id: string, data: unknown): Promise<void> {
  if (!persistenceEnabled()) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const { error } = await supabase
    .from(table)
    .upsert({ id, data, updated_at: new Date().toISOString() });
  if (error) {
    console.error(`[db] Failed to upsert into "${table}" (id=${id}):`, error.message);
  }
}

export async function deleteRow(table: string, id: string): Promise<void> {
  if (!persistenceEnabled()) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) {
    console.error(`[db] Failed to delete from "${table}" (id=${id}):`, error.message);
  }
}

export async function clearTable(table: string): Promise<void> {
  if (!persistenceEnabled()) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  // No row ever has an empty-string id, so this matches (and deletes) every row.
  const { error } = await supabase.from(table).delete().neq('id', '');
  if (error) {
    console.error(`[db] Failed to clear table "${table}":`, error.message);
  }
}

// Seeds a table with the app's hardcoded default rows the first time it's
// ever empty (e.g. a fresh Supabase project), so admin-configured data
// (host accounts, meeting types) has somewhere to start from. Never
// overwrites existing rows - once seeded (or once anything else has been
// written), this is a no-op forever.
export async function seedTableIfEmpty<T extends { id: string }>(
  table: string,
  seedRows: T[]
): Promise<void> {
  if (!persistenceEnabled()) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
  if (error) {
    console.error(`[db] Failed to check "${table}" row count for seeding:`, error.message);
    return;
  }
  if ((count || 0) > 0) return;
  const rows = seedRows.map((r) => ({ id: r.id, data: r }));
  const { error: insertError } = await supabase.from(table).insert(rows);
  if (insertError) {
    console.error(`[db] Failed to seed "${table}":`, insertError.message);
  }
}
