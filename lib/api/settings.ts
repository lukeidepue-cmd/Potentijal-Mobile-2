/**
 * Settings API
 * All functions for managing user settings, preferences, privacy, and account management
 */

import { supabase } from '../supabase';
import { deleteContact } from './loops';

// =====================================================
// Types & Interfaces
// =====================================================

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  units_weight: 'lbs' | 'kg';
  units_distance: 'miles' | 'km';
  language: string | null;
  date_format: string | null;
  default_workout_mode: string | null;
  weekly_goal_reset_day: number | null;
  progress_graph_default_time_range: string;
  progress_graph_default_metric_per_sport: Record<string, string>;
  auto_archive_old_workouts: boolean;
  show_practices: boolean;
  show_games: boolean;
  notification_preferences: {
    push_enabled: boolean;
    workout_reminders: boolean;
    practice_reminders: boolean;
    goal_reminders: boolean;
    social_follower: boolean;
    social_highlight_views: boolean;
    ai_trainer_insights: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface PrivacySettings {
  id: string;
  user_id: string;
  is_private_account: boolean;
  who_can_see_profile: 'everyone' | 'followers' | 'none';
  who_can_see_highlights: 'everyone' | 'followers' | 'none';
  who_can_find_me: 'everyone' | 'followers' | 'none';
  who_can_follow_me: 'everyone' | 'none';
  suggest_me_to_others: boolean;
  email_visibility: 'public' | 'private';
  created_at: string;
  updated_at: string;
}

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  blocked_profile?: {
    id: string;
    username: string;
    display_name: string;
    profile_image_url: string | null;
  };
}

export interface AITrainerSettings {
  id: string;
  user_id: string;
  enabled: boolean;
  personality: 'strict' | 'balanced' | 'supportive';
  data_access_permissions: {
    use_workouts: boolean;
    use_games: boolean;
    use_practices: boolean;
  };
  injury_limitation_notes: string | null;
  persistent_memory_enabled: boolean;
  ai_memory_notes: any[];
  created_at: string;
  updated_at: string;
}

// NutritionSettings removed - meals feature removed from app

// =====================================================
// User Preferences Functions
// =====================================================

/**
 * Get user preferences (creates default if doesn't exist)
 */
export async function getUserPreferences(): Promise<{ data: UserPreferences | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Try to get existing preferences
    let { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // If doesn't exist, create default
    if (error && error.code === 'PGRST116') {
      const { data: newData, error: insertError } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) {
        return { data: null, error: insertError };
      }

      return { data: newData as UserPreferences, error: null };
    }

    if (error) {
      return { data: null, error };
    }

    return { data: data as UserPreferences, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  updates: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{ data: boolean | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Ensure preferences exist first
    await getUserPreferences();

    const { error } = await supabase
      .from('user_preferences')
      .update(updates)
      .eq('user_id', user.id);

    if (error) {
      return { data: null, error };
    }

    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

// =====================================================
// Privacy Settings Functions
// =====================================================

/**
 * Get privacy settings (creates default if doesn't exist)
 */
export async function getPrivacySettings(): Promise<{ data: PrivacySettings | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    let { data, error } = await supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Create default if doesn't exist
    if (error && error.code === 'PGRST116') {
      const { data: newData, error: insertError } = await supabase
        .from('user_privacy_settings')
        .insert({
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) {
        return { data: null, error: insertError };
      }

      return { data: newData as PrivacySettings, error: null };
    }

    if (error) {
      return { data: null, error };
    }

    return { data: data as PrivacySettings, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Update privacy settings
 */
export async function updatePrivacySettings(
  updates: Partial<Omit<PrivacySettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{ data: boolean | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Ensure privacy settings exist first
    const { data: existingSettings, error: getError } = await getPrivacySettings();
    if (getError && getError.code !== 'PGRST116') {
      // PGRST116 is "not found" - we'll create it
    }

    let error;
    let resultData;
    if (existingSettings) {
      const { data: updateData, error: updateError } = await supabase
        .from('user_privacy_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single(); // Get updated data to verify
      error = updateError;
      resultData = updateData;
    } else {
      const { data: insertData, error: insertError } = await supabase
        .from('user_privacy_settings')
        .insert({
          user_id: user.id,
          ...updates,
        })
        .select()
        .single(); // Get inserted data to verify
      error = insertError;
      resultData = insertData;
    }

    if (error) {
      return { data: null, error };
    }

    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

// =====================================================
// Blocked Users Functions
// =====================================================

/**
 * Get all blocked users for current user
 */
export async function getBlockedUsers(): Promise<{ data: BlockedUser[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('blocked_users')
      .select(`
        *,
        blocked_profile:profiles!blocked_users_blocked_id_fkey (
          id,
          username,
          display_name,
          profile_image_url
        )
      `)
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error };
    }

    return { data: data as BlockedUser[], error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Block a user
 */
export async function blockUser(blockedUserId: string): Promise<{ data: boolean | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    if (user.id === blockedUserId) {
      return { data: null, error: { message: 'Cannot block yourself' } };
    }

    const { error } = await supabase
      .from('blocked_users')
      .insert({
        blocker_id: user.id,
        blocked_id: blockedUserId,
      });

    if (error) {
      // Ignore duplicate key errors (already blocked)
      if (error.code === '23505') {
        return { data: true, error: null };
      }
      return { data: null, error };
    }

    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(blockedUserId: string): Promise<{ data: boolean | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedUserId);

    if (error) {
      return { data: null, error };
    }

    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Check if a user is blocked by current user
 */
export async function isUserBlocked(userId: string): Promise<{ data: boolean; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: false, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      return { data: false, error: null };
    }

    if (error) {
      return { data: false, error };
    }

    return { data: !!data, error: null };
  } catch (error: any) {
    return { data: false, error };
  }
}

// =====================================================
// AI Trainer Settings Functions
// =====================================================

/**
 * Get AI trainer settings (creates default if doesn't exist)
 */
export async function getAITrainerSettings(): Promise<{ data: AITrainerSettings | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    let { data, error } = await supabase
      .from('ai_trainer_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Create default if doesn't exist
    if (error && error.code === 'PGRST116') {
      const { data: newData, error: insertError } = await supabase
        .from('ai_trainer_settings')
        .insert({
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) {
        return { data: null, error: insertError };
      }

      return { data: newData as AITrainerSettings, error: null };
    }

    if (error) {
      return { data: null, error };
    }

    return { data: data as AITrainerSettings, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Update AI trainer settings
 */
export async function updateAITrainerSettings(
  updates: Partial<Omit<AITrainerSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{ data: boolean | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    await getAITrainerSettings(); // Ensure exists

    const { error } = await supabase
      .from('ai_trainer_settings')
      .update(updates)
      .eq('user_id', user.id);

    if (error) {
      return { data: null, error };
    }

    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Clear AI memory
 */
export async function clearAIMemory(): Promise<{ data: boolean | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { error } = await supabase
      .from('ai_trainer_settings')
      .update({ ai_memory_notes: [] })
      .eq('user_id', user.id);

    if (error) {
      return { data: null, error };
    }

    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

// =====================================================
// Nutrition Settings Functions
// =====================================================

// Nutrition settings functions removed - meals feature removed from app

// =====================================================
// Account Management Functions
// =====================================================

/**
 * Update user email
 */
export async function updateEmail(newEmail: string): Promise<{ data: boolean | null; error: any }> {
  try {
    // Basic validation
    if (!newEmail || !newEmail.trim()) {
      return { data: null, error: { message: 'Please enter an email address' } };
    }

    const trimmedEmail = newEmail.trim().toLowerCase();
    
    // More comprehensive email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { data: null, error: { message: 'Please enter a valid email address format (e.g., user@example.com)' } };
    }
    
    // Additional structure validation
    const atIndex = trimmedEmail.indexOf('@');
    const lastDotIndex = trimmedEmail.lastIndexOf('.');
    if (atIndex < 1 || lastDotIndex < atIndex + 2 || lastDotIndex === trimmedEmail.length - 1) {
      return { data: null, error: { message: 'Please enter a valid email address format' } };
    }

    // Get current user to check current email
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Check if email is the same as current
    if (user.email && user.email.toLowerCase() === trimmedEmail) {
      return { data: null, error: { message: 'This is already your current email address' } };
    }

    // Call Supabase to update email
    // Note: If "Secure email change" is disabled in Supabase, the email will update immediately
    // If it's enabled, the email will be pending until confirmation
    const { data: updateData, error } = await supabase.auth.updateUser({
      email: trimmedEmail,
    });

    if (error) {
      // Better error message handling - don't assume "invalid" means format
      let errorMessage = error.message || 'Failed to update email';
      
      // Handle specific Supabase error codes and messages
      if (error.code === 'email_address_invalid') {
        // Supabase is rejecting the email - this could be:
        // 1. The current email is invalid and Supabase won't let you update from an invalid email
        // 2. The new email format is invalid according to Supabase's stricter rules
        // 3. Supabase has domain restrictions configured
        // 4. Supabase requires email confirmation and the current email isn't confirmed
        
        // Check if current email might be the problem (unconfirmed or invalid domain)
        if (user.email && !user.email_confirmed_at) {
          errorMessage = 'Your current email address is not confirmed. Please check your email and confirm it first, then try updating to a new email.';
        } else if (user.email && (user.email.includes('@example.com') || user.email.includes('@test.com'))) {
          errorMessage = 'Your current email address uses a test domain. Supabase may not allow email updates from test domains. Please contact support.';
        } else if (trimmedEmail.includes('@example.com') || 
                   trimmedEmail.includes('@test.com') ||
                   trimmedEmail.includes('@localhost')) {
          errorMessage = 'Test email domains (like @example.com) are not allowed. Please use a real email address.';
        } else {
          // Real email domain but still rejected - could be Supabase configuration or current email issue
          errorMessage = `Email update failed. Supabase rejected the email address. This may be due to: (1) Your current email is invalid/unconfirmed, (2) Supabase email validation rules, or (3) Rate limiting. Please try again later or contact support.`;
        }
      } else if (error.message?.toLowerCase().includes('already registered') || 
                 error.message?.toLowerCase().includes('already exists') ||
                 error.message?.toLowerCase().includes('user already registered') ||
                 error.message?.toLowerCase().includes('email already registered')) {
        errorMessage = 'This email address is already registered to another account';
      } else if (error.message?.toLowerCase().includes('rate limit') ||
                 error.message?.toLowerCase().includes('too many')) {
        errorMessage = 'Too many requests. Please try again later';
      } else if (error.message?.toLowerCase().includes('email change') ||
                 error.message?.toLowerCase().includes('confirmation')) {
        errorMessage = 'Email change is already in progress. Please check your email for confirmation.';
      } else if (error.message?.toLowerCase().includes('invalid') && 
                 (error.message?.toLowerCase().includes('token') ||
                  error.message?.toLowerCase().includes('session') ||
                  error.message?.toLowerCase().includes('expired'))) {
        // This is a token/session issue, not a format issue
        errorMessage = 'Your session has expired. Please log out and log back in, then try again.';
      } else if (error.message?.toLowerCase().includes('invalid')) {
        // Generic invalid error
        errorMessage = 'Invalid email address. Please check the format and try again.';
      }
      
      return { data: null, error: { message: errorMessage, originalError: error } };
    }
    
    // Check if the update was actually successful by verifying the response
    if (updateData?.user) {
      const updatedEmail = updateData.user.email;
      const newEmail = updateData.user.new_email; // Supabase might store new email here if confirmation is required
      
      if (updatedEmail && updatedEmail.toLowerCase() === trimmedEmail.toLowerCase()) {
        return { data: true, error: null };
      } else if (newEmail && newEmail.toLowerCase() === trimmedEmail.toLowerCase()) {
        return { data: true, error: null, requiresConfirmation: true };
      } else {
        return { data: true, error: null, requiresConfirmation: true };
      }
    } else {
      return { data: true, error: null, requiresConfirmation: true };
    }

    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message || 'Failed to update email' } };
  }
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string): Promise<{ data: boolean | null; error: any }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { data: null, error };
    }

    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Delete user account
 * Uses a database function to delete the profile and all related data
 * Then calls Edge Function to delete the auth user (which frees up the email)
 */
export async function deleteAccount(): Promise<{ data: boolean | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const userId = user.id;

    const { error: deleteError } = await supabase.rpc('delete_user_account');
    if (deleteError) {
      return { data: null, error: { message: deleteError.message || 'Failed to delete account' } };
    }

    const userEmail = user.email;
    if (userEmail) {
      deleteContact(userEmail).then(() => {});
    }

    const { error: authDeleteError } = await supabase.functions.invoke('delete-auth-user', {
      body: { userId }
    });
    (void) authDeleteError;

    await supabase.auth.signOut();

    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.clear();
    } catch (_storageError) {}

    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message || 'Failed to delete account' } };
  }
}

/**
 * Log out of all devices
 * Note: This requires invalidating all sessions - may need backend support
 */
export async function logoutAllDevices(): Promise<{ data: boolean | null; error: any }> {
  try {
    // For now, we'll just sign out the current session
    // Full implementation would require backend support to invalidate all tokens
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { data: null, error };
    }

    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

// =====================================================
// Sports Management Functions
// =====================================================

/**
 * Get user's sports from profile
 */
export async function getUserSports(): Promise<{ data: string[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('sports, primary_sport')
      .eq('id', user.id)
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: data.sports || [], error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Add sports to user's profile (premium check should be done in frontend)
 */
export async function addSports(sports: string[]): Promise<{ data: boolean | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get current sports
    const { data: currentData } = await supabase
      .from('profiles')
      .select('sports')
      .eq('id', user.id)
      .single();

    const currentSports = currentData?.sports || [];
    const newSports = [...new Set([...currentSports, ...sports])]; // Merge and dedupe

    const { error } = await supabase
      .from('profiles')
      .update({ sports: newSports })
      .eq('id', user.id);

    if (error) {
      return { data: null, error };
    }

    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Reorder sports (set new order and primary sport)
 */
export async function reorderSports(sports: string[], primarySport?: string): Promise<{ data: boolean | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Ensure primary sport is in the sports array and move it to the front
    let reorderedSports = [...sports];
    if (primarySport) {
      // Remove primary sport from array if it exists
      reorderedSports = reorderedSports.filter(s => s !== primarySport);
      // Add primary sport to the front
      reorderedSports = [primarySport, ...reorderedSports];
    }

    const updateData: any = { 
      sports: reorderedSports,
      primary_sport: primarySport || (reorderedSports.length > 0 ? reorderedSports[0] : null)
    };

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (error) {
      return { data: null, error };
    }

    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

// =====================================================
// Premium & Codes Functions
// =====================================================

/**
 * Redeem a promoter code
 */
export type RedeemCodeResult = {
  data: { type: string; message: string; offer_identifier?: string } | null;
  error: any;
};
export async function redeemCode(code: string): Promise<RedeemCodeResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Check if code exists and is active
    const { data: codeData, error: codeError } = await supabase
      .from('promoter_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (codeError || !codeData) {
      return { data: null, error: { message: 'Invalid or inactive code' } };
    }

    // Check if user already used this code
    const { data: existingUse } = await supabase
      .from('profile_code_uses')
      .select('id')
      .eq('profile_id', user.id)
      .eq('promoter_code_id', codeData.id)
      .single();

    if (existingUse) {
      return { data: null, error: { message: 'Code already used' } };
    }

    // Record code use only for creator_signup (they get the benefit immediately).
    // For premium_discount we record use only after a successful purchase (see recordPromoterCodeUseAfterPurchase).
    if (codeData.type === 'creator_signup') {
      const { error: useError } = await supabase
        .from('profile_code_uses')
        .insert({
          profile_id: user.id,
          promoter_code_id: codeData.id,
        });

      if (useError) {
        return { data: null, error: useError };
      }
    }

    // Apply code benefits based on type
    if (codeData.type === 'creator_signup') {
      // Make user a creator
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_creator: true,
          plan: 'creator',
          is_premium: true, // Creators get free premium
        })
        .eq('id', user.id);

      if (updateError) {
        return { data: null, error: updateError };
      }

      return { data: { type: 'creator', message: 'Creator account activated!' }, error: null };
    } else if (codeData.type === 'premium_discount') {
      // Offer identifier for the app to apply at paywall (must match App Store Connect promotional offer code)
      const offerIdentifier = 'first_month_20_off';
      return {
        data: {
          type: 'discount',
          message: `Code applied! ${codeData.discount_percent}% discount available.`,
          offer_identifier: offerIdentifier,
        },
        error: null,
      };
    }

    return { data: null, error: { message: 'Unknown code type' } };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Record that the user used a discount code after they have completed a purchase.
 * Call this from the app only after a successful purchase that used a discount code.
 * For discount codes we do not record use on redeem (so they can try again if they cancel the pay sheet).
 */
export async function recordPromoterCodeUseAfterPurchase(code: string): Promise<{ error: { message: string } | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'User not authenticated' } };
    }

    const { data: codeData, error: codeError } = await supabase
      .from('promoter_codes')
      .select('id, type')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (codeError || !codeData || codeData.type !== 'premium_discount') {
      return { error: null }; // ignore invalid code; purchase already succeeded
    }

    const { data: existingUse } = await supabase
      .from('profile_code_uses')
      .select('id')
      .eq('profile_id', user.id)
      .eq('promoter_code_id', codeData.id)
      .single();

    if (existingUse) {
      return { error: null }; // already recorded (e.g. double call)
    }

    const { error: useError } = await supabase
      .from('profile_code_uses')
      .insert({
        profile_id: user.id,
        promoter_code_id: codeData.id,
      });

    if (useError) {
      return { error: useError };
    }
    return { error: null };
  } catch (error: any) {
    return { error: error };
  }
}

/**
 * Record that a user entered this code on the paywall (for curiosity/marketing).
 * Does not validate or activate anything; just increments count in paywall_codes table.
 */
export async function recordPaywallCodeEntered(code: string): Promise<void> {
  const trimmed = code?.trim();
  if (!trimmed) return;
  try {
    await supabase.rpc('increment_paywall_code', { p_code: trimmed });
  } catch (_) {
    // Fire-and-forget; don't surface errors to the user
  }
}

/**
 * Store the paywall code on the current user's profile so the RevenueCat webhook can
 * attribute the purchase (monthly vs yearly) to this code for paywall_codes analytics.
 * Call when the user enters a code and continues; webhook clears it after recording.
 */
export async function setPendingPaywallCode(code: string): Promise<void> {
  const trimmed = code?.trim();
  try {
    await supabase.rpc('set_pending_paywall_code', { p_code: trimmed ?? '' });
  } catch (_) {
    // Fire-and-forget
  }
}
