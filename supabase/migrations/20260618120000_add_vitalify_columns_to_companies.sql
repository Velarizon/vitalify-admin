-- Vitalify (trainer-app) integration columns on companies.
-- Cross-project reference: vitalify_id is a User.id that lives in the SEPARATE
-- trainer-app Supabase project (xeqshloypmfrlmrutmgf), so it is NOT a real FK.
alter table companies
  add column if not exists vitalify_id       integer,
  add column if not exists vitalify_email    text,
  add column if not exists vitalify_password text;

comment on column companies.vitalify_id is 'User.id of the gym TRAINER account in the trainer-app project (xeqsh...). Cross-project reference, not a FK.';
comment on column companies.vitalify_email is 'Email of the gym account in the trainer-app project.';
comment on column companies.vitalify_password is 'Password of the gym account in the trainer-app project (shown in /terminal).';
