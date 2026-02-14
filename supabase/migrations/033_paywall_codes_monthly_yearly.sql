-- Paywall codes: track monthly vs yearly purchase usage (analytics only).
-- When a user purchases with a code, the webhook records which product type was used.

-- Add columns to paywall_codes for purchase-type breakdown
alter table public.paywall_codes
  add column if not exists count_monthly integer not null default 0,
  add column if not exists count_yearly integer not null default 0;

comment on column public.paywall_codes.count_monthly is 'Times this code was used with a monthly subscription purchase.';
comment on column public.paywall_codes.count_yearly is 'Times this code was used with a yearly subscription purchase.';

-- Store the code the user entered so the webhook can attribute the purchase
alter table public.profiles
  add column if not exists pending_paywall_code text;

comment on column public.profiles.pending_paywall_code is 'Code entered on paywall before purchase; cleared by webhook after recording. Used for paywall_codes analytics.';

-- RPC: record that a purchase was made with this code (monthly or yearly). Called from webhook only.
create or replace function public.increment_paywall_code_purchase(p_code text, p_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ncode text;
begin
  if p_code is null or trim(p_code) = '' then
    return;
  end if;
  if p_type is null or lower(trim(p_type)) not in ('monthly', 'yearly') then
    return;
  end if;
  ncode := upper(trim(p_code));
  insert into public.paywall_codes (code, count, count_monthly, count_yearly, last_used_at)
  values (
    ncode,
    1,
    case when lower(trim(p_type)) = 'monthly' then 1 else 0 end,
    case when lower(trim(p_type)) = 'yearly' then 1 else 0 end,
    now()
  )
  on conflict (code) do update set
    count = paywall_codes.count + 1,
    count_monthly = paywall_codes.count_monthly + case when lower(trim(p_type)) = 'monthly' then 1 else 0 end,
    count_yearly = paywall_codes.count_yearly + case when lower(trim(p_type)) = 'yearly' then 1 else 0 end,
    last_used_at = now();
end;
$$;

comment on function public.increment_paywall_code_purchase(text, text) is 'Records a purchase with this code (monthly or yearly). Called from revenuecat webhook.';

grant execute on function public.increment_paywall_code_purchase(text, text) to service_role;

-- RPC: set current user pending paywall code (so webhook can attribute next purchase). Call from app when user enters code.
create or replace function public.set_pending_paywall_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_code is null or trim(p_code) = '' then
    update public.profiles set pending_paywall_code = null where id = auth.uid();
  else
    update public.profiles set pending_paywall_code = upper(trim(p_code)) where id = auth.uid();
  end if;
end;
$$;

comment on function public.set_pending_paywall_code(text) is 'Stores the code the user entered on the paywall so the webhook can attribute the purchase.';

grant execute on function public.set_pending_paywall_code(text) to authenticated;
grant execute on function public.set_pending_paywall_code(text) to service_role;
