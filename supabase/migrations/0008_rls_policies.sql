-- InsightfulOps (MVP) - RLS Policies
-- Source of truth: docs/insightful_ops_db_schema_rls.md

-- companies
drop policy if exists "companies_select_own" on public.companies;
create policy "companies_select_own" on public.companies
for select
using (id = public.current_company_id());

drop policy if exists "companies_update_admin" on public.companies;
create policy "companies_update_admin" on public.companies
for update
using (id = public.current_company_id() and public.is_admin())
with check (id = public.current_company_id() and public.is_admin());

-- profiles
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles
for select
using (user_id = auth.uid());

drop policy if exists "profiles_select_company_admin" on public.profiles;
create policy "profiles_select_company_admin" on public.profiles
for select
using (company_id = public.current_company_id() and public.is_admin());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "profiles_update_company_admin" on public.profiles;
create policy "profiles_update_company_admin" on public.profiles
for update
using (company_id = public.current_company_id() and public.is_admin())
with check (company_id = public.current_company_id() and public.is_admin());

-- documents
drop policy if exists "documents_select_visible" on public.documents;
create policy "documents_select_visible" on public.documents
for select
using (
  company_id = public.current_company_id()
  and status <> 'archived'::doc_status
  and public.visibility_allowed(visibility)
);

drop policy if exists "documents_admin_insert" on public.documents;
create policy "documents_admin_insert" on public.documents
for insert
with check (company_id = public.current_company_id() and public.is_admin());

drop policy if exists "documents_admin_update" on public.documents;
create policy "documents_admin_update" on public.documents
for update
using (company_id = public.current_company_id() and public.is_admin())
with check (company_id = public.current_company_id() and public.is_admin());

drop policy if exists "documents_admin_delete" on public.documents;
create policy "documents_admin_delete" on public.documents
for delete
using (company_id = public.current_company_id() and public.is_admin());

-- document_chunks
drop policy if exists "chunks_select_visible" on public.document_chunks;
create policy "chunks_select_visible" on public.document_chunks
for select
using (
  company_id = public.current_company_id()
  and exists (
    select 1
    from public.documents d
    where d.id = document_id
      and d.company_id = public.current_company_id()
      and d.status = 'indexed'::doc_status
      and public.visibility_allowed(d.visibility)
  )
);

drop policy if exists "chunks_admin_insert" on public.document_chunks;
create policy "chunks_admin_insert" on public.document_chunks
for insert
with check (company_id = public.current_company_id() and public.is_admin());

drop policy if exists "chunks_admin_update" on public.document_chunks;
create policy "chunks_admin_update" on public.document_chunks
for update
using (company_id = public.current_company_id() and public.is_admin())
with check (company_id = public.current_company_id() and public.is_admin());

drop policy if exists "chunks_admin_delete" on public.document_chunks;
create policy "chunks_admin_delete" on public.document_chunks
for delete
using (company_id = public.current_company_id() and public.is_admin());

-- conversations (owner-only MVP)
drop policy if exists "conversations_select_owner" on public.conversations;
create policy "conversations_select_owner" on public.conversations
for select
using (company_id = public.current_company_id() and created_by = auth.uid());

drop policy if exists "conversations_insert_owner" on public.conversations;
create policy "conversations_insert_owner" on public.conversations
for insert
with check (company_id = public.current_company_id() and created_by = auth.uid());

drop policy if exists "conversations_delete_owner" on public.conversations;
create policy "conversations_delete_owner" on public.conversations
for delete
using (company_id = public.current_company_id() and created_by = auth.uid());

-- messages (within owner conversations)
drop policy if exists "messages_select_owner" on public.messages;
create policy "messages_select_owner" on public.messages
for select
using (
  company_id = public.current_company_id()
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and c.created_by = auth.uid()
      and c.company_id = public.current_company_id()
  )
);

drop policy if exists "messages_insert_owner" on public.messages;
create policy "messages_insert_owner" on public.messages
for insert
with check (
  company_id = public.current_company_id()
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and c.created_by = auth.uid()
      and c.company_id = public.current_company_id()
  )
);

-- citations (scoped to owner conversations)
drop policy if exists "citations_select_owner" on public.message_citations;
create policy "citations_select_owner" on public.message_citations
for select
using (
  company_id = public.current_company_id()
  and exists (
    select 1
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.id = message_id
      and c.created_by = auth.uid()
      and c.company_id = public.current_company_id()
  )
);

drop policy if exists "citations_insert_owner" on public.message_citations;
create policy "citations_insert_owner" on public.message_citations
for insert
with check (
  company_id = public.current_company_id()
  and exists (
    select 1
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.id = message_id
      and c.created_by = auth.uid()
      and c.company_id = public.current_company_id()
  )
);

-- feedback
drop policy if exists "feedback_insert_self" on public.assistant_feedback;
create policy "feedback_insert_self" on public.assistant_feedback
for insert
with check (company_id = public.current_company_id() and user_id = auth.uid());

drop policy if exists "feedback_select_self" on public.assistant_feedback;
create policy "feedback_select_self" on public.assistant_feedback
for select
using (company_id = public.current_company_id() and user_id = auth.uid());

drop policy if exists "feedback_select_admin" on public.assistant_feedback;
create policy "feedback_select_admin" on public.assistant_feedback
for select
using (company_id = public.current_company_id() and public.is_admin());

-- query_logs
drop policy if exists "querylogs_insert_self" on public.query_logs;
create policy "querylogs_insert_self" on public.query_logs
for insert
with check (company_id = public.current_company_id() and user_id = auth.uid());

drop policy if exists "querylogs_select_admin" on public.query_logs;
create policy "querylogs_select_admin" on public.query_logs
for select
using (company_id = public.current_company_id() and public.is_admin());

-- shifts
drop policy if exists "shifts_select_self" on public.shifts;
create policy "shifts_select_self" on public.shifts
for select
using (company_id = public.current_company_id() and user_id = auth.uid());

drop policy if exists "shifts_select_manager" on public.shifts;
create policy "shifts_select_manager" on public.shifts
for select
using (company_id = public.current_company_id() and public.is_manager_or_admin());

drop policy if exists "shifts_insert_manager" on public.shifts;
create policy "shifts_insert_manager" on public.shifts
for insert
with check (company_id = public.current_company_id() and public.is_manager_or_admin());

drop policy if exists "shifts_update_manager" on public.shifts;
create policy "shifts_update_manager" on public.shifts
for update
using (company_id = public.current_company_id() and public.is_manager_or_admin())
with check (company_id = public.current_company_id() and public.is_manager_or_admin());

drop policy if exists "shifts_delete_manager" on public.shifts;
create policy "shifts_delete_manager" on public.shifts
for delete
using (company_id = public.current_company_id() and public.is_manager_or_admin());

-- shift_change_requests (optional)
drop policy if exists "shiftreq_insert_self" on public.shift_change_requests;
create policy "shiftreq_insert_self" on public.shift_change_requests
for insert
with check (
  company_id = public.current_company_id()
  and requested_by = auth.uid()
  and exists (
    select 1
    from public.shifts s
    where s.id = shift_id
      and s.company_id = public.current_company_id()
      and s.user_id = auth.uid()
  )
);

drop policy if exists "shiftreq_select_self" on public.shift_change_requests;
create policy "shiftreq_select_self" on public.shift_change_requests
for select
using (company_id = public.current_company_id() and requested_by = auth.uid());

drop policy if exists "shiftreq_select_manager" on public.shift_change_requests;
create policy "shiftreq_select_manager" on public.shift_change_requests
for select
using (company_id = public.current_company_id() and public.is_manager_or_admin());

drop policy if exists "shiftreq_update_manager" on public.shift_change_requests;
create policy "shiftreq_update_manager" on public.shift_change_requests
for update
using (company_id = public.current_company_id() and public.is_manager_or_admin())
with check (company_id = public.current_company_id() and public.is_manager_or_admin());

