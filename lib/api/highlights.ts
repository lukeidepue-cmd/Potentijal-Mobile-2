/**
 * Highlights API
 * Functions for managing highlight videos
 */

import { supabase } from '../supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export interface Highlight {
  id: string;
  user_id: string;
  video_path: string;
  video_url: string;
  created_at: string;
}

/**
 * Upload multiple highlight videos
 * Reads file data using expo-file-system and uploads as ArrayBuffer
 */
export async function uploadHighlights(files: Array<{ uri: string }>): Promise<{ data: Highlight[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const uploadedHighlights: Highlight[] = [];

    for (const file of files) {
      try {
        const fileExt = file.uri.split('.').pop()?.toLowerCase() || 'mp4';
        // Store directly in bucket root with user ID prefix
        const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Read file as base64 using expo-file-system legacy API
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Convert base64 to ArrayBuffer using base64-arraybuffer
        const arrayBuffer = decode(base64);
        
        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('highlights')
          .upload(filePath, arrayBuffer, {
            contentType: `video/${fileExt}`,
            upsert: false,
          });

        if (uploadError) continue;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('highlights')
          .getPublicUrl(filePath);

        // Insert highlight record
        const { data: highlightData, error: insertError } = await supabase
          .from('highlights')
          .insert({
            user_id: user.id,
            video_path: filePath,
          })
          .select('id, user_id, video_path, created_at')
          .single();

        if (insertError) {
          await supabase.storage.from('highlights').remove([filePath]);
          continue;
        }

        uploadedHighlights.push({
          ...highlightData,
          video_url: urlData.publicUrl,
        } as Highlight);
      } catch {
        continue;
      }
    }

    return { data: uploadedHighlights, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * List highlights for a profile
 */
export async function listHighlights(profileId: string): Promise<{ data: Highlight[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('highlights')
      .select('id, user_id, video_path, created_at')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error };
    }

    // Get signed URLs for all videos (valid for 1 hour)
    // Signed URLs work better for video playback in React Native
    const highlightsWithUrls = await Promise.all(
      (data || []).map(async (highlight) => {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('highlights')
          .createSignedUrl(highlight.video_path, 3600); // 1 hour expiry

        if (signedUrlError || !signedUrlData) {
          const { data: urlData } = supabase.storage
            .from('highlights')
            .getPublicUrl(highlight.video_path);
          
          return {
            ...highlight,
            video_url: urlData.publicUrl,
          } as Highlight;
        }

        return {
          ...highlight,
          video_url: signedUrlData.signedUrl,
        } as Highlight;
      })
    );

    return { data: highlightsWithUrls, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Delete a highlight
 */
export async function deleteHighlight(highlightId: string): Promise<{ data: boolean | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get the highlight to find the video path
    const { data: highlight, error: fetchError } = await supabase
      .from('highlights')
      .select('video_path, user_id')
      .eq('id', highlightId)
      .single();

    if (fetchError || !highlight) {
      return { data: null, error: fetchError || { message: 'Highlight not found' } };
    }

    // Verify ownership
    if (highlight.user_id !== user.id) {
      return { data: null, error: { message: 'Not authorized to delete this highlight' } };
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('highlights')
      .remove([highlight.video_path]);

    if (storageError) {
      // Continue to delete the database record anyway
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('highlights')
      .delete()
      .eq('id', highlightId);

    if (deleteError) {
      return { data: null, error: deleteError };
    }

    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

