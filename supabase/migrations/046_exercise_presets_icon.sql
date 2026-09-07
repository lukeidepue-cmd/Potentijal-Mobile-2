-- Migration 046: per-preset icon selection.
-- icon_set: which icon font to use ('mci' = MaterialCommunityIcons, 'ion' = Ionicons)
-- icon_name: the icon name within that font
-- Defaults match the dumbbell shown by older presets that pre-date this column.

alter table public.exercise_presets
  add column if not exists icon_set text not null default 'mci'
    check (icon_set in ('mci', 'ion')),
  add column if not exists icon_name text not null default 'dumbbell';

-- Force PostgREST (the layer the app talks to) to reload its schema cache so
-- the new columns are visible to API calls immediately, not after the next
-- automatic refresh.
notify pgrst, 'reload schema';
