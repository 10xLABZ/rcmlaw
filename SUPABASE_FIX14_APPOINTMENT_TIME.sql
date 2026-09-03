-- RCM web v3.5: appointments now carry a required time, matching court dates.
alter table public.legal_dates add column if not exists time text;
