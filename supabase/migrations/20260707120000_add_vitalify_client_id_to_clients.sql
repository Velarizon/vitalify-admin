-- Vitalify (trainer-app) enrollment marker on clients.
-- Cross-project reference: vitalify_client_id is a client id that lives in the SEPARATE
-- trainer-app Supabase project (xeqshloypmfrlmrutmgf), so it is NOT a real FK.
-- A non-null value means this client has a Vitalify app account.
alter table clients
  add column if not exists vitalify_client_id integer;

comment on column clients.vitalify_client_id is 'Client id in the trainer-app project (xeqsh...) once enrolled in the Vitalify app. Cross-project reference, not a FK. NULL = not enrolled.';
