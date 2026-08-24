-- Limited-time promo: the first N activations of the Vitalify app add-on
-- (MOBILE_APP_ADDON_PRICE, new activations only — not renewal syncs) are
-- free. Single-row table; redemptions are counted atomically via
-- redeem_app_addon_promo() so concurrent activations across different gyms
-- can't push redeemed_count past redemption_limit.
create table if not exists app_addon_promotions (
  id bigint generated always as identity primary key,
  active boolean not null default true,
  redemption_limit integer not null default 100,
  redeemed_count integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table app_addon_promotions is 'Global (not per-gym) promo counter for free Vitalify app add-on activations. Expected to hold a single row; turn off early via a manual update, not app UI.';

insert into app_addon_promotions (active, redemption_limit, redeemed_count)
select true, 100, 0
where not exists (select 1 from app_addon_promotions);

alter table app_addon_promotions enable row level security;

create policy "Authenticated users can read promo status"
  on app_addon_promotions for select
  to authenticated
  using (true);

-- Atomically claims one redemption. Returns true (and increments the
-- counter) only if the promo is active and still has room; false otherwise.
-- The UPDATE's WHERE clause makes the check-and-increment a single
-- statement, so two simultaneous activations can't both read count=99 and
-- both "win".
create or replace function redeem_app_addon_promo()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update app_addon_promotions
  set redeemed_count = redeemed_count + 1
  where active and redeemed_count < redemption_limit;
  return found;
end;
$$;

grant execute on function redeem_app_addon_promo() to authenticated;
