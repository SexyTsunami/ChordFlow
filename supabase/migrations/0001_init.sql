-- ChordFlow schema
--
-- Every table is scoped to auth.uid() through a user_id column and protected
-- by row level security, so personal playlists, arrangements and practice
-- notes are only ever visible to their owner. The service-role key bypasses
-- RLS by design and must never be exposed to the browser.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- helpers

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------- catalogue

create table if not exists public.artists (
  id            text primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  name_zh_hans  text,
  pinyin        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.albums (
  id            text primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null,
  title_zh_hans text,
  pinyin        text,
  artist_id     text references public.artists (id) on delete set null,
  release_year  integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.songs (
  id                 text primary key,
  user_id            uuid not null references auth.users (id) on delete cascade,
  title              text not null,
  title_zh_hans      text,
  title_pinyin       text,
  title_en           text,
  artist             text not null default '',
  artist_zh_hans     text,
  artist_pinyin      text,
  album              text,
  album_zh_hans      text,
  release_year       integer,
  original_key       text,
  difficulty         text check (difficulty in ('beginner','easy','intermediate','advanced')),
  source_url         text,
  arrangement_status text not null default 'unavailable'
                     check (arrangement_status in ('verified','user','ai-estimate','unavailable')),
  tags               text[] not null default '{}',
  origin             text not null default 'user' check (origin in ('seed','import','user')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists songs_user_idx on public.songs (user_id);
create index if not exists songs_title_idx on public.songs (user_id, title);
create index if not exists songs_artist_idx on public.songs (user_id, artist);

-- ------------------------------------------------------------- playlists

create table if not exists public.playlists (
  id                 text primary key,
  user_id            uuid not null references auth.users (id) on delete cascade,
  name               text not null,
  description        text,
  source             text not null default 'manual'
                     check (source in ('local','spotify','youtube','manual','csv','seed')),
  source_url         text,
  external_id        text,
  owner              text,
  image_url          text,
  track_count        integer not null default 0,
  duplicates_removed integer not null default 0,
  import_warnings    text[] not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists playlists_user_idx on public.playlists (user_id, updated_at desc);

create table if not exists public.playlist_tracks (
  id               text primary key,
  user_id          uuid not null references auth.users (id) on delete cascade,
  playlist_id      text not null references public.playlists (id) on delete cascade,
  position         integer not null,
  title            text not null,
  artist           text not null default '',
  album            text,
  duration_ms      integer,
  external_id      text,
  external_url     text,
  song_id          text references public.songs (id) on delete set null,
  match_status     text not null default 'unmatched'
                   check (match_status in ('matched','probable','unmatched','unavailable')),
  match_confidence real,
  is_unavailable   boolean not null default false,
  note             text,
  created_at       timestamptz not null default now()
);

create index if not exists playlist_tracks_playlist_idx
  on public.playlist_tracks (playlist_id, position);

-- ---------------------------------------------------------- arrangements

create table if not exists public.chord_arrangements (
  id                  text primary key,
  user_id             uuid not null references auth.users (id) on delete cascade,
  song_id             text not null,
  title               text not null default 'Arrangement',
  status              text not null default 'user'
                      check (status in ('verified','user','ai-estimate','unavailable')),
  source_kind         text not null default 'user'
                      check (source_kind in ('demo','user','provider','ai','import')),
  source_name         text,
  source_url          text,
  source_attribution  text,
  original_key        text,
  capo                integer not null default 0 check (capo between 0 and 12),
  tuning              text[] not null default array['E','A','D','G','B','E'],
  tuning_name         text not null default 'Standard',
  bpm                 integer check (bpm is null or bpm between 20 and 300),
  time_signature      text not null default '4/4',
  difficulty          text check (difficulty in ('beginner','easy','intermediate','advanced')),
  notes               text,
  lyrics_rights       text not null default 'unavailable'
                      check (lyrics_rights in ('original-sample','user-provided','licensed-provider','unavailable')),
  lyrics_attribution  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists arrangements_song_idx
  on public.chord_arrangements (user_id, song_id);

create table if not exists public.arrangement_sections (
  id             text primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  arrangement_id text not null references public.chord_arrangements (id) on delete cascade,
  position       integer not null,
  type           text not null default 'verse',
  label          text,
  repeat_count   integer
);

create index if not exists arrangement_sections_parent_idx
  on public.arrangement_sections (arrangement_id, position);

create table if not exists public.arrangement_lines (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  section_id  text not null references public.arrangement_sections (id) on delete cascade,
  position    integer not null,
  text        text not null default '',
  pinyin      text,
  translation text,
  note        text
);

create index if not exists arrangement_lines_parent_idx
  on public.arrangement_lines (section_id, position);

create table if not exists public.chord_events (
  id        text primary key,
  user_id   uuid not null references auth.users (id) on delete cascade,
  line_id   text not null references public.arrangement_lines (id) on delete cascade,
  chord     text not null,
  "offset"  integer not null default 0 check ("offset" >= 0)
);

create index if not exists chord_events_parent_idx
  on public.chord_events (line_id, "offset");

-- ------------------------------------------------------ lyric documents

create table if not exists public.lyric_documents (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  song_id     text not null,
  language    text not null default 'zh-Hant'
              check (language in ('zh-Hant','zh-Hans','en','pinyin','other')),
  rights      text not null default 'user-provided'
              check (rights in ('original-sample','user-provided','licensed-provider','unavailable')),
  provider    text,
  attribution text,
  source_url  text,
  body        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists lyric_documents_song_idx
  on public.lyric_documents (user_id, song_id);

-- ------------------------------------------------------------ user state

create table if not exists public.favorites (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  song_id    text not null,
  created_at timestamptz not null default now(),
  unique (user_id, song_id)
);

create table if not exists public.recent_plays (
  user_id   uuid not null references auth.users (id) on delete cascade,
  song_id   text not null,
  opened_at timestamptz not null default now(),
  progress  real not null default 0,
  primary key (user_id, song_id)
);

create index if not exists recent_plays_time_idx
  on public.recent_plays (user_id, opened_at desc);

create table if not exists public.practice_sessions (
  id               text primary key,
  user_id          uuid not null references auth.users (id) on delete cascade,
  song_id          text not null,
  arrangement_id   text,
  started_at       timestamptz not null default now(),
  duration_seconds integer not null default 0,
  bpm              integer,
  transpose        integer not null default 0,
  capo             integer not null default 0,
  completed        boolean not null default false,
  notes            text
);

create index if not exists practice_sessions_song_idx
  on public.practice_sessions (user_id, song_id, started_at desc);

create table if not exists public.user_preferences (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  font_scale          real not null default 1,
  show_pinyin         boolean not null default false,
  show_chord_diagrams boolean not null default true,
  plain_mode          boolean not null default false,
  scroll_speed        real not null default 36,
  metronome_bpm       integer not null default 80,
  metronome_accent    integer not null default 4,
  prefer_flats        boolean not null default false,
  last_song_id        text,
  updated_at          timestamptz not null default now()
);

-- ------------------------------------------------------- updated_at hooks

do $$
declare
  t text;
begin
  foreach t in array array[
    'artists','albums','songs','playlists','chord_arrangements',
    'lyric_documents'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t, t);
  end loop;
end;
$$;

-- --------------------------------------------------- row level security

do $$
declare
  t text;
begin
  foreach t in array array[
    'artists','albums','songs','playlists','playlist_tracks',
    'chord_arrangements','arrangement_sections','arrangement_lines',
    'chord_events','lyric_documents','favorites','recent_plays',
    'practice_sessions','user_preferences'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "owner_select" on public.%I;', t);
    execute format('drop policy if exists "owner_insert" on public.%I;', t);
    execute format('drop policy if exists "owner_update" on public.%I;', t);
    execute format('drop policy if exists "owner_delete" on public.%I;', t);

    execute format(
      'create policy "owner_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format(
      'create policy "owner_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format(
      'create policy "owner_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format(
      'create policy "owner_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end;
$$;
