/**
 * Profile API
 * Functions for managing user profiles, stats, and profile updates
 */

import { supabase } from '../supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  profile_image_url: string | null;
  is_premium: boolean;
  is_creator: boolean;
  plan: 'free' | 'premium' | 'creator';
  sports: string[];
  primary_sport: string | null;
  /** Set when user redeemed a discount code; cleared after purchase. Used for promotional offer at paywall. */
  pending_discount_offer_id?: string | null;
}

export interface ProfileStats {
  followers: number;
  following: number;
  highlights: number;
}

/**
 * Get current user's profile
 */
export async function getMyProfile(): Promise<{ data: Profile | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, profile_image_url, is_premium, is_creator, plan, sports, primary_sport, pending_discount_offer_id')
      .eq('id', user.id)
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: data as Profile, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Update current user's profile
 */
export async function updateMyProfile(params: {
  displayName?: string;
  username?: string;
  bio?: string;
}): Promise<{ data: boolean | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const updateData: any = {};
    if (params.displayName !== undefined) {
      updateData.display_name = params.displayName.trim();
    }
    if (params.username !== undefined) {
      updateData.username = params.username.trim().toLowerCase();
    }
    if (params.bio !== undefined) {
      updateData.bio = params.bio.trim();
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (error) {
      // Check if it's a unique constraint violation (username taken)
      if (error.code === '23505' && error.message?.includes('username')) {
        return { data: null, error: { message: 'Username is already taken', code: 'USERNAME_TAKEN' } };
      }
      return { data: null, error };
    }

    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Set or clear the pending discount offer ID (used after redeeming a discount code; cleared after purchase).
 */
export async function setPendingDiscountOfferId(offerId: string | null): Promise<{ data: boolean | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }
    const { error } = await supabase
      .from('profiles')
      .update({ pending_discount_offer_id: offerId })
      .eq('id', user.id);
    if (error) return { data: null, error };
    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get profile stats (followers, following, highlights count)
 */
export async function getProfileStats(profileId: string): Promise<{ data: ProfileStats | null; error: any }> {
  try {
    console.log(`📊 [Profile Stats] ===== START Fetching stats for profile: ${profileId} =====`);
    
    // Get current user for debugging
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    console.log(`📊 [Profile Stats] Current user: ${currentUser?.id || 'not authenticated'}`);
    console.log(`📊 [Profile Stats] Viewing profile: ${profileId}`);
    console.log(`📊 [Profile Stats] Is viewing own profile: ${currentUser?.id === profileId}`);
    
    // Get followers count (people who follow this profile)
    // following_id = profileId means people following this profile
    console.log(`📊 [Profile Stats] Querying follows table where following_id = ${profileId}`);
    const { count: followersCount, error: followersError } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profileId);

    if (followersError) {
      console.error('❌ [Profile Stats] Followers count query error:', followersError);
      return { data: null, error: followersError };
    }
    console.log(`📊 [Profile Stats] Followers count query result: ${followersCount || 0}`);

    // Get actual followers data to ensure accurate count
    console.log(`📊 [Profile Stats] Fetching actual followers data...`);
    const { data: followersData, error: followersDataError } = await supabase
      .from('follows')
      .select('follower_id, following_id')
      .eq('following_id', profileId);
    
    if (followersDataError) {
      console.error('❌ [Profile Stats] Followers data query error:', followersDataError);
    } else {
      console.log(`📊 [Profile Stats] Followers data query returned ${followersData?.length || 0} rows`);
      if (followersData && followersData.length > 0) {
        console.log(`📊 [Profile Stats] Followers data:`, followersData.map(f => ({ 
          follower: f.follower_id, 
          following: f.following_id 
        })));
      } else {
        console.log(`📊 [Profile Stats] No followers found in database for profile ${profileId}`);
        // Debug: Let's check ALL follows to see what's in the table
        const { data: allFollows } = await supabase
          .from('follows')
          .select('follower_id, following_id')
          .limit(100);
        console.log(`📊 [Profile Stats] DEBUG: All follows in table (first 100):`, allFollows?.map(f => ({
          follower: f.follower_id,
          following: f.following_id
        })));
      }
    }
    
    const actualFollowersCount = followersData?.length || 0;
    console.log(`📊 [Profile Stats] Final followers count: ${actualFollowersCount}`);

    // Get following count (people this profile follows)
    console.log(`📊 [Profile Stats] Querying follows table where follower_id = ${profileId}`);
    const { data: followingData, error: followingError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', profileId);

    if (followingError) {
      console.error('❌ [Profile Stats] Following query error:', followingError);
      return { data: null, error: followingError };
    }
    
    const followingCount = followingData?.length || 0;
    console.log(`📊 [Profile Stats] Following count: ${followingCount}`);

    // Get highlights count - count all highlights in DB
    // Note: Some highlights may have missing/corrupted files, but we count them all
    // The UI will filter out broken ones when displaying
    const { count: highlightsCount, error: highlightsError } = await supabase
      .from('highlights')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profileId)
      .not('video_path', 'is', null); // Only count highlights with video_path

    if (highlightsError) {
      return { data: null, error: highlightsError };
    }

    const result = {
      data: {
        followers: Math.min(actualFollowersCount, 999), // Use actual data count for accuracy
        following: Math.min(followingCount, 999),
        highlights: Math.min(highlightsCount || 0, 999),
      },
      error: null,
    };
    
    console.log(`📊 [Profile Stats] ===== FINAL RESULT =====`);
    console.log(`📊 [Profile Stats] Followers: ${result.data.followers}`);
    console.log(`📊 [Profile Stats] Following: ${result.data.following}`);
    console.log(`📊 [Profile Stats] Highlights: ${result.data.highlights}`);
    console.log(`📊 [Profile Stats] ===== END =====`);
    
    return result;
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Upload profile image
 * Reads file data using expo-file-system and uploads as ArrayBuffer
 */
export async function uploadProfileImage(imageUri: string): Promise<{ data: string | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    // Store directly in bucket root with user ID prefix
    const filePath = `${user.id}/profile.${fileExt}`;

    console.log('📤 [Profile Image] Starting upload:', { filePath, imageUri });

    // Read file as base64 using expo-file-system legacy API
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log('📤 [Profile Image] File size (base64 length):', base64.length);

    // Convert base64 to ArrayBuffer using base64-arraybuffer
    const arrayBuffer = decode(base64);
    
    console.log('📤 [Profile Image] ArrayBuffer size:', arrayBuffer.byteLength);

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ [Profile Image] Upload error:', uploadError);
      return { data: null, error: uploadError };
    }

    console.log('✅ [Profile Image] Upload successful:', filePath);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profiles')
      .getPublicUrl(filePath);
    
    console.log('✅ [Profile Image] Public URL:', urlData.publicUrl);

    // Update profile with image URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ profile_image_url: urlData.publicUrl })
      .eq('id', user.id);

    if (updateError) {
      return { data: null, error: updateError };
    }

    return { data: urlData.publicUrl, error: null };
  } catch (error: any) {
    console.error('❌ [Profile Image] Exception:', error);
    return { data: null, error };
  }
}

