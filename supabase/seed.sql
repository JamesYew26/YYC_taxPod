-- =====================================================================
-- seed.sql — demo CRM data (fictional people and companies).
-- Run after 002_crm.sql. Re-running resets the CRM tables to this data.
-- =====================================================================

truncate activities, opportunities, contacts restart identity cascade;

insert into contacts (name, email, phone, company, status, created_at) values
  ('Aisyah Rahman',   'aisyah@kenangabina.my',     '+60 12-345 1001', 'Kenanga Bina Sdn Bhd',        'customer', now() - interval '60 days'),
  ('Daniel Lim',      'daniel@limpartners.my',     '+60 16-221 4402', 'Lim & Partners Trading',      'prospect', now() - interval '40 days'),
  ('Priya Nair',      'priya@seriharapan.my',      '+60 17-880 3303', 'Seri Harapan Foods',          'prospect', now() - interval '35 days'),
  ('Wong Kar Meng',   'karmeng.wong@mail.my',      '+60 12-778 9004', null,                          'customer', now() - interval '90 days'),
  ('Hafiz Iskandar',  'hafiz@tenangtech.my',       '+60 19-334 1205', 'Tenang Tech Sdn Bhd',         'lead',     now() - interval '12 days'),
  ('Mei Ling Tan',    'meiling@tanpharma.my',      '+60 11-2345 606', 'Tan Pharma Distributors',     'lead',     now() - interval '9 days'),
  ('Rajesh Kumar',    'rajesh@kumarlogistics.my',  '+60 13-667 7707', 'Kumar Logistics',             'prospect', now() - interval '25 days'),
  ('Nurul Huda',      'nurul@hudaedu.my',          '+60 14-991 2208', 'Huda Learning Centre',        'lead',     now() - interval '5 days'),
  ('Jason Ong',       'jason@ongcapital.my',       '+60 12-118 4409', 'Ong Capital Bhd',             'customer', now() - interval '120 days'),
  ('Farah Aziz',      'farah@azizretail.my',       '+60 17-552 6610', 'Aziz Retail Group',           'prospect', now() - interval '18 days'),
  ('Kevin Chong',     'kevin@chongmfg.my',         '+60 16-440 3311', 'Chong Manufacturing',         'lead',     now() - interval '3 days'),
  ('Siti Mariam',     'siti@mariamclinic.my',      '+60 19-207 8812', 'Mariam Family Clinic',        'customer', now() - interval '75 days');

-- Opportunities reference contacts by name to keep the seed readable.
insert into opportunities (contact_id, title, value_rm, stage, created_at)
select c.id, o.title, o.value_rm, o.stage, now() - o.age
from (values
  ('Aisyah Rahman',  'YA 2026 corporate tax compliance',          48000, 'won',       interval '50 days'),
  ('Aisyah Rahman',  'e-Invoice integration advisory',            32000, 'proposal',  interval '10 days'),
  ('Daniel Lim',     'Annual corporate tax compliance proposal',  36000, 'proposal',  interval '20 days'),
  ('Priya Nair',     'SST registration and e-Invoicing rollout',  28500, 'qualified', interval '15 days'),
  ('Wong Kar Meng',  'Personal tax filing YA 2026',                3500, 'won',       interval '30 days'),
  ('Hafiz Iskandar', 'Tax health check',                         12000, 'contacted', interval '8 days'),
  ('Mei Ling Tan',   'Transfer pricing documentation',           65000, 'new',       interval '6 days'),
  ('Rajesh Kumar',   'Service tax review on logistics services', 22000, 'qualified', interval '14 days'),
  ('Nurul Huda',     'Service tax on education services',          9000, 'new',       interval '4 days'),
  ('Jason Ong',      'Group tax structuring',                    120000, 'proposal',  interval '28 days'),
  ('Jason Ong',      'Financial services SST advisory',           45000, 'lost',      interval '45 days'),
  ('Farah Aziz',     'Retail e-Invoice readiness',                18000, 'contacted', interval '11 days'),
  ('Kevin Chong',    'Small value asset capital allowance claim',  7500, 'new',       interval '2 days'),
  ('Siti Mariam',    'Clinic tax planning retainer',              24000, 'won',       interval '40 days')
) as o(contact_name, title, value_rm, stage, age)
join contacts c on c.name = o.contact_name;

insert into activities (contact_id, opportunity_id, type, occurred_at, description)
select c.id, op.id, a.type, now() - a.age, a.description
from (values
  ('Aisyah Rahman',  'e-Invoice integration advisory',           'meeting', interval '2 hours',  'Walked through MyInvois API vs portal options for their ERP.'),
  ('Daniel Lim',     'Annual corporate tax compliance proposal', 'email',   interval '5 hours',  'Sent YA 2026 compliance proposal and fee schedule.'),
  ('Priya Nair',     'SST registration and e-Invoicing rollout', 'meeting', interval '1 day',    'Discussed SST registration threshold and e-Invoicing rollout dates.'),
  ('Wong Kar Meng',  null,                                       'call',    interval '1 day',    'Reviewed personal reliefs: lifestyle, child relief, EPF.'),
  ('Hafiz Iskandar', 'Tax health check',                         'call',    interval '2 days',   'Intro call; wants a health check before year end.'),
  ('Mei Ling Tan',   'Transfer pricing documentation',           'email',   interval '3 days',   'Requested group structure chart and intercompany agreements.'),
  ('Rajesh Kumar',   'Service tax review on logistics services', 'note',    interval '4 days',   'Imported services may be in scope; check reverse charge position.'),
  ('Jason Ong',      'Group tax structuring',                    'meeting', interval '5 days',   'Board presentation scheduled for next week.'),
  ('Farah Aziz',     'Retail e-Invoice readiness',               'call',    interval '6 days',   'Turnover RM18m, so 1 July 2025 phase applies.'),
  ('Kevin Chong',    'Small value asset capital allowance claim','note',    interval '7 days',   'Some assets were bought on hire purchase; confirm treatment.'),
  ('Nurul Huda',     'Service tax on education services',        'email',   interval '8 days',   'Asked whether tuition centre fees are taxable from July 2025.'),
  ('Siti Mariam',    'Clinic tax planning retainer',             'note',    interval '12 days',  'Retainer signed; quarterly check-ins agreed.')
) as a(contact_name, opp_title, type, age, description)
join contacts c on c.name = a.contact_name
left join opportunities op on op.title = a.opp_title and op.contact_id = c.id;
