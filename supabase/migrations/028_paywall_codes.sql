-- Simple table to track which codes users type in the paywall "Enter Code" field (cosmetic only; no redemption).
-- View in Supabase Table Editor: code, count, last_used_at.

create table if not exists public.paywall_codes (
  code text primary key,
  count integer not null default 1,
  last_used_at timestamptz not null default now()
);

comment on table public.paywall_codes is 'Counts how many times each code was entered on the paywall (for curiosity/marketing). Codes do not activate anything.';

-- Only the RPC can write; you can read the table in Supabase dashboard.
alter table public.paywall_codes enable row level security;

-- Only service role (e.g. dashboard) can read; app users only call the RPC to record.
create policy "Service role can read paywall_codes"
  on public.paywall_codes for select
  using (auth.role() = 'service_role');

create policy "No direct insert/update from client"
  on public.paywall_codes for insert
  with check (false);

create policy "No direct update from client"
  on public.paywall_codes for update
  using (false);

-- RPC: increment count for code (or insert 1). Callable by authenticated users so the app can record.
create or replace function public.increment_paywall_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_code is null or trim(p_code) = '' then
    return;
  end if;
  insert into public.paywall_codes (code, count, last_used_at)
  values (upper(trim(p_code)), 1, now())
  on conflict (code) do update set
    count = paywall_codes.count + 1,
    last_used_at = now();
end;
$$;

comment on function public.increment_paywall_code(text) is 'Records that a user entered this code on the paywall (increments count). Codes are normalized to uppercase.';

grant execute on function public.increment_paywall_code(text) to authenticated;
grant execute on function public.increment_paywall_code(text) to service_role;
