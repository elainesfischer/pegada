-- =====================================================================
-- Pegada Ecológica em Sala — esquema do banco (Supabase / PostgreSQL)
-- Rode este arquivo inteiro uma única vez no SQL Editor do Supabase.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- PROFESSORES ----------
-- Um registro por usuário do Supabase Auth (criado automaticamente).
create table if not exists public.teachers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.teachers (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Professores que já existiam antes do gatilho:
insert into public.teachers (id, email)
select id, email from auth.users on conflict (id) do nothing;

-- ---------- CÓDIGO DA TURMA ----------
create or replace function public.generate_session_code()
returns text language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sem 0/O/1/I
  candidate text;
begin
  loop
    candidate := '';
    for i in 1..5 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.sessions where code = candidate);
  end loop;
  return candidate;
end $$;

-- ---------- SESSÕES ----------
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.teachers(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  code text not null unique default public.generate_session_code(),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
create index if not exists sessions_owner_idx on public.sessions(owner_id);

-- ---------- PARTICIPANTES ----------
-- Sem dados pessoais: apenas um apelido opcional.
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  nickname text check (nickname is null or char_length(nickname) <= 40),
  status text not null default 'answering' check (status in ('answering', 'completed')),
  created_at timestamptz not null default now()
);
create index if not exists participants_session_idx on public.participants(session_id);

-- ---------- RESPOSTAS / RESULTADOS ----------
-- answers[i] = pontos (0 a 3) da pergunta i+1. Os pontos são calculados aqui no servidor.
create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references public.participants(id) on delete cascade, -- evita envio duplicado
  session_id uuid not null references public.sessions(id) on delete cascade,
  answers smallint[] not null check (array_length(answers, 1) = 20),
  score_alimentacao smallint not null,
  score_transporte smallint not null,
  score_energia smallint not null,
  score_consumo smallint not null,
  score_residuos smallint not null,
  total smallint not null check (total between 0 and 60),
  classification text not null check (classification in ('muito_baixa','baixa_moderada','alta','muito_alta')),
  created_at timestamptz not null default now()
);
create index if not exists responses_session_idx on public.responses(session_id);

-- ---------- SEGURANÇA (RLS) ----------
alter table public.teachers     enable row level security;
alter table public.sessions     enable row level security;
alter table public.participants enable row level security;
alter table public.responses    enable row level security;

-- Visitantes anônimos (alunos) NÃO acessam nenhuma tabela diretamente.
revoke all on public.teachers, public.sessions, public.participants, public.responses from anon;
revoke all on public.teachers, public.sessions, public.participants, public.responses from authenticated;
grant select on public.teachers to authenticated;
grant select, insert, delete on public.sessions to authenticated;
grant update (name, status) on public.sessions to authenticated;   -- não permite trocar código/dono
grant select, delete on public.participants to authenticated;
grant select on public.responses to authenticated;

create or replace function public.owns_session(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sessions s where s.id = sid and s.owner_id = auth.uid());
$$;

drop policy if exists teachers_select_own on public.teachers;
create policy teachers_select_own on public.teachers for select to authenticated
  using (id = auth.uid());

drop policy if exists sessions_select_own on public.sessions;
create policy sessions_select_own on public.sessions for select to authenticated using (owner_id = auth.uid());
drop policy if exists sessions_insert_own on public.sessions;
create policy sessions_insert_own on public.sessions for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists sessions_update_own on public.sessions;
create policy sessions_update_own on public.sessions for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists sessions_delete_own on public.sessions;
create policy sessions_delete_own on public.sessions for delete to authenticated using (owner_id = auth.uid());

drop policy if exists participants_select_own on public.participants;
create policy participants_select_own on public.participants for select to authenticated
  using (public.owns_session(session_id));
drop policy if exists participants_delete_own on public.participants;
create policy participants_delete_own on public.participants for delete to authenticated
  using (public.owns_session(session_id));

drop policy if exists responses_select_own on public.responses;
create policy responses_select_own on public.responses for select to authenticated
  using (public.owns_session(session_id));

-- ---------- FUNÇÕES PÚBLICAS (únicas portas de entrada dos alunos) ----------

-- 1) Dados mínimos da sessão a partir do código.
create or replace function public.get_public_session(p_code text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('id', s.id, 'name', s.name, 'status', s.status)
  from public.sessions s where s.code = upper(trim(p_code)) limit 1;
$$;

-- 2) Aluno começa: cria participante anônimo e devolve o ID (impossível de adivinhar).
create or replace function public.start_participant(p_code text, p_nickname text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  s public.sessions;
  pid uuid;
  nick text := nullif(left(trim(coalesce(p_nickname, '')), 40), '');
begin
  select * into s from public.sessions where code = upper(trim(p_code));
  if not found then raise exception 'SESSAO_NAO_ENCONTRADA'; end if;
  if s.status <> 'open' then raise exception 'SESSAO_ENCERRADA'; end if;
  insert into public.participants (session_id, nickname) values (s.id, nick) returning id into pid;
  return pid;
end $$;

-- 3) Aluno envia as 20 respostas (0 a 3). O servidor valida e calcula tudo.
--    Reenviar com o mesmo participante devolve o resultado já salvo (sem duplicar).
create or replace function public.submit_response(p_participant uuid, p_answers int[])
returns json language plpgsql security definer set search_path = public as $$
declare
  part public.participants;
  sess public.sessions;
  existing public.responses;
  a smallint[];
  s1 int; s2 int; s3 int; s4 int; s5 int; tot int; cls text;
begin
  select * into part from public.participants where id = p_participant for update;
  if not found then raise exception 'PARTICIPANTE_INVALIDO'; end if;

  select * into existing from public.responses where participant_id = p_participant;
  if found then
    return json_build_object('total', existing.total, 'classification', existing.classification,
      'scores', json_build_array(existing.score_alimentacao, existing.score_transporte,
        existing.score_energia, existing.score_consumo, existing.score_residuos));
  end if;

  select * into sess from public.sessions where id = part.session_id;
  if sess.status <> 'open' then raise exception 'SESSAO_ENCERRADA'; end if;

  if p_answers is null or coalesce(array_length(p_answers, 1), 0) <> 20 then
    raise exception 'RESPOSTAS_INVALIDAS';
  end if;
  if exists (select 1 from unnest(p_answers) v where v is null or v < 0 or v > 3) then
    raise exception 'RESPOSTAS_INVALIDAS';
  end if;

  a := p_answers::smallint[];
  select coalesce(sum(v),0) into s1 from unnest(a[1:4])   v;
  select coalesce(sum(v),0) into s2 from unnest(a[5:8])   v;
  select coalesce(sum(v),0) into s3 from unnest(a[9:12])  v;
  select coalesce(sum(v),0) into s4 from unnest(a[13:16]) v;
  select coalesce(sum(v),0) into s5 from unnest(a[17:20]) v;
  tot := s1 + s2 + s3 + s4 + s5;
  cls := case when tot <= 15 then 'muito_baixa' when tot <= 30 then 'baixa_moderada'
              when tot <= 45 then 'alta' else 'muito_alta' end;

  insert into public.responses (participant_id, session_id, answers, score_alimentacao,
    score_transporte, score_energia, score_consumo, score_residuos, total, classification)
  values (p_participant, part.session_id, a, s1, s2, s3, s4, s5, tot, cls);

  update public.participants set status = 'completed' where id = p_participant;

  return json_build_object('total', tot, 'classification', cls, 'scores', json_build_array(s1, s2, s3, s4, s5));
end $$;

revoke execute on function public.get_public_session(text)       from public;
revoke execute on function public.start_participant(text, text)  from public;
revoke execute on function public.submit_response(uuid, int[])   from public;
grant execute on function public.get_public_session(text)        to anon, authenticated;
grant execute on function public.start_participant(text, text)   to anon, authenticated;
grant execute on function public.submit_response(uuid, int[])    to anon, authenticated;

-- ---------- TEMPO REAL ----------
-- O Realtime respeita o RLS: só o dono da sessão recebe os eventos.
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.responses;
