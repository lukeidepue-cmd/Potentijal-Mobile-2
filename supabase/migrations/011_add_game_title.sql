-- Migration 011: Add title field to games table
-- Allows users to add a title/name to their games for easier searching

alter table public.games
add column if not exists title text;

-- Add index for searching games by title
create index if not exists idx_games_title on public.games(title);

-- Add comment
comment on column public.games.title is 'Optional title/name for the game (e.g., "Championship Game", "vs Lakers")';

