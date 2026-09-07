// lib/api/presets.ts
// User-defined exercise presets. Replaces the old fixed sport-mode preset buttons.

import { supabase } from '../supabase';
import { DEFAULT_PRESET_COLOR, type PresetColorKey } from '../../constants/preset-cosmetics';

/** Which icon font a preset icon comes from. */
export type IconSet = 'mci' | 'ion';

export interface ExercisePreset {
  id: string;
  name: string;
  statNames: string[]; // 2..5 entries
  iconSet: IconSet;
  iconName: string;
  color: PresetColorKey;
  createdAt: string;
  updatedAt: string;
}

interface PresetRow {
  id: string;
  name: string;
  stat_names: string[];
  icon_set?: IconSet | null;
  icon_name?: string | null;
  color?: string | null;
  created_at: string;
  updated_at: string;
}

function rowToPreset(row: PresetRow): ExercisePreset {
  return {
    id: row.id,
    name: row.name,
    statNames: row.stat_names,
    // Defaults match the schema defaults — kept here as a safety net in case
    // a row exists from before migration 046/048 or the columns weren't populated.
    iconSet: row.icon_set ?? 'mci',
    iconName: row.icon_name ?? 'dumbbell',
    color: (row.color as PresetColorKey | undefined) ?? DEFAULT_PRESET_COLOR,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Returns the current user's presets, most recently created first. */
export async function listPresets(): Promise<{ data: ExercisePreset[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }
    const { data, error } = await supabase
      .from('exercise_presets')
      .select('id, name, stat_names, icon_set, icon_name, color, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) return { data: null, error };
    return { data: (data || []).map(rowToPreset), error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/** Create a preset. statNames must have 2..5 trimmed, non-empty entries.
 *  iconSet/iconName/color all default to the green dumbbell if omitted. */
export async function createPreset(params: {
  name: string;
  statNames: string[];
  iconSet?: IconSet;
  iconName?: string;
  color?: PresetColorKey;
}): Promise<{ data: ExercisePreset | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const name = params.name.trim();
    const statNames = params.statNames.map(s => s.trim()).filter(Boolean);

    if (!name) {
      return { data: null, error: { message: 'Preset name is required' } };
    }
    if (statNames.length < 2 || statNames.length > 5) {
      return { data: null, error: { message: 'A preset must have 2 to 5 statistics' } };
    }

    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      name,
      stat_names: statNames,
      icon_set: params.iconSet ?? 'mci',
      icon_name: params.iconName ?? 'dumbbell',
      color: params.color ?? DEFAULT_PRESET_COLOR,
    };

    const { data, error } = await supabase
      .from('exercise_presets')
      .insert(insertPayload)
      .select('id, name, stat_names, icon_set, icon_name, color, created_at, updated_at')
      .single();

    if (error) return { data: null, error };
    return { data: rowToPreset(data as PresetRow), error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/** Delete a preset by id. */
export async function deletePreset(id: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('exercise_presets')
      .delete()
      .eq('id', id);
    return { error };
  } catch (error: any) {
    return { error };
  }
}
