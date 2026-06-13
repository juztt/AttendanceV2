-- =============================================================================
-- Mini TimePay — Append holidays for a new year.
--
-- When the Thai cabinet publishes the official public-holiday list
-- for a new year (typically October-November of the previous
-- year), copy this file to `seed-holidays-<year>.sql` and add the
-- new rows. The format mirrors the 2025-2027 entries in
-- `seed-company-defaults.sql`.
--
-- Data sources (pick one):
--   * kapook.com — e.g. https://calendar.kapook.com/2569/holiday
--   * ppraserts/thailand-open-data (GitHub) — open-data JSON/CSV
--     mirror maintained by the community
--   * bankofthailand.or.th — official Bank of Thailand calendar
--   * cabinet resolutions (ราชกิจจานุเบกษา)
--
-- Then run this file in Supabase → SQL Editor. It is safe to
-- re-run; ON CONFLICT (company_id, holiday_date) DO NOTHING
-- means existing rows for the same company + date are skipped.
--
-- For 2568/2025 onwards the canonical list lives in
-- supabase/seed/seed-company-defaults.sql. Update that file too
-- if you change multipliers or want the new year bundled in the
-- initial seed.
-- =============================================================================

do $$
declare
  -- >>> EDIT THIS to your company_id <<<
  v_company_id uuid := '00000000-0000-0000-0000-000000000001';
  v_now        timestamptz := now();
begin
  raise notice 'Appending new-year holidays for company %', v_company_id;

  -- Example: add 2028 holidays once the cabinet announces them.
  -- Replace these placeholder rows with the real list, then run.
  --
  -- Pattern:
  --   insert into public.holidays (id, company_id, name, holiday_date,
  --                                multiplier, is_recurring, created_at, updated_at)
  --   values
  --     (uuid_from_label('hl-2028-01-01'), v_company_id, 'วันขึ้นปีใหม่', '2028-01-01', 2, false, v_now, v_now),
  --     ...
  --   on conflict (company_id, holiday_date) do nothing;
  raise notice 'No new rows defined yet — fill in this file when the cabinet publishes the % holidays', extract(year from now()) + 2;
end $$;
