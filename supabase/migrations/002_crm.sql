-- =====================================================================
-- 002_crm.sql
-- CRM core: contacts (leads), opportunities, activities.
-- Run once in the Supabase SQL Editor after 001 (safe to re-run).
-- =====================================================================

-- Keeps updated_at current on every UPDATE.
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Contacts. The brief calls them "Leads" in one place and "contacts" in
-- another; this is one table, and Lead / Prospect / Customer is the status.
-- ---------------------------------------------------------------------
create table if not exists contacts (
  id          bigint generated always as identity primary key,
  name        text not null check (length(trim(name)) > 0),
  email       text,
  phone       text,
  company     text,
  status      text not null default 'lead'
              check (status in ('lead', 'prospect', 'customer')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists contacts_status_idx on contacts (status);
create index if not exists contacts_created_at_idx on contacts (created_at desc);

drop trigger if exists contacts_updated_at on contacts;
create trigger contacts_updated_at before update on contacts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Opportunities: each belongs to one contact.
-- Stage flow: new → contacted → qualified → proposal → won | lost
-- ---------------------------------------------------------------------
create table if not exists opportunities (
  id          bigint generated always as identity primary key,
  contact_id  bigint not null references contacts(id) on delete cascade,
  title       text not null check (length(trim(title)) > 0),
  value_rm    numeric(14, 2) not null default 0 check (value_rm >= 0),
  stage       text not null default 'new'
              check (stage in ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists opportunities_contact_idx on opportunities (contact_id);
create index if not exists opportunities_stage_idx on opportunities (stage);

drop trigger if exists opportunities_updated_at on opportunities;
create trigger opportunities_updated_at before update on opportunities
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Activities: logged against a contact, an opportunity, or both.
-- ---------------------------------------------------------------------
create table if not exists activities (
  id              bigint generated always as identity primary key,
  contact_id      bigint references contacts(id) on delete cascade,
  opportunity_id  bigint references opportunities(id) on delete cascade,
  type            text not null check (type in ('call', 'email', 'meeting', 'note')),
  occurred_at     timestamptz not null default now(),
  description     text not null check (length(trim(description)) > 0),
  created_at      timestamptz not null default now(),
  check (contact_id is not null or opportunity_id is not null)
);

create index if not exists activities_occurred_at_idx on activities (occurred_at desc);
create index if not exists activities_contact_idx on activities (contact_id);
create index if not exists activities_opportunity_idx on activities (opportunity_id);

-- RLS on with no policies: only the server (secret key) reads/writes.
-- Auth is out of scope (single hardcoded user); the browser never queries these tables directly.
alter table contacts      enable row level security;
alter table opportunities enable row level security;
alter table activities    enable row level security;
