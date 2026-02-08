-- Add pending_discount_offer_id so the app can apply a promotional offer at paywall when user redeemed a discount code.
-- Cleared after they complete a purchase so they only get the discount once.
alter table public.profiles
  add column if not exists pending_discount_offer_id text;

comment on column public.profiles.pending_discount_offer_id is 'App Store promotional offer identifier (e.g. first_month_20_off) when user redeemed a discount code; cleared after purchase.';
