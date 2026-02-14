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
    const { data: followersData, error: followersDataError } = await supabase
      .from('follows')
      .select('follower_id, following_id')
      .eq('following_id', profileId);

    if (followersDataError) {
      return { data: null, error: followersDataError };
    }

    const actualFollowersCount = followersData?.length || 0;

    const { data: followingData, error: followingError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', profileId);

    if (followingError) {
      return { data: null, error: followingError };
    }

    const followingCount = followingData?.length || 0;

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

    return {
      data: {
        followers: Math.min(actualFollowersCount, 999),
        following: Math.min(followingCount, 999),
        highlights: Math.min(highlightsCount || 0, 999),
      },
      error: null,
    };
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

    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const arrayBuffer = decode(base64);

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

    if (uploadError) {
      return { data: null, error: uploadError };
    }

    const { data: urlData } = supabase.storage
      .from('profiles')
      .getPublicUrl(filePath);

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
    return { data: null, error };
  }
}

