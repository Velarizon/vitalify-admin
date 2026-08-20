-- Tracks whether the client's Vitalify app add-on billing cycle ($99 MXN) is
-- aligned with their gym subscription's renewal date.
-- NULL = enrolled (or not enrolled) but not yet synced — the app was activated
--        mid-cycle and still owes a prorated "residual" payment.
-- set  = synced to that gym renewal date; from here on, renewals auto-include
--        the flat $99 add-on instead of relying on the manual toggle.
alter table clients
  add column if not exists vitalify_billing_synced_at timestamptz;

comment on column clients.vitalify_billing_synced_at is 'Gym subscription end_date the Vitalify app add-on billing was last synced to. NULL = not yet synced (residual payment pending or not applicable).';
