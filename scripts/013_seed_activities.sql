-- PHASE 4 - Seed activities catalog (20+)
-- Safe to re-run.

-- Legacy compatibility:
-- Some old schemas include activities.group_id as NOT NULL.
-- Phase 4 does not require this column, so we relax it to allow seeding.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'activities'
      and column_name = 'group_id'
  ) then
    execute 'alter table public.activities alter column group_id drop not null';
  end if;
end
$$;

insert into public.activities (
  id,
  name,
  name_en,
  description,
  category,
  default_duration,
  min_duration,
  max_duration,
  members_required,
  selection_mode,
  requires_topic,
  topics_reusable,
  instructions,
  materials,
  icon,
  is_default,
  is_archived
)
values
  -- Ice breakers
  (
    'ice-1',
    'Two Truths and a Lie',
    'Two Truths and a Lie',
    'Chacun dit 3 phrases sur soi, 2 vraies, 1 fausse. Les autres devinent laquelle est fausse.',
    'ice_breaker',
    10, 10, 15, 3, 'manual', false, false,
    '1. Chaque participant prepare 3 affirmations sur lui-meme (2 vraies, 1 fausse)\n2. A tour de role, chacun presente ses 3 phrases\n3. Les autres participants votent pour deviner le mensonge\n4. Le participant revele la reponse et peut raconter une anecdote',
    array[]::text[],
    'smile',
    true,
    false
  ),
  (
    'ice-2',
    '20 Questions',
    '20 Questions',
    'Une personne pense a un mot, les autres ont 20 questions fermees pour deviner.',
    'ice_breaker',
    10, 10, 15, 2, 'automatic', false, false,
    '1. Un participant pense a un objet, une personne ou un lieu\n2. Les autres posent des questions OUI/NON uniquement\n3. Maximum 20 questions pour deviner\n4. Celui qui devine devient le prochain a penser',
    array[]::text[],
    'help-circle',
    true,
    false
  ),
  (
    'ice-3',
    'Word Chain',
    'Word Chain',
    'Chaque personne dit un mot qui commence par la derniere lettre du mot precedent.',
    'ice_breaker',
    10, 10, 15, 3, 'manual', false, false,
    '1. Le premier joueur dit un mot en anglais\n2. Le joueur suivant doit dire un mot commencant par la derniere lettre\n3. Pas de repetition de mots\n4. 5 secondes max pour repondre\n5. Elimination si echec, le dernier gagne',
    array[]::text[],
    'link',
    true,
    false
  ),
  (
    'ice-4',
    'Hot Seat',
    'Hot Seat',
    'Une personne s''assoit face au groupe et repond a 10 questions rapides en anglais.',
    'ice_breaker',
    15, 10, 15, 1, 'automatic', false, false,
    '1. Un participant s''assoit sur la hot seat\n2. Le groupe pose 10 questions rapides\n3. Reponses en 10 secondes max\n4. Questions fun et legeres recommandees\n5. Rotation apres chaque participant',
    array[]::text[],
    'flame',
    true,
    false
  ),
  (
    'ice-5',
    'Find Someone Who',
    'Find Someone Who',
    'Grille a remplir en interrogeant les autres participants sur leurs experiences.',
    'ice_breaker',
    15, 10, 15, 4, 'manual', false, false,
    '1. Distribuer une grille avec des criteres\n2. Les participants circulent et posent des questions\n3. Noter le nom de la personne correspondant a chaque critere\n4. Le premier a completer la grille gagne\n5. Debrief collectif',
    array[]::text[],
    'users',
    true,
    false
  ),

  -- Vocabulary
  (
    'vocab-1',
    'Taboo',
    'Taboo',
    'Faire deviner un mot sans utiliser des mots interdits associes.',
    'vocabulary',
    25, 20, 30, 4, 'manual', false, false,
    '1. Former 2 equipes\n2. Un joueur fait deviner un mot sans utiliser les mots tabous\n3. 1 minute par tour\n4. 1 point par mot devine\n5. L''equipe adverse surveille les mots interdits',
    array[]::text[],
    'message-circle-off',
    true,
    false
  ),
  (
    'vocab-2',
    'Pictionary',
    'Pictionary',
    'Dessiner un mot pour le faire deviner, les autres repondent en anglais.',
    'vocabulary',
    25, 20, 30, 4, 'manual', false, false,
    '1. Former 2 equipes\n2. Un joueur pioche un mot et le dessine\n3. Son equipe doit deviner en anglais\n4. 1 minute par dessin\n5. Alterner entre les equipes',
    array['Tableau blanc ou papier', 'Marqueurs', 'Liste de mots'],
    'pencil',
    true,
    false
  ),
  (
    'vocab-3',
    'Scattergories',
    'Scattergories',
    'Une lettre, 5 categories, 2 minutes pour trouver un mot par categorie.',
    'vocabulary',
    20, 20, 30, 2, 'manual', false, false,
    '1. Tirer une lettre au hasard\n2. Presenter 5 categories\n3. 2 minutes pour ecrire un mot par categorie\n4. Lecture des reponses\n5. Plusieurs manches possibles',
    array['Papier', 'Stylos', 'Chronometre'],
    'grid',
    true,
    false
  ),
  (
    'vocab-4',
    'Vocabulary Auction',
    'Vocabulary Auction',
    'Encherir sur des definitions, certaines sont correctes et d''autres non.',
    'vocabulary',
    25, 20, 30, 3, 'manual', false, false,
    '1. Chaque equipe recoit un budget fictif\n2. L''animateur presente des definitions\n3. Les equipes encherissent\n4. Les definitions correctes rapportent la mise\n5. L''equipe la plus riche gagne',
    array[]::text[],
    'gavel',
    true,
    false
  ),
  (
    'vocab-5',
    'Charades',
    'Charades',
    'Mimer un film, un metier, une action, les autres devinent en anglais.',
    'vocabulary',
    25, 20, 30, 4, 'automatic', false, false,
    '1. Former 2 equipes\n2. Un joueur pioche un mot ou une phrase et le mime\n3. Son equipe devine en anglais\n4. 2 minutes maximum par mime\n5. Alterner entre les equipes',
    array[]::text[],
    'theater',
    true,
    false
  ),

  -- Conversation
  (
    'conv-1',
    'Speed Friending',
    'Speed Friending',
    'Rotation de binomes toutes les 4 minutes avec une question imposee.',
    'conversation',
    40, 30, 50, 6, 'manual', true, true,
    '1. Placer les participants en 2 rangees face a face\n2. Donner une question de discussion a chaque round\n3. 4 minutes de conversation par binome\n4. Au signal, une rangee se decale d''une place\n5. Nouvelle question, nouveau partenaire',
    array[]::text[],
    'timer',
    true,
    false
  ),
  (
    'conv-2',
    'Fishbowl Discussion',
    'Fishbowl Discussion',
    '4 personnes debattent au centre, les autres ecoutent puis prennent la releve.',
    'conversation',
    45, 30, 50, 6, 'semi-automatic', true, true,
    '1. 4 participants s''assoient au centre\n2. Ils debattent du sujet pendant 10 minutes\n3. Les observateurs ecoutent\n4. Rotation en tapant l''epaule\n5. Continuer jusqu''a participation de tous',
    array[]::text[],
    'circle',
    true,
    false
  ),
  (
    'conv-3',
    'Role Play',
    'Role Play',
    'Scenarios imposes: client difficile, negociation, plainte a l''hotel, etc.',
    'conversation',
    40, 30, 50, 2, 'automatic', true, true,
    '1. Former des binomes ou petits groupes\n2. Distribuer les scenarios et roles\n3. 5 minutes de preparation\n4. 10 minutes de jeu de role\n5. Feedback du groupe',
    array[]::text[],
    'theater',
    true,
    false
  ),
  (
    'conv-4',
    'Desert Island',
    'Desert Island',
    'Le groupe doit se mettre d''accord sur 5 objets a emporter sur une ile deserte.',
    'conversation',
    35, 30, 45, 4, 'manual', false, false,
    '1. Presenter le scenario\n2. Fournir une liste de 15 objets\n3. Le groupe doit choisir seulement 5 objets\n4. Debattre et argumenter en anglais\n5. Consensus obligatoire',
    array[]::text[],
    'palmtree',
    true,
    false
  ),
  (
    'conv-5',
    'Mock Business Meeting',
    'Mock Business Meeting',
    'Simulation de reunion professionnelle en anglais sur un projet fictif.',
    'conversation',
    45, 30, 50, 4, 'semi-automatic', true, true,
    '1. Distribuer les roles\n2. Presenter l''ordre du jour\n3. Conduire la reunion en anglais\n4. Prendre des decisions\n5. Rediger un compte-rendu rapide',
    array['Cartes de roles', 'Ordre du jour', 'Template de compte-rendu'],
    'briefcase',
    true,
    false
  ),

  -- Comprehension
  (
    'comp-1',
    'Podcast Snippet',
    'Podcast Snippet',
    'Ecoute d''un extrait puis discussion de comprehension.',
    'comprehension',
    30, 20, 40, 2, 'manual', true, false,
    '1. Jouer l''extrait audio\n2. Premiere ecoute sans notes\n3. Deuxieme ecoute avec notes\n4. Questions de comprehension\n5. Discussion ouverte',
    array['Extrait audio', 'Questions preparees', 'Enceinte ou ecouteurs'],
    'headphones',
    true,
    false
  ),
  (
    'comp-2',
    'TED-Ed Analysis',
    'TED-Ed Analysis',
    'Video courte suivie de questions et discussion de groupe.',
    'comprehension',
    35, 25, 40, 2, 'manual', true, false,
    '1. Introduire le sujet de la video\n2. Regarder la video\n3. Questions de comprehension\n4. Analyse des arguments\n5. Debat final',
    array['Video TED-Ed', 'Projecteur', 'Questions'],
    'video',
    true,
    false
  ),
  (
    'comp-3',
    'News Headline Reading',
    'News Headline Reading',
    'Titres d''actualite en anglais, chaque membre resume un article.',
    'comprehension',
    30, 20, 35, 3, 'automatic', false, false,
    '1. Presenter 3 articles\n2. Chaque participant choisit un article\n3. Lecture silencieuse\n4. Resume oral\n5. Questions et discussion',
    array['Articles imprimes ou liens', 'Chronometre'],
    'newspaper',
    true,
    false
  ),
  (
    'comp-4',
    'Song Lyrics Gap Fill',
    'Song Lyrics Gap Fill',
    'Texte a trous d''une chanson anglaise que le groupe complete a l''ecoute.',
    'comprehension',
    25, 20, 30, 2, 'manual', false, false,
    '1. Distribuer les paroles a trous\n2. Premiere ecoute\n3. Deuxieme ecoute\n4. Correction collective\n5. Discussion sur le sens',
    array['Paroles a trous', 'Chanson audio', 'Enceinte'],
    'music',
    true,
    false
  ),

  -- Writing
  (
    'write-1',
    'One-Minute Writing',
    'One-Minute Writing',
    'Ecrire sans s''arreter pendant 60 secondes sur un sujet donne.',
    'writing',
    10, 10, 15, 1, 'manual', true, true,
    '1. Donner un sujet\n2. Ecrire sans interruption 60 secondes\n3. Pas de correction\n4. Lecture volontaire\n5. Feedback positif',
    array['Papier', 'Stylos', 'Chronometre'],
    'edit',
    true,
    false
  ),
  (
    'write-2',
    'Six-Word Story',
    'Six-Word Story',
    'Raconter une histoire complete en exactement 6 mots.',
    'writing',
    10, 10, 15, 1, 'manual', true, true,
    '1. Expliquer le concept\n2. Donner un theme\n3. 5 minutes d''ecriture\n4. Lecture des histoires\n5. Vote du groupe',
    array['Papier', 'Stylos'],
    'file-text',
    true,
    false
  ),
  (
    'write-3',
    'Haiku Tech',
    'Haiku Tech',
    'Composer un haiku en anglais sur un mot tech (5-7-5 syllabes).',
    'writing',
    10, 10, 15, 1, 'manual', true, true,
    '1. Expliquer la structure haiku 5-7-5\n2. Donner un mot tech\n3. 5 minutes pour composer\n4. Lecture des haikus\n5. Discussion rapide',
    array['Papier', 'Stylos'],
    'sparkles',
    true,
    false
  ),
  (
    'write-4',
    'Tweet That Idea',
    'Tweet That Idea',
    'Resumer une idee complexe en 280 caracteres maximum en anglais.',
    'writing',
    10, 10, 15, 1, 'manual', true, true,
    '1. Presenter une idee complexe\n2. Defi: 280 caracteres max\n3. 5 minutes d''ecriture\n4. Partage des tweets\n5. Debrief sur la clarte',
    array['Papier', 'Stylos'],
    'message-square',
    true,
    false
  )
on conflict (id) do update
set
  name = excluded.name,
  name_en = excluded.name_en,
  description = excluded.description,
  category = excluded.category,
  default_duration = excluded.default_duration,
  min_duration = excluded.min_duration,
  max_duration = excluded.max_duration,
  members_required = excluded.members_required,
  selection_mode = excluded.selection_mode,
  requires_topic = excluded.requires_topic,
  topics_reusable = excluded.topics_reusable,
  instructions = excluded.instructions,
  materials = excluded.materials,
  icon = excluded.icon,
  is_default = excluded.is_default;
