-- Caltech Mathathon survey: run this once in Supabase → SQL Editor → New query.

create table if not exists public.responses (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  survey         text not null check (survey in ('demographics', 'future_of_ai', 'education')),
  respondent_id  uuid not null,          -- anonymous id that links one person's surveys
  answers        jsonb not null,
  user_agent     text,
  constraint answers_size check (pg_column_size(answers) < 32000)
);

create index if not exists responses_survey_idx on public.responses (survey, created_at);

-- Row-level security: the public website may INSERT, but nobody can read
-- responses with the public key. You see them in the Supabase dashboard.
alter table public.responses enable row level security;

drop policy if exists "public can submit" on public.responses;
create policy "public can submit"
  on public.responses
  for insert
  to anon
  with check (true);

grant insert on public.responses to anon;

-- ---------------------------------------------------------------------------
-- Optional: flat views for easy CSV export (Table Editor → view → Export CSV).
-- ---------------------------------------------------------------------------
create or replace view public.demographics_flat with (security_invoker = true) as
select id, created_at, respondent_id,
  answers->>'role'               as role,
  answers->>'role_other'         as role_other,
  answers->>'home_country'       as home_country,
  answers->>'current_location'   as current_location,
  answers->>'age'                as age,
  answers->>'gender'             as gender,
  answers->>'gender_other'       as gender_other,
  answers->'ethnicity'           as ethnicity,
  answers->>'ethnicity_other'    as ethnicity_other,
  answers->>'first_language'     as first_language,
  answers->>'first_gen'          as first_gen,
  answers->'heard_about'         as heard_about
from public.responses where survey = 'demographics';

create or replace view public.future_of_ai_flat with (security_invoker = true) as
select id, created_at, respondent_id,
  answers->>'ai_think'                  as ai_think,
  answers->>'ai_hope'                   as ai_hope,
  (answers->>'optimism_ai_world')::int  as optimism_ai_world,
  (answers->>'optimism_math')::int      as optimism_math,
  (answers->>'optimism_academia')::int  as optimism_academia,
  answers->>'ai_usage'                  as ai_usage,
  answers->>'ai_math_timeline'          as ai_math_timeline,
  answers->'ai_concerns'                as ai_concerns,
  answers->>'ai_role_in_research'       as ai_role_in_research,
  answers->>'ai_one_thing'              as ai_one_thing
from public.responses where survey = 'future_of_ai';

create or replace view public.education_flat with (security_invoker = true) as
select id, created_at, respondent_id,
  answers->>'highest_degree'       as highest_degree,
  answers->>'current_program'      as current_program,
  answers->'schools'               as schools,
  answers->'fields'                as fields,
  answers->>'research_interests'   as research_interests,
  answers->>'current_career'       as current_career,
  answers->'career_goal'           as career_goal,
  answers->>'grad_plans'           as grad_plans,
  answers->>'research_experience'  as research_experience,
  answers->'proof_assistants'      as proof_assistants,
  answers->'competitions'          as competitions,
  answers->>'hope_to_gain'         as hope_to_gain
from public.responses where survey = 'education';

-- The views must not be readable by the public key.
revoke all on public.demographics_flat, public.future_of_ai_flat, public.education_flat from anon, authenticated;
