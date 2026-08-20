-- Tracks the date through which the Vitalify app add-on is already paid.
-- Set at first activation (today + 30 days). Used to prorate the "catch-up"
-- charge the next time the gym membership renews, closing the gap between
-- this date and the new gym end date. Once caught up, `vitalify_billing_synced_at`
-- takes over and every future renewal charges the flat $99.
alter table clients
  add column if not exists vitalify_app_paid_until timestamptz;

comment on column clients.vitalify_app_paid_until is 'Date the Vitalify app add-on is paid through. Set at activation (today + 30 days); used only to prorate the catch-up charge before billing is synced to the gym cycle.';
