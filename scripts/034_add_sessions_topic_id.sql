-- Add optional topic reference on sessions
-- Safe to re-run.

alter table public.sessions
  add column if not exists topic_id text;

-- Align topic_id type with topics.id when needed.
do $$
declare
  topics_id_type text;
  sessions_topic_id_type text;
begin
  select data_type
  into topics_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'topics'
    and column_name = 'id';

  select data_type
  into sessions_topic_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'sessions'
    and column_name = 'topic_id';

  if topics_id_type = 'uuid' and sessions_topic_id_type <> 'uuid' then
    execute 'alter table public.sessions alter column topic_id type uuid using nullif(btrim(topic_id), '''')::uuid';
  elsif topics_id_type = 'text' and sessions_topic_id_type <> 'text' then
    execute 'alter table public.sessions alter column topic_id type text using topic_id::text';
  end if;
end
$$;

-- FK sessions.topic_id -> topics.id
DO $$
BEGIN
  IF to_regclass('public.topics') is not null AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sessions_topic_id_fkey'
      AND conrelid = 'public.sessions'::regclass
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_topic_id_fkey
      FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE SET NULL;
  END IF;
END
$$;

create index if not exists idx_sessions_topic_id
  on public.sessions(topic_id);
