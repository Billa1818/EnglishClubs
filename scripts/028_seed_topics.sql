-- PHASE 9 - Seed topics catalog
-- Safe to re-run.

with seed(id, activity_ref, title, description, level) as (
  values
    ('topic-001', 'conv-1', 'Describe your dream job', 'Explain what you want to do, why, and what skills are needed.', 'beginner'),
    ('topic-002', 'conv-1', 'City life or village life', 'Compare the advantages and disadvantages of both lifestyles.', 'intermediate'),
    ('topic-003', 'conv-2', 'Should remote work stay permanent?', 'Discuss productivity, collaboration, and work-life balance.', 'advanced'),
    ('topic-004', 'conv-2', 'Is social media helping communication?', 'Debate social connection versus distraction and misinformation.', 'intermediate'),
    ('topic-005', 'conv-3', 'At the airport: delay and rebooking', 'Role-play a discussion between a passenger and an airline agent.', 'beginner'),
    ('topic-006', 'conv-3', 'Hotel complaint scenario', 'Role-play a customer who reports a service issue politely.', 'beginner'),
    ('topic-007', 'conv-5', 'Launch a new product in your city', 'Simulate a meeting to define market, budget, and promotion plan.', 'advanced'),
    ('topic-008', 'conv-5', 'Improve customer support process', 'Discuss team roles and propose a clear action plan.', 'intermediate'),
    ('topic-009', 'comp-1', 'Podcast: habits of successful learners', 'Listen and identify key ideas, examples, and practical advice.', 'intermediate'),
    ('topic-010', 'comp-2', 'Video: AI in everyday life', 'Analyze the main arguments and possible social impacts.', 'advanced'),
    ('topic-011', 'write-1', 'One minute: my proudest moment', 'Write quickly about a moment you are proud of and why.', 'beginner'),
    ('topic-012', 'write-1', 'One minute: what I learned this week', 'Summarize one personal lesson from this week.', 'beginner'),
    ('topic-013', 'write-2', 'Six-word story: friendship', 'Write a complete story in six words around friendship.', 'intermediate'),
    ('topic-014', 'write-3', 'Haiku about technology', 'Write a 5-7-5 haiku around a modern digital tool.', 'advanced'),
    ('topic-015', 'write-4', 'Tweet challenge: climate action', 'Summarize one concrete climate action in 280 characters.', 'intermediate')
)
insert into public.topics (
  id,
  activity_id,
  title,
  description,
  level,
  is_archived,
  usage_count
)
select
  seed.id,
  activity.id,
  seed.title,
  seed.description,
  seed.level,
  false,
  0
from seed
left join public.activities activity on activity.id = seed.activity_ref
on conflict (id) do update
set
  activity_id = excluded.activity_id,
  title = excluded.title,
  description = excluded.description,
  level = excluded.level,
  is_archived = excluded.is_archived;
