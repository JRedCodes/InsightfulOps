-- InsightfulOps (MVP) - Enable RLS everywhere
-- Source of truth: docs/insightful_ops_db_schema_rls.md

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_citations enable row level security;
alter table public.assistant_feedback enable row level security;
alter table public.query_logs enable row level security;
alter table public.shifts enable row level security;
alter table public.shift_change_requests enable row level security;

