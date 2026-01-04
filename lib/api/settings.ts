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
      console.error('Error getting privacy settings:', getError);
    }

    // Update or insert
    let error;
    let resultData;
    if (existingSettings) {
      // Update existing
      console.log(`📝 [Privacy] Updating existing privacy settings for user ${user.id}:`, JSON.stringify(updates, null, 2));
      const { data: updateData, error: updateError } = await supabase
        .from('user_privacy_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single(); // Get updated data to verify
      error = updateError;
      resultData = updateData;
      if (updateError) {
        console.error('❌ [Privacy] Update error:', updateError);
      } else {
        console.log('✅ [Privacy] Settings updated successfully. New values:', JSON.stringify(updateData, null, 2));
      }
    } else {
      // Insert new with updates
      console.log(`📝 [Privacy] Creating new privacy settings for user ${user.id}:`, JSON.stringify(updates, null, 2));
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
      if (insertError) {
        console.error('❌ [Privacy] Insert error:', insertError);
      } else {
        console.log('✅ [Privacy] Settings created successfully. New values:', JSON.stringify(insertData, null, 2));
      }
    }

    if (error) {
      console.error('❌ [Privacy] Error updating privacy settings:', error);
      return { data: null, error };
    }

    // Verify the settings were saved correctly
    if (resultData) {
      console.log('✅ [Privacy] Verification - Settings in DB:', JSON.stringify(resultData, null, 2));
      // Check each updated field
      Object.keys(updates).forEach(key => {
        if (resultData[key] !== updates[key]) {
          console.error(`❌ [Privacy] WARNING: Field ${key} mismatch! Expected: ${updates[key]}, Got: ${resultData[key]}`);
        } else {
          console.log(`✅ [Privacy] Field ${key} verified: ${resultData[key]}`);
        }
      });
    }

    console.log('✅ [Privacy] Privacy settings saved successfully:', updates);
    return { data: true, error: null };
  } catch (error: any) {
    console.error('Exception updating privacy settings:', error);
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
      console.error('Email regex validation failed for:', trimmedEmail);
      return { data: null, error: { message: 'Please enter a valid email address format (e.g., user@example.com)' } };
    }
    
    // Additional structure validation
    const atIndex = trimmedEmail.indexOf('@');
    const lastDotIndex = trimmedEmail.lastIndexOf('.');
    if (atIndex < 1 || lastDotIndex < atIndex + 2 || lastDotIndex === trimmedEmail.length - 1) {
      console.error('Email structure validation failed for:', trimmedEmail);
      return { data: null, error: { message: 'Please enter a valid email address format' } };
    }

    // Get current user to check current email
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User authentication error:', userError);
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Check if email is the same as current
    if (user.email && user.email.toLowerCase() === trimmedEmail) {
      return { data: null, error: { message: 'This is already your current email address' } };
    }

    console.log(`📧 [Email Update] Attempting to update email from ${user.email} to ${trimmedEmail}`);
    
    // Call Supabase to update email
    // Note: If "Secure email change" is disabled in Supabase, the email will update immediately
    // If it's enabled, the email will be pending until confirmation
    const { data: updateData, error } = await supabase.auth.updateUser({
      email: trimmedEmail,
    });

    // Log the response to see what Supabase returned
    console.log('📧 [Email Update] Supabase updateUser response:', {
      hasData: !!updateData,
      hasError: !!error,
      userEmail: updateData?.user?.email,
      errorMessage: error?.message,
    });

    if (error) {
      // Log the full error for debugging
      console.error('❌ [Email Update] Supabase error:', error);
      console.error('Error status:', error.status);
      console.error('Error message:', error.message);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      
      // Better error message handling - don't assume "invalid" means format
      let errorMessage = error.message || 'Failed to update email';
      
      // Handle specific Supabase error codes and messages
      if (error.code === 'email_address_invalid') {
        // Supabase is rejecting the email - this could be:
        // 1. The current email is invalid and Supabase won't let you update from an invalid email
        // 2. The new email format is invalid according to Supabase's stricter rules
        // 3. Supabase has domain restrictions configured
        // 4. Supabase requires email confirmation and the current email isn't confirmed
        
        console.error('❌ [Email Update] email_address_invalid error details:');
        console.error('  - Current email:', user.email);
        console.error('  - New email:', trimmedEmail);
        console.error('  - Email confirmed:', user.email_confirmed_at ? 'yes' : 'no');
        
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
      
      console.log(`📧 [Email Update] Supabase response details:`, {
        currentEmail: updatedEmail,
        newEmail: newEmail,
        emailChangeSent: updateData.user.email_change_sent_at ? 'yes' : 'no',
        emailChangeToken: updateData.user.email_change_token ? 'exists' : 'none',
      });
      
      // Check if email actually changed or if it's pending confirmation
      if (updatedEmail && updatedEmail.toLowerCase() === trimmedEmail.toLowerCase()) {
        // Email updated immediately (confirmation is disabled in Supabase)
        console.log(`✅ [Email Update] Email confirmed changed in Supabase immediately: ${updatedEmail}`);
        console.log(`✅ [Email Update] No confirmation required - email is active now`);
      } else if (newEmail && newEmail.toLowerCase() === trimmedEmail.toLowerCase()) {
        // Email is pending confirmation (confirmation is enabled in Supabase)
        console.log(`⚠️ [Email Update] Email change is PENDING CONFIRMATION. New email: ${newEmail}, Current email: ${updatedEmail}`);
        console.log(`⚠️ [Email Update] The email will update in Supabase after the user confirms via email link`);
        console.log(`⚠️ [Email Update] To enable immediate updates, disable "Secure email change" in Supabase Dashboard > Authentication > Providers > Email`);
        // Return success but note that confirmation is required
        return { data: true, error: null, requiresConfirmation: true };
      } else {
        console.warn(`⚠️ [Email Update] Email in response doesn't match requested email`);
        console.warn(`⚠️ [Email Update] Current: ${updatedEmail}, New: ${newEmail}, Requested: ${trimmedEmail}`);
        console.warn(`⚠️ [Email Update] This might mean email confirmation is required before the change takes effect`);
        console.warn(`⚠️ [Email Update] To enable immediate updates, disable "Secure email change" in Supabase Dashboard > Authentication > Providers > Email`);
        // Even if email doesn't match, Supabase accepted the request
        // The email will update after confirmation
        return { data: true, error: null, requiresConfirmation: true };
      }
    } else {
      console.warn(`⚠️ [Email Update] No user data in response, but no error either`);
      console.warn(`⚠️ [Email Update] This might mean the update is pending email confirmation`);
      // Even without user data, if there's no error, Supabase accepted the request
      return { data: true, error: null, requiresConfirmation: true };
    }

    return { data: true, error: null };
  } catch (error: any) {
    console.error('Exception in updateEmail:', error);
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
    console.log(`🗑️ [Delete Account] Starting deletion for user: ${userId}`);

    // Step 1: Call the database function to delete the profile and all related data
    console.log(`🗑️ [Delete Account] Deleting profile and related data...`);
    const { error: deleteError } = await supabase.rpc('delete_user_account');

    if (deleteError) {
      console.error('❌ [Delete Account] Error deleting profile:', deleteError);
      return { data: null, error: { message: deleteError.message || 'Failed to delete account' } };
    }

    console.log(`✅ [Delete Account] Profile deleted successfully`);

    // Step 2: Delete user from Loops (non-blocking)
    const userEmail = user.email;
    if (userEmail) {
      console.log(`🗑️ [Delete Account] Removing user from Loops...`);
      deleteContact(userEmail).then(({ error: loopsError }) => {
        if (loopsError) {
          console.warn('⚠️ [Delete Account] Failed to remove user from Loops:', loopsError);
        } else {
          console.log(`✅ [Delete Account] User removed from Loops successfully`);
        }
      });
    }

    // Step 3: Call Edge Function to delete auth user (this frees up the email)
    console.log(`🗑️ [Delete Account] Calling Edge Function to delete auth user...`);
    const { data: edgeFunctionData, error: authDeleteError } = await supabase.functions.invoke('delete-auth-user', {
      body: { userId }
    });

    if (authDeleteError) {
      console.error('❌ [Delete Account] Error calling Edge Function to delete auth user:', authDeleteError);
      console.error('⚠️ [Delete Account] Profile is deleted, but auth user may still exist. Email may not be freed up.');
      // Don't fail - profile is already deleted, which is the main goal
      // But log the error so we know the auth user wasn't deleted
    } else {
      console.log(`✅ [Delete Account] Auth user deleted successfully. Email is now available for reuse.`);
      if (edgeFunctionData) {
        console.log(`✅ [Delete Account] Edge Function response:`, edgeFunctionData);
      }
    }

    // Step 3: Sign out the user and clear all session data
    console.log(`🗑️ [Delete Account] Signing out user...`);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error('⚠️ [Delete Account] Error signing out after account deletion:', signOutError);
    }

    // Step 4: Clear any cached data
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.clear();
      console.log(`✅ [Delete Account] Local storage cleared`);
    } catch (storageError) {
      console.error('⚠️ [Delete Account] Error clearing storage:', storageError);
    }

    console.log(`✅ [Delete Account] Account deletion process completed`);
    return { data: true, error: null };
  } catch (error: any) {
    console.error('❌ [Delete Account] Exception deleting account:', error);
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
      console.error('Error updating sports:', error);
      return { data: null, error };
    }

    return { data: true, error: null };
  } catch (error: any) {
    console.error('Exception in reorderSports:', error);
    return { data: null, error };
  }
}

// =====================================================
// Premium & Codes Functions
// =====================================================

/**
 * Redeem a promoter code
 */
export async function redeemCode(code: string): Promise<{ data: { type: string; message: string } | null; error: any }> {
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

    // Record code use
    const { error: useError } = await supabase
      .from('profile_code_uses')
      .insert({
        profile_id: user.id,
        promoter_code_id: codeData.id,
      });

    if (useError) {
      return { data: null, error: useError };
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
      // Apply discount (this would be handled in payment flow)
      return { data: { type: 'discount', message: `Code applied! ${codeData.discount_percent}% discount available.` }, error: null };
    }

    return { data: null, error: { message: 'Unknown code type' } };
  } catch (error: any) {
    return { data: null, error };
  }
}

