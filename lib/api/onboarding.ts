/**
 * Onboarding API
 * Functions for managing user onboarding flow, progress tracking, and onboarding data
 */

import { supabase } from '../supabase';

// =====================================================
// Types & Interfaces
// =====================================================

export interface OnboardingData {
  id: string;
  user_id: string;
  current_step: string | null;
  completed_steps: string[];
  completed: boolean;
  completed_at: string | null;
  training_intent: 'getting_stronger' | 'consistency' | 'progress' | 'efficiency' | null;
  intro_completed: boolean;
  notifications_enabled: boolean;
  premium_offer_shown: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Onboarding Functions
// =====================================================

/**
 * Get current user's onboarding state
 * Creates default onboarding data if it doesn't exist
 */
export async function getOnboardingState(): Promise<{
  data: OnboardingData | null;
  error: any;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Try to get existing onboarding data
    let { data, error } = await supabase
      .from('onboarding_data')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // If doesn't exist, create default onboarding data
    if (error && error.code === 'PGRST116') {
      const { data: newData, error: insertError } = await supabase
        .from('onboarding_data')
        .insert({
          user_id: user.id,
          current_step: 'welcome',
          completed_steps: [],
          completed: false,
        })
        .select()
        .single();

      if (insertError) {
        return { data: null, error: insertError };
      }

      return { data: newData as OnboardingData, error: null };
    }

    if (error) {
      return { data: null, error };
    }

    return { data: data as OnboardingData, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Update onboarding step and progress
 * @param step - The step name to update to (e.g., 'email_entry', 'account_basics')
 * @param data - Optional additional data to update (e.g., training_intent)
 */
export async function updateOnboardingStep(
  step: string,
  data?: Partial<OnboardingData>
): Promise<{ data: boolean; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: false, error: { message: 'User not authenticated' } };
    }

    // Get current onboarding data to update completed_steps array
    const { data: currentData, error: fetchError } = await supabase
      .from('onboarding_data')
      .select('completed_steps')
      .eq('user_id', user.id)
      .single();

    // If record doesn't exist, create it first
    if (fetchError && fetchError.code === 'PGRST116') {
      console.log('🔵 [updateOnboardingStep] Creating new onboarding_data record for user:', user.id);
      
      // Build initial data
      const initialData: any = {
        user_id: user.id,
        current_step: step,
        completed_steps: [step],
        completed: false,
      };

      // Add any additional fields from data parameter
      if (data) {
        if (data.training_intent !== undefined) {
          initialData.training_intent = data.training_intent;
        }
        if (data.intro_completed !== undefined) {
          initialData.intro_completed = data.intro_completed;
        }
        if (data.notifications_enabled !== undefined) {
          initialData.notifications_enabled = data.notifications_enabled;
        }
        if (data.premium_offer_shown !== undefined) {
          initialData.premium_offer_shown = data.premium_offer_shown;
        }
      }

      const { error: insertError } = await supabase
        .from('onboarding_data')
        .insert(initialData);

      if (insertError) {
        console.error('❌ [updateOnboardingStep] Error creating onboarding_data:', insertError);
        return { data: false, error: insertError };
      }

      console.log('✅ [updateOnboardingStep] Created onboarding_data record with step:', step);
      return { data: true, error: null };
    }

    if (fetchError) {
      return { data: false, error: fetchError };
    }

    // Build update object
    const updates: any = {
      current_step: step,
    };

    // Add step to completed_steps array if not already there
    const currentSteps = currentData?.completed_steps || [];
    if (!currentSteps.includes(step)) {
      updates.completed_steps = [...currentSteps, step];
    }

    // Add any additional fields from data parameter
    if (data) {
      if (data.training_intent !== undefined) {
        updates.training_intent = data.training_intent;
      }
      if (data.intro_completed !== undefined) {
        updates.intro_completed = data.intro_completed;
      }
      if (data.notifications_enabled !== undefined) {
        updates.notifications_enabled = data.notifications_enabled;
      }
      if (data.premium_offer_shown !== undefined) {
        updates.premium_offer_shown = data.premium_offer_shown;
      }
    }

    // Update the database
    const { error } = await supabase
      .from('onboarding_data')
      .update(updates)
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ [updateOnboardingStep] Error updating onboarding_data:', error);
      return { data: false, error };
    }

    console.log('✅ [updateOnboardingStep] Updated onboarding_data with step:', step);
    return { data: true, error: null };
  } catch (error: any) {
    console.error('❌ [updateOnboardingStep] Exception:', error);
    return { data: false, error };
  }
}

/**
 * Mark onboarding as fully completed
 */
export async function completeOnboarding(): Promise<{
  data: boolean;
  error: any;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: false, error: { message: 'User not authenticated' } };
    }

    console.log('🔵 [completeOnboarding] Marking onboarding complete for user:', user.id);
    
    // Use upsert to create record if it doesn't exist, or update if it does
    const { data: updatedData, error } = await supabase
      .from('onboarding_data')
      .upsert({
        user_id: user.id,
        completed: true,
        completed_at: new Date().toISOString(),
        current_step: 'completed',
        completed_steps: ['completed'], // Ensure completed_steps has at least one entry
      }, {
        onConflict: 'user_id', // Use user_id as the conflict resolution key
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [completeOnboarding] Database upsert error:', error);
      return { data: false, error };
    }

    console.log('✅ [completeOnboarding] Database updated successfully:', updatedData);
    return { data: true, error: null };
  } catch (error: any) {
    console.error('❌ [completeOnboarding] Exception:', error);
    return { data: false, error };
  }
}

/**
 * Check if user needs onboarding
 * Returns true if onboarding is not completed or onboarding_data doesn't exist
 */
export async function needsOnboarding(): Promise<{
  data: boolean;
  error: any;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: false, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('onboarding_data')
      .select('completed, completed_at')
      .eq('user_id', user.id)
      .single();

    // If no record exists, user needs onboarding
    if (error && error.code === 'PGRST116') {
      console.log('🔵 [needsOnboarding] No record found - needs onboarding');
      return { data: true, error: null };
    }

    if (error) {
      console.error('❌ [needsOnboarding] Database error:', error);
      return { data: false, error };
    }

    // Log what we found
    console.log('🔵 [needsOnboarding] Database check:', { 
      completed: data?.completed, 
      completed_at: data?.completed_at,
      needsOnboarding: !data?.completed 
    });

    // If completed is false or null, user needs onboarding
    return { data: !data?.completed, error: null };
  } catch (error: any) {
    console.error('❌ [needsOnboarding] Exception:', error);
    return { data: false, error };
  }
}

/**
 * Update user profile with data collected during onboarding
 * (e.g., name, age, sports, primary_sport)
 */
export async function updateProfileFromOnboarding(updates: {
  display_name?: string;
  birth_year?: number;
  sports?: string[];
  primary_sport?: string;
}): Promise<{ data: boolean | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const updateData: any = {};
    
    if (updates.display_name !== undefined) {
      updateData.display_name = updates.display_name.trim();
    }
    
    if (updates.birth_year !== undefined) {
      updateData.birth_year = updates.birth_year;
    }
    
    if (updates.sports !== undefined) {
      updateData.sports = updates.sports;
    }
    
    if (updates.primary_sport !== undefined) {
      updateData.primary_sport = updates.primary_sport;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (error) {
      console.error('❌ [updateProfileFromOnboarding] Error updating profile:', error);
      return { data: null, error };
    }

    console.log('✅ [updateProfileFromOnboarding] Profile updated successfully');
    return { data: true, error: null };
  } catch (error: any) {
    console.error('❌ [updateProfileFromOnboarding] Exception:', error);
    return { data: null, error };
  }
}

/**
 * Update user preferences from onboarding
 * (e.g., notification preferences)
 */
export async function updatePreferencesFromOnboarding(updates: {
  notifications_enabled?: boolean;
}): Promise<{ data: boolean | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    if (updates.notifications_enabled !== undefined) {
      // Update user_preferences table
      const { error } = await supabase
        .from('user_preferences')
        .update({
          notification_preferences: {
            push_enabled: updates.notifications_enabled,
            workout_reminders: updates.notifications_enabled,
            practice_reminders: updates.notifications_enabled,
            goal_reminders: updates.notifications_enabled,
            social_follower: updates.notifications_enabled,
            social_highlight_views: updates.notifications_enabled,
            ai_trainer_insights: updates.notifications_enabled,
            email_notifications: updates.notifications_enabled,
          },
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ [updatePreferencesFromOnboarding] Error updating preferences:', error);
        return { data: null, error };
      }
    }

    console.log('✅ [updatePreferencesFromOnboarding] Preferences updated successfully');
    return { data: true, error: null };
  } catch (error: any) {
    console.error('❌ [updatePreferencesFromOnboarding] Exception:', error);
    return { data: null, error };
  }
}
