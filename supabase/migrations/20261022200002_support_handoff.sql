-- =============================================================================
-- Support : transfert humain cohérent (non destructif).
--   États : open (assistant) → handed_off (attend l'équipe) → answered (réponse envoyée) → closed.
--   Une conversation transférée ne reçoit plus de réponse automatique ; l'utilisateur peut y ajouter un message
--   (elle repasse « handed_off ») ou ouvrir une nouvelle conversation.
--   Réponse de l'équipe : enregistrée d'abord, puis notification dans l'application (lien vers Aide).
--   Clé de requête : une nouvelle tentative ne crée pas de doublon. Échec de notification : la réponse est
--   conservée, la notification est marquée à renvoyer.
--   Aucun email n'est promis : l'envoi d'emails n'est pas configuré en production.
-- =============================================================================

alter table public.ai_conversations drop constraint if exists ai_conversations_status_check;
alter table public.ai_conversations add constraint ai_conversations_status_check
  check (status in ('open', 'handed_off', 'answered', 'closed'));
alter table public.ai_conversations
  add column if not exists handed_off_at timestamptz,
  add column if not exists answered_at timestamptz,
  add column if not exists answered_by uuid references public.profiles (id) on delete set null,
  add column if not exists notified_at timestamptz,
  add column if not exists notify_error text check (notify_error is null or length(notify_error) <= 300);
update public.ai_conversations set handed_off_at = coalesce(handed_off_at, updated_at) where status = 'handed_off';

alter table public.ai_messages drop constraint if exists ai_messages_role_check;
alter table public.ai_messages add constraint ai_messages_role_check
  check (role in ('user', 'assistant', 'notice', 'staff'));
alter table public.ai_messages
  add column if not exists author_id uuid references public.profiles (id) on delete set null,
  add column if not exists request_id uuid;
create unique index if not exists ai_messages_request_id_key on public.ai_messages (request_id) where request_id is not null;

-- L'équipe voit les conversations transférées (en cours ou traitées), jamais celles restées avec l'assistant
drop policy if exists "ai_conversations_read" on public.ai_conversations;
create policy "ai_conversations_read" on public.ai_conversations for select to authenticated
  using (user_id = (select auth.uid()) or (handed_off_at is not null and public.is_admin()));
drop policy if exists "ai_messages_read" on public.ai_messages;
create policy "ai_messages_read" on public.ai_messages for select to authenticated
  using (exists (
    select 1 from public.ai_conversations c
     where c.id = conversation_id
       and (c.user_id = (select auth.uid()) or (c.handed_off_at is not null and public.is_admin()))
  ));

-- Notification de la réponse (séparée : un échec ne fait pas perdre la réponse)
create or replace function public.support_notify(p_conversation uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.ai_conversations;
  v_body text;
begin
  select * into c from public.ai_conversations where id = p_conversation for update;
  if c.id is null or c.answered_at is null then
    return false;
  end if;
  if c.notified_at is not null and c.notified_at >= c.answered_at then
    return true; -- déjà notifié pour cette réponse : pas de doublon
  end if;
  select content into v_body from public.ai_messages
   where conversation_id = c.id and role = 'staff' order by id desc limit 1;
  begin
    insert into public.notifications (user_id, type, title, body, link)
    values (c.user_id, 'support_reply', 'Réponse de l''équipe Uny 💬', left(coalesce(v_body, ''), 160), '/aide');
    update public.ai_conversations set notified_at = now(), notify_error = null where id = c.id;
    return true;
  exception when others then
    update public.ai_conversations set notify_error = left(sqlerrm, 300) where id = c.id;
    return false;
  end;
end;
$$;

-- Réponse de l'équipe : administrateur uniquement, idempotente par clé de requête
create or replace function public.support_answer(p_conversation uuid, p_answer text, p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.ai_conversations;
  v_answer text := trim(coalesce(p_answer, ''));
  v_message bigint;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_request_id is null then
    raise exception 'Clé de requête manquante' using errcode = '22023';
  end if;
  select id into v_message from public.ai_messages where request_id = p_request_id;
  if v_message is not null then
    return jsonb_build_object('message', v_message, 'duplicate', true,
      'notified', (select notified_at is not null from public.ai_conversations where id = p_conversation));
  end if;
  if char_length(v_answer) < 2 then
    raise exception 'Réponse vide.' using errcode = 'P0001';
  end if;
  select * into c from public.ai_conversations where id = p_conversation for update;
  if c.id is null or c.handed_off_at is null then
    raise exception 'Conversation introuvable ou non transférée.' using errcode = 'P0002';
  end if;
  insert into public.ai_messages (conversation_id, role, content, author_id, request_id)
  values (c.id, 'staff', left(v_answer, 4000), auth.uid(), p_request_id)
  returning id into v_message;
  update public.ai_conversations
     set status = 'answered', answered_at = now(), answered_by = auth.uid(), updated_at = now()
   where id = c.id;
  return jsonb_build_object('message', v_message, 'duplicate', false, 'notified', public.support_notify(c.id));
end;
$$;

create or replace function public.support_retry_notification(p_conversation uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  return public.support_notify(p_conversation);
end;
$$;

revoke all on function public.support_notify(uuid) from public, anon, authenticated;
revoke all on function public.support_answer(uuid, text, uuid) from public, anon;
revoke all on function public.support_retry_notification(uuid) from public, anon;
grant execute on function public.support_notify(uuid) to service_role;
grant execute on function public.support_answer(uuid, text, uuid) to authenticated;
grant execute on function public.support_retry_notification(uuid) to authenticated;
