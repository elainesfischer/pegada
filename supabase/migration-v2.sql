-- =====================================================================
-- Pegada Ecológica em Sala — ATUALIZAÇÃO 2 (Modo Aula, histórico, página pública)
-- Rode DEPOIS do schema.sql, no SQL Editor do Supabase. É seguro rodar mais de uma vez.
-- =====================================================================

-- 1) Página pública de resultados agregados (desligada por padrão)
alter table public.sessions add column if not exists public_results boolean not null default false;
grant update (name, status, public_results) on public.sessions to authenticated;

-- 2) Tempo real também para mudanças de status da sessão
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessions') then
    alter publication supabase_realtime add table public.sessions;
  end if;
end $$;

-- 3) Resumo por sessão (histórico e comparação). security_invoker = respeita o RLS:
--    cada professor vê apenas as próprias turmas.
create or replace view public.session_summaries with (security_invoker = true) as
select
  s.id as session_id,
  (select count(*) from public.participants p where p.session_id = s.id)::int as participants,
  count(r.id)::int as completed,
  round(avg(r.total)::numeric, 1)             as mean_total,
  round(avg(r.score_alimentacao)::numeric, 1) as mean_alimentacao,
  round(avg(r.score_transporte)::numeric, 1)  as mean_transporte,
  round(avg(r.score_energia)::numeric, 1)     as mean_energia,
  round(avg(r.score_consumo)::numeric, 1)     as mean_consumo,
  round(avg(r.score_residuos)::numeric, 1)    as mean_residuos
from public.sessions s
left join public.responses r on r.session_id = s.id
group by s.id;

revoke all on public.session_summaries from anon;
grant select on public.session_summaries to authenticated;

-- 4) Resultados públicos: SOMENTE dados agregados, e só se o professor ativou
--    a página e a sessão está encerrada. Nunca devolve nomes, IDs ou respostas.
create or replace function public.get_public_results(p_code text)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  s public.sessions;
  res json;
begin
  select * into s from public.sessions where code = upper(trim(p_code));
  if not found or not s.public_results or s.status <> 'closed' then
    return null;
  end if;

  select json_build_object(
    'name', s.name,
    'date', s.created_at,
    'n', count(*),
    'mean', round(avg(total)::numeric, 1),
    'min', min(total),
    'max', max(total),
    'median', percentile_cont(0.5) within group (order by total),
    'distribution', json_build_object(
      'muito_baixa',    count(*) filter (where classification = 'muito_baixa'),
      'baixa_moderada', count(*) filter (where classification = 'baixa_moderada'),
      'alta',           count(*) filter (where classification = 'alta'),
      'muito_alta',     count(*) filter (where classification = 'muito_alta')),
    'dimMeans', json_build_array(
      round(avg(score_alimentacao)::numeric, 1), round(avg(score_transporte)::numeric, 1),
      round(avg(score_energia)::numeric, 1),     round(avg(score_consumo)::numeric, 1),
      round(avg(score_residuos)::numeric, 1))
  ) into res
  from public.responses where session_id = s.id;

  return res;
end $$;

revoke execute on function public.get_public_results(text) from public;
grant execute on function public.get_public_results(text) to anon, authenticated;
