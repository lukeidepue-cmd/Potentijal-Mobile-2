/**
 * Social API
 * Functions for searching profiles, following/unfollowing, and recommendations
 */

import { supabase } from '../supabase';
import { Profile } from './profile';

export interface ProfileWithFollowStatus extends Profile {
  is_following: boolean;
}

/**
 * Search profiles by username or display name
 */
export async function searchProfiles(query: string): Promise<{ data: ProfileWithFollowStatus[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    if (!query.trim()) {
      return { data: [], error: null };
    }

    const searchTerm = `%${query.trim().toLowerCase()}%`;

    // Search profiles using ILIKE for fuzzy matching
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, profile_image_url, is_premium, is_creator, plan, sports, primary_sport')
      .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
      .neq('id', user.id) // Exclude current user
      .limit(50);

    if (error) {
      return { data: null, error };
    }

    // Get follow status for each profile
    const profileIds = (data || []).map((p) => p.id);
    const { data: followsData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', profileIds);

    const followingIds = new Set((followsData || []).map((f) => f.following_id));

    const profilesWithStatus = (data || []).map((profile) => ({
      ...profile,
      is_following: followingIds.has(profile.id),
    })) as ProfileWithFollowStatus[];

    return { data: profilesWithStatus, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * List recommended profiles
 * Simple implementation: top profiles by follower count + profiles with shared followers
 */
export async function listRecommendedProfiles(): Promise<{ data: ProfileWithFollowStatus[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get profiles the user is already following
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = new Set((followingData || []).map((f) => f.following_id));
    followingIds.add(user.id); // Exclude self

    // Get all profiles except self
    // We'll filter out already-followed users in application layer
    // This allows us to still show them if they're creators or have mutuals
    
    // Get blocked users
    const { data: blockedData } = await supabase
      .from('blocked_users')
      .select('blocked_id')
      .eq('blocker_id', user.id);
    const blockedIds = new Set((blockedData || []).map(b => b.blocked_id));

    // Get users who blocked current user
    const { data: blockedByData } = await supabase
      .from('blocked_users')
      .select('blocker_id')
      .eq('blocked_id', user.id);
    const blockedByIds = new Set((blockedByData || []).map(b => b.blocker_id));

    // Get all profiles except self FIRST
    const { data: allProfiles, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, profile_image_url, is_premium, is_creator, plan, sports, primary_sport')
      .neq('id', user.id)
      .order('created_at', { ascending: false })
      .limit(50); // Get more to sort properly

    console.log(`👥 [Recommended Profiles] Found ${allProfiles?.length || 0} total profiles`);

    if (error) {
      console.error('❌ [Recommended Profiles] Query error:', error);
      return { data: null, error };
    }

    if (!allProfiles || allProfiles.length === 0) {
      console.log('👥 [Recommended Profiles] No profiles found');
      return { data: [], error: null };
    }

    // Get privacy settings for all profiles - CRITICAL: Must fetch AFTER getting profiles
    console.log(`🔒 [Recommendations] ===== START Loading Privacy Settings =====`);
    const profileIds = allProfiles.map(p => p.id);
    console.log(`🔒 [Recommendations] Fetching privacy settings for profile IDs:`, profileIds);
    
    // IMPORTANT: RLS might block us from reading other users' privacy settings
    // We need to check if we can read them, or if RLS is blocking
    const { data: privacySettings, error: privacyError } = await supabase
      .from('user_privacy_settings')
      .select('user_id, who_can_see_profile, who_can_see_highlights, suggest_me_to_others')
      .in('user_id', profileIds); // Only get settings for profiles we're checking

    if (privacyError) {
      console.error('❌ [Recommendations] Error fetching privacy settings:', privacyError);
      console.error('❌ [Recommendations] Error code:', privacyError.code);
      console.error('❌ [Recommendations] Error message:', privacyError.message);
      // If RLS is blocking, privacySettings will be empty but no error
      // If there's a real error, log it but continue
    }

    console.log(`🔒 [Recommendations] Raw privacy settings response:`, privacySettings);
    console.log(`🔒 [Recommendations] Privacy settings count: ${privacySettings?.length || 0}`);

    const privacyMap = new Map();
    (privacySettings || []).forEach(ps => {
      privacyMap.set(ps.user_id, ps);
      console.log(`🔒 [Privacy] User ${ps.user_id}: profile="${ps.who_can_see_profile}", highlights="${ps.who_can_see_highlights}", suggest=${ps.suggest_me_to_others}`);
    });
    
    console.log(`🔒 [Privacy] Loaded ${privacyMap.size} privacy settings for ${allProfiles.length} profiles`);
    
    // If we got 0 settings but have profiles, this might be an RLS issue
    if (privacyMap.size === 0 && allProfiles.length > 0 && !privacyError) {
      console.warn('⚠️ [Recommendations] WARNING: No privacy settings found but no error. This might indicate RLS is blocking access or settings don\'t exist.');
      console.warn('⚠️ [Recommendations] You may need to run migration 019_fix_privacy_settings_rls.sql to allow reading privacy settings.');
    }
    
    console.log(`🔒 [Recommendations] ===== END Loading Privacy Settings =====`);

    // Get mutual followers for each profile
    // profileIds already declared above for privacy settings query
    const { data: allFollows } = await supabase
      .from('follows')
      .select('follower_id, following_id')
      .in('follower_id', [user.id, ...profileIds])
      .in('following_id', [user.id, ...profileIds]);

    // Calculate mutual followers count for each profile
    const mutualCounts = new Map<string, number>();
    allProfiles.forEach(profile => {
      let mutualCount = 0;
      // Get profiles that follow both current user and this profile
      const userFollowers = new Set(
        (allFollows || [])
          .filter(f => f.following_id === user.id)
          .map(f => f.follower_id)
      );
      const profileFollowers = new Set(
        (allFollows || [])
          .filter(f => f.following_id === profile.id)
          .map(f => f.follower_id)
      );
      // Count mutual followers
      userFollowers.forEach(followerId => {
        if (profileFollowers.has(followerId)) {
          mutualCount++;
        }
      });
      mutualCounts.set(profile.id, mutualCount);
    });

    // Filter profiles based on privacy settings, blocks, and following status
    const filteredProfiles = allProfiles.filter(profile => {
      // Exclude blocked users
      if (blockedIds.has(profile.id) || blockedByIds.has(profile.id)) {
        console.log(`🚫 [Recommendations] Excluding ${profile.id} - blocked`);
        return false;
      }

      // Get privacy settings for this profile
      const privacy = privacyMap.get(profile.id);
      console.log(`🔍 [Recommendations] Checking profile ${profile.id} (${profile.username}): privacy=${privacy ? 'exists' : 'none'}`);
      
      if (privacy) {
        console.log(`🔍 [Recommendations] Privacy details: suggest=${privacy.suggest_me_to_others}, profile=${privacy.who_can_see_profile}`);
        
        // Exclude users who don't want to be recommended
        if (privacy.suggest_me_to_others === false) {
          console.log(`🚫 [Recommendations] Excluding ${profile.id} (${profile.username}) - suggest_me_to_others is false`);
          return false;
        }

        // Check privacy settings - only show if profile is public or user is following
        const isFollowing = followingIds.has(profile.id);
        // Normalize visibility value - handle case sensitivity and null/undefined
        const profileVisibility = (privacy.who_can_see_profile || 'everyone').toLowerCase();
        console.log(`🔍 [Recommendations] Profile visibility: "${profileVisibility}" (raw: "${privacy.who_can_see_profile}"), isFollowing: ${isFollowing}`);
        
        // If set to 'none', exclude completely
        if (profileVisibility === 'none') {
          console.log(`🚫 [Recommendations] EXCLUDING ${profile.id} (@${profile.username}) - profile visibility is 'none'`);
          return false;
        }
        
        // If set to 'followers', only show if user is following
        if (profileVisibility === 'followers') {
          if (!isFollowing) {
            console.log(`🚫 [Recommendations] EXCLUDING ${profile.id} (@${profile.username}) - profile visibility is 'followers' and user is NOT following`);
            return false;
          } else {
            console.log(`✅ [Recommendations] Profile ${profile.id} (@${profile.username}) - visibility is 'followers' but user IS following`);
          }
        }
        
        // If 'everyone', allow (continue below)
        if (profileVisibility === 'everyone') {
          console.log(`✅ [Recommendations] Profile ${profile.id} (@${profile.username}) - visibility is 'everyone'`);
        }
        console.log(`✅ [Recommendations] Profile ${profile.id} (@${profile.username}) passed privacy checks`);
      } else {
        console.log(`✅ [Recommendations] Profile ${profile.id} (${profile.username}) has no privacy settings - defaulting to public`);
      }
      // If no privacy settings exist, default to public (allow)

      // Exclude already-followed users
      const isFollowing = followingIds.has(profile.id);
      if (isFollowing) {
        console.log(`🚫 [Recommendations] Excluding ${profile.id} (${profile.username}) - user is already following`);
        return false;
      }
      
      console.log(`✅ [Recommendations] Including ${profile.id} (${profile.username})`);
      return true;
    });

    // Sort: profiles with mutual followers first, then creators, then others
    const sortedProfiles = [...filteredProfiles].sort((a, b) => {
      const aMutual = mutualCounts.get(a.id) || 0;
      const bMutual = mutualCounts.get(b.id) || 0;
      const aFollowing = followingIds.has(a.id);
      const bFollowing = followingIds.has(b.id);
      
      // If both have mutual followers, sort by mutual count (regardless of following status)
      if (aMutual > 0 && bMutual > 0) {
        return bMutual - aMutual;
      }
      // If only one has mutual followers, prioritize it
      if (aMutual > 0) return -1;
      if (bMutual > 0) return 1;
      
      // If neither has mutual followers, prioritize creators (even if following)
      if (a.is_creator && !b.is_creator) return -1;
      if (!a.is_creator && b.is_creator) return 1;
      
      // If both are creators or neither, prioritize non-followed
      if (!aFollowing && bFollowing) return -1;
      if (aFollowing && !bFollowing) return 1;
      
      // Otherwise, keep original order (newest first)
      return 0;
    });

    const data = sortedProfiles.slice(0, 20); // Limit to 20
    console.log(`👥 [Recommended Profiles] Returning ${data.length} profiles (sorted by mutuals/creators)`);

    // Get follow status for final sorted profiles
    const finalProfileIds = data.map((p) => p.id);
    const { data: followsData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', finalProfileIds);

    const followingSet = new Set((followsData || []).map((f) => f.following_id));

    const profilesWithStatus = data.map((profile) => ({
      ...profile,
      is_following: followingSet.has(profile.id),
    })) as ProfileWithFollowStatus[];

    return { data: profilesWithStatus, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get list of followers for a profile
 */
export async function listFollowers(profileId: string): Promise<{ data: ProfileWithFollowStatus[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get all users who follow this profile
    const { data: followsData, error: followsError } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', profileId);

    if (followsError) {
      return { data: null, error: followsError };
    }

    if (!followsData || followsData.length === 0) {
      return { data: [], error: null };
    }

    const followerIds = followsData.map(f => f.follower_id);

    // Get profile details for each follower
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, profile_image_url, is_premium, is_creator, plan, sports, primary_sport')
      .in('id', followerIds);

    if (profilesError) {
      return { data: null, error: profilesError };
    }

    // Get follow status for each profile (who the current user follows)
    const { data: currentUserFollows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', followerIds);

    const followingIds = new Set((currentUserFollows || []).map(f => f.following_id));

    const profilesWithStatus = (profiles || []).map((profile) => ({
      ...profile,
      is_following: followingIds.has(profile.id),
    })) as ProfileWithFollowStatus[];

    return { data: profilesWithStatus, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get list of users a profile is following
 */
export async function listFollowing(profileId: string): Promise<{ data: ProfileWithFollowStatus[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get all users this profile follows
    const { data: followsData, error: followsError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', profileId);

    if (followsError) {
      return { data: null, error: followsError };
    }

    if (!followsData || followsData.length === 0) {
      return { data: [], error: null };
    }

    const followingIds = followsData.map(f => f.following_id);

    // Get profile details for each user being followed
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, profile_image_url, is_premium, is_creator, plan, sports, primary_sport')
      .in('id', followingIds);

    if (profilesError) {
      return { data: null, error: profilesError };
    }

    // Get follow status for each profile (who the current user follows)
    const { data: currentUserFollows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', followingIds);

    const currentUserFollowingIds = new Set((currentUserFollows || []).map(f => f.following_id));

    const profilesWithStatus = (profiles || []).map((profile) => ({
      ...profile,
      is_following: currentUserFollowingIds.has(profile.id),
    })) as ProfileWithFollowStatus[];

    return { data: profilesWithStatus, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Search followers for a profile
 */
export async function searchFollowers(profileId: string, query: string): Promise<{ data: ProfileWithFollowStatus[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    if (!query.trim()) {
      // If no query, return all followers
      return listFollowers(profileId);
    }

    // Get all users who follow this profile
    const { data: followsData, error: followsError } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', profileId);

    if (followsError) {
      return { data: null, error: followsError };
    }

    if (!followsData || followsData.length === 0) {
      return { data: [], error: null };
    }

    const followerIds = followsData.map(f => f.follower_id);
    const searchTerm = `%${query.trim().toLowerCase()}%`;

    // Search profiles that are in the followers list
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, profile_image_url, is_premium, is_creator, plan, sports, primary_sport')
      .in('id', followerIds)
      .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
      .limit(50);

    if (profilesError) {
      return { data: null, error: profilesError };
    }

    // Get follow status for each profile
    const profileIds = (profiles || []).map(p => p.id);
    const { data: currentUserFollows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', profileIds);

    const followingIds = new Set((currentUserFollows || []).map(f => f.following_id));

    const profilesWithStatus = (profiles || []).map((profile) => ({
      ...profile,
      is_following: followingIds.has(profile.id),
    })) as ProfileWithFollowStatus[];

    return { data: profilesWithStatus, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Search users that a profile is following
 */
export async function searchFollowing(profileId: string, query: string): Promise<{ data: ProfileWithFollowStatus[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    if (!query.trim()) {
      // If no query, return all following
      return listFollowing(profileId);
    }

    // Get all users this profile follows
    const { data: followsData, error: followsError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', profileId);

    if (followsError) {
      return { data: null, error: followsError };
    }

    if (!followsData || followsData.length === 0) {
      return { data: [], error: null };
    }

    const followingIds = followsData.map(f => f.following_id);
    const searchTerm = `%${query.trim().toLowerCase()}%`;

    // Search profiles that are in the following list
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, profile_image_url, is_premium, is_creator, plan, sports, primary_sport')
      .in('id', followingIds)
      .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
      .limit(50);

    if (profilesError) {
      return { data: null, error: profilesError };
    }

    // Get follow status for each profile
    const profileIds = (profiles || []).map(p => p.id);
    const { data: currentUserFollows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', profileIds);

    const currentUserFollowingIds = new Set((currentUserFollows || []).map(f => f.following_id));

    const profilesWithStatus = (profiles || []).map((profile) => ({
      ...profile,
      is_following: currentUserFollowingIds.has(profile.id),
    })) as ProfileWithFollowStatus[];

    return { data: profilesWithStatus, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Follow a user
 */
export async function follow(profileId: string): Promise<{ data: boolean | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    if (user.id === profileId) {
      return { data: null, error: { message: 'Cannot follow yourself' } };
    }

    console.log(`👥 [Follow] User ${user.id} attempting to follow ${profileId}`);
    
    const { data, error } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: profileId,
      })
      .select();

    if (error) {
      console.error(`❌ [Follow] Error following user:`, error);
      // Check if already following (unique constraint violation)
      if (error.code === '23505') {
        console.log(`✅ [Follow] Already following, treating as success`);
        return { data: true, error: null }; // Already following, treat as success
      }
      return { data: null, error };
    }

    console.log(`✅ [Follow] Successfully followed user. Inserted data:`, data);
    return { data: true, error: null };
  } catch (error: any) {
    console.error(`❌ [Follow] Exception:`, error);
    return { data: null, error };
  }
}

/**
 * Unfollow a user
 */
export async function unfollow(profileId: string): Promise<{ data: boolean | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', profileId);

    if (error) {
      return { data: null, error };
    }

    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}
