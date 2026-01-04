// app/(tabs)/profile/index.tsx
import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Modal,
  Dimensions,
  FlatList,
  ViewToken,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Video, ResizeMode, Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../providers/AuthProvider";
import { getMyProfile, getProfileStats, uploadProfileImage, type Profile } from "../../../lib/api/profile";
import { listHighlights, uploadHighlights, deleteHighlight, type Highlight as HighlightType } from "../../../lib/api/highlights";
import { Alert } from "react-native";
import { supabase } from "../../../lib/supabase";
import { useFeatures } from "../../../hooks/useFeatures";
import UpgradeModal from "../../../components/UpgradeModal";
import { blockUser, isUserBlocked } from "../../../lib/api/settings";
import { theme } from "../../../constants/theme";

/* ---- Fonts ---- */
import {
  useFonts as useGeist,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  Geist_800ExtraBold,
} from "@expo-google-fonts/geist";
import {
  useFonts as useSpaceGrotesk,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";

/* aliases */
const FONT = {
  uiRegular: "Geist_400Regular",
  uiMedium: "Geist_500Medium",
  uiSemi: "Geist_600SemiBold",
  uiBold: "Geist_700Bold",
  uiXBold: "Geist_800ExtraBold",
  displayMed: "SpaceGrotesk_600SemiBold",
  displayBold: "SpaceGrotesk_700Bold",
};

/* ---- Theme ---- */
const DARK = "#0A0F14";
const CARD = "#111822";
const TEXT = "#E6F1FF";
const DIM = "#8AA0B5";
const GREEN = "#2BF996";
const STROKE = "#1A2430";

// Highlight type matches API
type Highlight = { id: string; uri: string; video_url?: string };

/** Back-compat shim: prefer new `MediaType`, fall back to deprecated `MediaTypeOptions` */
const hasNewMediaType = !!(ImagePicker as any).MediaType;
const mediaTypesImage = hasNewMediaType
  ? { mediaTypes: [(ImagePicker as any).MediaType.image] }
  : { mediaTypes: ImagePicker.MediaTypeOptions.Images };
const mediaTypesVideo = hasNewMediaType
  ? { mediaTypes: [(ImagePicker as any).MediaType.video] }
  : { mediaTypes: ImagePicker.MediaTypeOptions.Videos };

export default function Profile() {
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    Geist_800ExtraBold,
  });
  const [sgLoaded] = useSpaceGrotesk({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });
  const fontsReady = geistLoaded && sgLoaded;
  const { canAddHighlights, canViewCreatorWorkouts } = useFeatures();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { user } = useAuth();
  const params = useLocalSearchParams<{ profileId?: string }>();
  const viewingProfileId = params.profileId || user?.id;
  const isViewingOwnProfile = !params.profileId || params.profileId === user?.id;

  // Configure audio to play through speakers
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false, // Play through speakers, not earpiece
    });
  }, []);

  /* -------- Profile data -------- */
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, highlights: 0 });
  const [loading, setLoading] = useState(true);
  const [pfpUri, setPfpUri] = useState<string | null>(null);

  /* -------- Load profile data -------- */
  const loadProfile = useCallback(async () => {
    if (!viewingProfileId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    if (isViewingOwnProfile && user) {
      // Viewing own profile
      const [profileResult, statsResult] = await Promise.all([
        getMyProfile(),
        getProfileStats(user.id),
      ]);

      if (profileResult.data) {
        setProfile(profileResult.data);
        // Only set pfpUri if we have a valid URL, and don't clear if we already have one
        if (profileResult.data.profile_image_url) {
          console.log('📸 [Profile] Setting profile image URL:', profileResult.data.profile_image_url);
          setPfpUri(profileResult.data.profile_image_url);
        } else if (!pfpUri) {
          // Only clear if we don't already have a URI set
          setPfpUri(null);
        }
      }
      if (statsResult.data) {
        console.log(`📊 [Profile] Stats for own profile:`, statsResult.data);
        setStats(statsResult.data);
      }
    } else {
      // Viewing another user's profile
      // First check if user is blocked
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: isBlocked } = await supabase
          .from('blocked_users')
          .select('id')
          .eq('blocker_id', viewingProfileId)
          .eq('blocked_id', currentUser.id)
          .single();
        
        if (isBlocked) {
          Alert.alert("Blocked", "You cannot view this profile");
          router.back();
          setLoading(false);
          return;
        }
      }

      // Check privacy settings - MUST check before loading profile
      console.log(`🔒 [Profile] ===== START Privacy Check for profile: ${viewingProfileId} =====`);
      console.log(`🔒 [Profile] Current user ID: ${currentUser?.id || 'none'}`);
      console.log(`🔒 [Profile] Viewing profile ID: ${viewingProfileId}`);
      
      const { data: privacySettings, error: privacyError } = await supabase
        .from('user_privacy_settings')
        .select('*')
        .eq('user_id', viewingProfileId)
        .maybeSingle(); // Use maybeSingle to handle case where no settings exist

      if (privacyError) {
        if (privacyError.code === 'PGRST116') {
          console.log(`🔒 [Profile] No privacy settings found (PGRST116) - defaulting to public`);
        } else {
          console.error('❌ [Profile] Error fetching privacy settings:', privacyError);
          console.error('❌ [Profile] Error code:', privacyError.code);
          console.error('❌ [Profile] Error message:', privacyError.message);
          // If RLS is blocking, we might get an error or empty result
          // Check if it's an RLS issue
          if (privacyError.code === '42501' || privacyError.message?.includes('permission') || privacyError.message?.includes('policy')) {
            console.warn('⚠️ [Profile] WARNING: This might be an RLS policy issue preventing access to privacy settings');
          }
        }
      }

      console.log(`🔒 [Profile] Privacy settings data:`, privacySettings ? JSON.stringify(privacySettings, null, 2) : 'null');
      
      // If privacySettings is null and no error, it means no settings exist (default to public)
      // But log it for debugging
      if (!privacySettings && !privacyError) {
        console.log(`🔒 [Profile] No privacy settings row exists for user ${viewingProfileId} - defaulting to public`);
      }

      // Check if current user is following the profile
      let isFollowing = false;
      if (currentUser) {
        // follows table has composite primary key (follower_id, following_id), no 'id' column
        const { data: followData, error: followError } = await supabase
          .from('follows')
          .select('follower_id') // Select any column that exists, we just need to check if row exists
          .eq('follower_id', currentUser.id)
          .eq('following_id', viewingProfileId)
          .maybeSingle(); // Use maybeSingle
        isFollowing = !!followData;
        console.log(`🔒 [Profile] Current user ${currentUser.id} is following ${viewingProfileId}: ${isFollowing}`);
        if (followError && followError.code !== 'PGRST116') {
          console.error('❌ [Profile] Error checking follow status:', followError);
        }
      }

      // Apply privacy checks - if settings exist, enforce them strictly
      if (privacySettings) {
        // Get visibility setting - handle both string and potential null/undefined
        const profileVisibility = privacySettings.who_can_see_profile?.toLowerCase() || 'everyone';
        console.log(`🔒 [Profile] Privacy settings found: who_can_see_profile="${profileVisibility}" (type: ${typeof profileVisibility}), isFollowing=${isFollowing}`);
        
        // If set to 'none', no one can view (except self, but we're already checking that)
        if (profileVisibility === 'none') {
          console.log(`🚫 [Profile] BLOCKING ACCESS - profile visibility is 'none'`);
          Alert.alert("Private Profile", "This profile is private.");
          router.back();
          setLoading(false);
          return;
        }
        
        // If set to 'followers', only followers can view
        if (profileVisibility === 'followers') {
          if (!isFollowing) {
            console.log(`🚫 [Profile] BLOCKING ACCESS - profile visibility is 'followers' and user is NOT following`);
            Alert.alert("Private Profile", "This profile is private. Follow to view.");
            router.back();
            setLoading(false);
            return;
          } else {
            console.log(`✅ [Profile] ALLOWING ACCESS - profile visibility is 'followers' and user IS following`);
          }
        }
        
        // If set to 'everyone', allow viewing (continue below)
        if (profileVisibility === 'everyone') {
          console.log(`✅ [Profile] ALLOWING ACCESS - profile visibility is 'everyone'`);
        }
      } else {
        console.log(`✅ [Profile] No privacy settings found - defaulting to public (allowing access)`);
      }
      console.log(`🔒 [Profile] ===== END Privacy Check - PROCEEDING TO LOAD PROFILE =====`);
      // If no privacy settings exist, default to public (allow viewing)

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, bio, profile_image_url, is_premium, is_creator, plan, sports, primary_sport')
        .eq('id', viewingProfileId)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);
        // Only set pfpUri if we have a valid URL
        if (profileData.profile_image_url) {
          console.log('📸 [Profile] Setting profile image URL:', profileData.profile_image_url);
          setPfpUri(profileData.profile_image_url);
        } else {
          setPfpUri(null);
        }
      }

      const statsResult = await getProfileStats(viewingProfileId);
      if (statsResult.data) {
        console.log(`📊 [Profile] Stats for ${viewingProfileId}:`, statsResult.data);
        setStats(statsResult.data);
      } else if (statsResult.error) {
        console.error(`❌ [Profile] Stats error for ${viewingProfileId}:`, statsResult.error);
      }
    }
    
    setLoading(false);
  }, [viewingProfileId, isViewingOwnProfile, user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Reload profile when screen comes into focus (e.g., after editing)
  // Also ensure we're on the index screen, not edit screen
  useFocusEffect(
    useCallback(() => {
      // If we're viewing own profile and somehow on edit screen, navigate to index
      if (isViewingOwnProfile && !params.profileId) {
        // Ensure we're on the profile index, not edit
        const currentRoute = router;
        // This will be handled by the Stack navigator
      }
      if (viewingProfileId) {
        loadProfile();
      }
    }, [viewingProfileId, loadProfile, isViewingOwnProfile, params.profileId])
  );

  /* -------- Load highlights -------- */
  const [clips, setClips] = useState<Highlight[]>([]);
  const [videoAspectRatios, setVideoAspectRatios] = useState<Map<string, number>>(new Map());
  
  useEffect(() => {
    if (!viewingProfileId) return;

    const loadHighlights = async () => {
      // Check highlights visibility privacy setting - MUST check before loading
      if (!isViewingOwnProfile) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          console.log(`🔒 [Highlights] Checking privacy for profile: ${viewingProfileId}`);
          const { data: privacySettings, error: privacyError } = await supabase
            .from('user_privacy_settings')
            .select('who_can_see_highlights')
            .eq('user_id', viewingProfileId)
            .maybeSingle(); // Use maybeSingle

          if (privacyError && privacyError.code !== 'PGRST116') {
            console.error('❌ [Highlights] Error fetching privacy settings:', privacyError);
          }

          if (privacySettings) {
            const highlightsVisibility = privacySettings.who_can_see_highlights;
            console.log(`🔒 [Highlights] Privacy settings found: who_can_see_highlights=${highlightsVisibility}`);
            
            // If set to 'none', no one can view highlights
            if (highlightsVisibility === 'none') {
              console.log(`🚫 [Highlights] Blocking access - highlights visibility is 'none'`);
              setClips([]);
              return;
            }
            
            // If set to 'followers', only followers can view
            if (highlightsVisibility === 'followers') {
              const { data: followData, error: followError } = await supabase
                .from('follows')
                .select('follower_id') // follows table has composite primary key, no 'id' column
                .eq('follower_id', currentUser.id)
                .eq('following_id', viewingProfileId)
                .maybeSingle(); // Use maybeSingle
              
              if (!followData) {
                // Not following, can't view highlights
                console.log(`🚫 [Highlights] Blocking access - highlights visibility is 'followers' and user is not following`);
                setClips([]);
                return;
              }
              console.log(`✅ [Highlights] User is following - allowing highlights`);
            }
            // If 'everyone' or user is following, continue to load highlights below
            console.log(`✅ [Highlights] Privacy check passed - loading highlights`);
          } else {
            console.log(`✅ [Highlights] No privacy settings found - defaulting to public`);
          }
          // If no privacy settings exist, default to public (load highlights)
        }
      }

      console.log(`📹 [Highlights] ===== START Loading highlights for profile: ${viewingProfileId} =====`);
      const { data, error } = await listHighlights(viewingProfileId);
      if (data) {
        console.log(`📹 [Highlights] Raw data from API: ${data.length} highlights`);
        const validClips = data
          .filter((h) => {
            const isValid = h.video_url && h.video_url.trim() !== '';
            if (!isValid) {
              console.log(`📹 [Highlights] Filtering out highlight ${h.id} - no valid video_url`);
            }
            return isValid;
          })
          .map((h) => ({ id: h.id, uri: h.video_url || '', video_url: h.video_url }));
        setClips(validClips);
        console.log(`📹 [Highlights] Valid clips: ${validClips.length} out of ${data.length} total`);
        console.log(`📹 [Highlights] Current stats.highlights before update: ${stats.highlights}`);
        
        // Update stats to reflect actual visible highlights count
        // This will override the count from getProfileStats with the actual valid count
        setStats(prev => {
          const newStats = { ...prev, highlights: validClips.length };
          console.log(`📹 [Highlights] Updated stats.highlights from ${prev.highlights} to ${newStats.highlights}`);
          return newStats;
        });
      } else if (error) {
        console.error('❌ [Highlights] Load error:', error);
      }
      console.log(`📹 [Highlights] ===== END =====`);
    };

    loadHighlights();
  }, [viewingProfileId, stats.highlights, isViewingOwnProfile]);

  /* -------- Avatar -------- */
  const pickPfp = async () => {
    // Only allow editing own profile
    if (!isViewingOwnProfile) return;
    
    const res = await ImagePicker.launchImageLibraryAsync({
      ...(mediaTypesImage as any),
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    } as any);
    if (!res.canceled && res.assets[0]) {
      const imageUri = res.assets[0].uri;
      setPfpUri(imageUri); // Optimistic update

      // Upload to Supabase
      const { data, error } = await uploadProfileImage(imageUri);
      if (error) {
        console.error('❌ [Profile] Upload error details:', error);
        Alert.alert("Error", `Failed to upload profile picture: ${error.message || 'Unknown error'}`);
        setPfpUri(profile?.profile_image_url || null); // Revert
      } else if (data) {
        // Set the new URL immediately (don't wait for reload)
        setPfpUri(data);
        // Update profile state with new image URL
        if (profile) {
          setProfile({ ...profile, profile_image_url: data });
        }
        // Reload profile in background to ensure consistency
        setTimeout(async () => {
          const { data: updatedProfile } = await getMyProfile();
          if (updatedProfile) {
            setProfile(updatedProfile);
            setPfpUri(updatedProfile.profile_image_url);
          }
        }, 500);
      }
    }
  };

  /* -------- Highlights -------- */
  const addHighlight = async () => {
    // Double-check premium status (defensive)
    if (!canAddHighlights) {
      console.log('🔒 [Profile] Add Highlights blocked - not premium');
      setShowUpgradeModal(true);
      return;
    }
    console.log('✅ [Profile] Add Highlights allowed - user is premium');
    const res = await ImagePicker.launchImageLibraryAsync({
      ...(mediaTypesVideo as any),
      quality: 1,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    } as any);
    if (!res.canceled && res.assets.length > 0) {
      const files = res.assets.map((a) => ({ uri: a.uri }));
      const { data, error } = await uploadHighlights(files);
      if (error) {
        console.error('❌ [Highlights] Upload error details:', error);
        Alert.alert("Error", `Failed to upload highlights: ${error.message || 'Unknown error'}`);
      } else if (data) {
        // Add new highlights to clips immediately
        const newClips = data.map((h) => ({ 
          id: h.id, 
          uri: h.video_url || '', 
          video_url: h.video_url 
        }));
        setClips(prev => [...newClips, ...prev]);
        
        // Reload highlights from DB to ensure consistency
        setTimeout(async () => {
          const { data: highlights } = await listHighlights(user!.id);
          if (highlights) {
            setClips(highlights.map((h) => ({ 
              id: h.id, 
              uri: h.video_url || '', 
              video_url: h.video_url 
            })));
          }
        }, 500);
        
        // Reload stats
        const { data: updatedStats } = await getProfileStats(user!.id);
        if (updatedStats) {
          setStats(updatedStats);
        }
      }
    }
  };

  /* -------- Fullscreen viewer -------- */
  const [viewerOpen, setViewerOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const players = useRef<Map<number, Video | null>>(new Map());
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!viewerOpen) return;
    players.current.forEach((ref, idx) => {
      if (!ref) return;
      if (idx === currentIndex) ref.playAsync().catch(() => {});
      else ref.pauseAsync().catch(() => {});
    });
  }, [currentIndex, viewerOpen]);

  const openViewer = (idx: number) => {
    setStartIndex(idx);
    setCurrentIndex(idx);
    setViewerOpen(true);
  };

  const deleteCurrent = async () => {
    const highlightToDelete = clips[currentIndex];
    if (!highlightToDelete) return;

    const { error } = await deleteHighlight(highlightToDelete.id);
    if (error) {
      Alert.alert("Error", "Failed to delete highlight");
      return;
    }

    // Update local state
    setClips((prev) => {
      const next = [...prev];
      next.splice(currentIndex, 1);
      if (next.length === 0) {
        setViewerOpen(false);
        return next;
      }
      const newIdx = Math.min(currentIndex, next.length - 1);
      setCurrentIndex(newIdx);
      return next;
    });

    // Reload stats
    if (user) {
      const { data: updatedStats } = await getProfileStats(user.id);
      if (updatedStats) {
        setStats(updatedStats);
      }
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length) {
        const idx = viewableItems[0].index ?? 0;
        setCurrentIndex(idx);
      }
    }
  ).current;

  const viewConfig = useMemo(() => ({ itemVisiblePercentThreshold: 80 }), []);

  if (!fontsReady || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: DARK, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  const displayName = profile?.display_name || "User";
  const username = profile?.username ? `@${profile.username}` : "@username";
  const bioText = profile?.bio || "";
  const highlightCount = stats.highlights;

  /* ---------------------------- UI ---------------------------- */
  return (
    <View style={{ flex: 1, backgroundColor: DARK }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 28, // CHANGE (SPACING): distance from last content to bottom (above tab bar)
          paddingTop: 44,    // CHANGE (SPACING): top inset above "Profile" heading
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button when viewing another user's profile */}
        {!isViewingOwnProfile && (
          <Pressable
            onPress={() => router.back()}
            style={{
              position: 'absolute',
              top: 44,
              left: 16,
              zIndex: 10,
              width: 40,
              height: 40,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.15)",
              backgroundColor: "rgba(0,0,0,0.3)",
              alignItems: "center",
              justifyContent: "center",
            }}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={22} color={TEXT} />
          </Pressable>
        )}

        {/* Heading (Space Grotesk) */}
        <Text style={styles.pageTitle}>Profile</Text>
        <View style={styles.headerRule} />

        {/* Top row */}
        <View style={styles.topRow}>
          <Pressable style={styles.pfpWrap} onPress={isViewingOwnProfile ? pickPfp : undefined}>
            {pfpUri ? (
              <Image 
                source={{ 
                  uri: pfpUri,
                  cache: 'reload' // Force reload to avoid stale cache
                }} 
                style={styles.pfpImg}
                onError={(error) => {
                  // Silently handle image load errors (old corrupted files may still be in DB)
                  // Only log in development
                  if (__DEV__) {
                    console.warn('⚠️ [Profile Image] Failed to load (may be corrupted or missing):', pfpUri);
                  }
                  // Clear the broken image URL so placeholder shows
                  setPfpUri(null);
                }}
                onLoad={() => {
                  console.log('✅ [Profile Image] Loaded successfully:', pfpUri);
                }}
              />
            ) : (
              <View style={styles.pfpPlaceholder}>
                <Ionicons name="add" size={28} color={DIM} />
              </View>
            )}
          </Pressable>

          <View style={{ flex: 1, marginLeft: 16 /* CHANGE (SPACING): gap between avatar and name/handle */ }}>
            {/* Display name (Geist) */}
            <Text style={styles.displayName}>{displayName}</Text>
            {/* Handle (system) */}
            <Text style={styles.handle}>{username}</Text>
          </View>
        </View>

        {/* Bio moved directly under name/avatar */}
        <View
          style={styles.bioCard}
          /* CHANGE (SPACING): bioCard.marginTop controls space between Name/Handle row and Bio block;
             bioCard.padding controls internal breathing room */
        >
          <Text style={styles.sectionHeading}>Bio</Text>
          <View style={{ height: 10 /* CHANGE (SPACING): space between "Bio" label and bio text */ }} />
          <Text style={styles.bioText}>{bioText}</Text>
        </View>

        {/* Followers / Following / Highlights */}
        <View
          style={styles.ffRowOuter}
          /* CHANGE (SPACING): ffRowOuter.marginTop is space between Bio block and stats row */
        >
          <Pressable 
            style={styles.ffCol}
            onPress={() => {
              if (stats.followers > 0 || isViewingOwnProfile) {
                router.push(`/(tabs)/profile/followers?profileId=${viewingProfileId}`);
              }
            }}
          >
            <Text style={styles.ffLabel /* CHANGE (TYPO/SPACE): label baseline offset via marginBottom */}>Followers</Text>
            <Text style={styles.ffNumber}>{stats.followers}</Text>
          </Pressable>
          <Pressable 
            style={styles.ffCol}
            onPress={() => {
              if (stats.following > 0 || isViewingOwnProfile) {
                router.push(`/(tabs)/profile/following?profileId=${viewingProfileId}`);
              }
            }}
          >
            <Text style={styles.ffLabel}>Following</Text>
            <Text style={styles.ffNumber}>{stats.following}</Text>
          </Pressable>
          <View style={styles.ffCol}>
            <Text style={styles.ffLabel}>Highlights</Text>
            <Text style={styles.ffNumber}>{highlightCount}</Text>
          </View>
        </View>

        {/* Buttons - only show for own profile */}
        {isViewingOwnProfile && (
          <>
            <View
              style={styles.btnRow}
              /* CHANGE (SPACING): btnRow.marginTop is space above buttons; marginBottom is space below buttons */
            >
              <Pressable
                style={[styles.pillBtn, styles.pillSolid]}
                // ***** ONLY CHANGE: use absolute path so the route is guaranteed to resolve
                onPress={() => router.push("/(tabs)/profile/edit")}
              >
                <Text style={[styles.pillText, { color: TEXT }]}>Edit Profile</Text>
              </Pressable>
              <Pressable 
                style={[
                  styles.pillBtn, 
                  styles.pillSolid,
                  !canAddHighlights && { opacity: 0.5 }
                ]} 
                onPress={() => {
                  console.log('🔍 [Profile] Add Highlights button pressed, canAddHighlights:', canAddHighlights);
                  if (!canAddHighlights) {
                    console.log('🔒 [Profile] Showing upgrade modal for Add Highlights');
                    setShowUpgradeModal(true);
                    return;
                  }
                  console.log('✅ [Profile] Calling addHighlight function');
                  addHighlight();
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {!canAddHighlights && (
                    <Ionicons name="lock-closed" size={16} color={TEXT} />
                  )}
                  <Text style={[styles.pillText, { color: TEXT }]}>Add Highlights</Text>
                </View>
              </Pressable>
            </View>

            {/* Find Friends and Creators button */}
            <Pressable
              style={[styles.pillBtn, styles.pillSolid, { marginTop: 18 }]}
              onPress={() => router.push("/(tabs)/profile/find-friends")}
            >
              <Text style={[styles.pillText, { color: TEXT }]}>Find Friends and Creators</Text>
            </Pressable>
          </>
        )}

        {/* View Creator Workouts button (for creators, own or others) */}
        {profile?.is_creator && (
          <Pressable
            style={[
              styles.pillBtn, 
              styles.pillSolid, 
              { marginTop: 12, backgroundColor: "#FFD700", borderColor: "#FFA500" },
              !canViewCreatorWorkouts && { opacity: 0.5 }
            ]}
            onPress={() => {
              if (canViewCreatorWorkouts) {
                router.push(`/(tabs)/profile/creator-workouts?profileId=${viewingProfileId}`);
              } else {
                setShowUpgradeModal(true);
              }
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {!canViewCreatorWorkouts && (
                <Ionicons name="lock-closed" size={16} color="#000" />
              )}
              <Text style={[styles.pillText, { color: "#000" }]}>View Creator Workouts</Text>
            </View>
          </Pressable>
        )}

        {/* Block User button (only when viewing other users' profiles) */}
        {!isViewingOwnProfile && profile && (
          <Pressable
            style={[
              styles.pillBtn,
              styles.pillSolid,
              { marginTop: 12, backgroundColor: theme.colors.danger + "20", borderColor: theme.colors.danger + "40" }
            ]}
            onPress={async () => {
              Alert.alert(
                "Block User",
                `Are you sure you want to block @${profile.username}? You won't be able to see their profile or content.`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Block",
                    style: "destructive",
                    onPress: async () => {
                      const { error } = await blockUser(profile.id);
                      if (error) {
                        Alert.alert("Error", error.message || "Failed to block user");
                      } else {
                        Alert.alert("Blocked", "User has been blocked");
                        router.back();
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="ban-outline" size={16} color={theme.colors.danger} />
            <Text style={[styles.pillText, { color: theme.colors.danger, marginLeft: 8 }]}>Block User</Text>
          </Pressable>
        )}

        {/* Highlights */}
        <Text
          style={[styles.sectionHeading, { marginTop: 18 }]}
          /* CHANGE (SPACING): this marginTop is the gap between Buttons row and "Highlights" heading */
        >
          Highlights
        </Text>

        {clips.length === 0 ? (
          <View
            style={styles.emptyCard}
            /* CHANGE (SPACING): emptyCard.marginTop = gap between heading and empty state card; paddingVertical = card height */
          >
            <Ionicons name="videocam-outline" size={28} color={DIM} />
            <Text style={{ color: DIM, marginTop: 10 /* CHANGE (SPACING): icon-to-text gap */ }}>
              No highlights yet
            </Text>
          </View>
        ) : (
          <Pressable
            key={`preview-${clips[0].id}`}
            style={styles.previewCard}
            onPress={() => openViewer(0)}
            /* CHANGE (SPACING): previewCard.marginTop = gap between heading and video preview */
          >
            <Video
              key={`video-${clips[0].id}`}
              source={{ 
                uri: clips[0].video_url || clips[0].uri || "",
              }}
              style={styles.previewVideo}
              resizeMode={ResizeMode.COVER}
              shouldPlay={false}
              isLooping
              isMuted={false}
              volume={1.0}
              useNativeControls={false}
              onError={(error: any) => {
                // Silently handle video load errors (old corrupted files may still be in DB)
                // Only log in development
                if (__DEV__) {
                  console.warn('⚠️ [Video] Preview failed to load (may be corrupted or missing)');
                }
                // Remove the broken video from clips
                setClips(prev => prev.filter(c => c.id !== clips[0].id));
              }}
              onLoad={(status: any) => {
                console.log('✅ [Video] Preview loaded:', clips[0].video_url || clips[0].uri);
                // Get video dimensions to determine aspect ratio (for fullscreen)
                if (status.naturalSize) {
                  const { width, height } = status.naturalSize;
                  const aspectRatio = width / height;
                  console.log(`📐 [Video] Aspect ratio: ${aspectRatio} (${width}x${height})`);
                  setVideoAspectRatios(prev => {
                    const newMap = new Map(prev);
                    newMap.set(clips[0].id, aspectRatio);
                    return newMap;
                  });
                }
              }}
              onLoadStart={() => {
                console.log('🔄 [Video] Preview loading started:', clips[0].video_url || clips[0].uri);
              }}
            />
          </Pressable>
        )}
      </ScrollView>

      {/* Upgrade Modal for Add Highlights */}
      {showUpgradeModal && (
        <UpgradeModal
          visible={showUpgradeModal}
          onClose={() => {
            console.log('🔍 [Profile] Closing upgrade modal');
            setShowUpgradeModal(false);
          }}
          featureName="Add Highlights"
        />
      )}

      {/* Full-screen viewer (unchanged) */}
      <Modal visible={viewerOpen} animationType="fade" onRequestClose={() => setViewerOpen(false)}>
        <View style={styles.viewer}>
          <FlatList
            data={clips}
            keyExtractor={(it) => it.id}
            initialScrollIndex={startIndex}
            onScrollToIndexFailed={() => {}}
            renderItem={({ item, index }) => (
              <View style={{ height: Dimensions.get("window").height }}>
                <Video
                  ref={(r) => {
                    players.current.set(index, r);
                  }}
                  source={{ 
                    uri: item.video_url || item.uri || "",
                  }}
                  style={styles.fullVideo}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={index === currentIndex}
                  isLooping
                  isMuted={false}
                  volume={1.0}
                  useNativeControls={false}
                  onError={(error: any) => {
                    // Silently handle video load errors (old corrupted files may still be in DB)
                    // Only log in development
                    if (__DEV__) {
                      console.warn('⚠️ [Video] Fullscreen failed to load (may be corrupted or missing)');
                    }
                    // Remove the broken video from clips
                    setClips(prev => prev.filter(c => c.id !== item.id));
                  }}
                  onLoad={(status: any) => {
                    console.log('✅ [Video] Fullscreen loaded:', item.video_url || item.uri);
                    // Get video dimensions to determine aspect ratio
                    if (status.naturalSize) {
                      const { width, height } = status.naturalSize;
                      const aspectRatio = width / height;
                      setVideoAspectRatios(prev => {
                        const newMap = new Map(prev);
                        newMap.set(item.id, aspectRatio);
                        return newMap;
                      });
                    }
                  }}
                  onLoadStart={() => {
                    console.log('🔄 [Video] Fullscreen loading started:', item.video_url || item.uri);
                  }}
                />
              </View>
            )}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewConfig}
          />

          <Pressable
            onPress={() => setViewerOpen(false)}
            style={[styles.navBtn, styles.backBtn, { top: insets.top + 10, left: 10 }]}
          >
            <Ionicons name="chevron-back" size={26} color="#FFF" />
          </Pressable>

          <Pressable
            onPress={deleteCurrent}
            style={[styles.navBtn, styles.trashBtn, { top: insets.top + 10, right: 10 }]}
          >
            <Ionicons name="trash-outline" size={22} color="#FFF" />
          </Pressable>

          <View style={[styles.hintWrap, { bottom: (insets.bottom || 0) - 16 }]}>
            <Text style={styles.hintText}>Scroll to see more highlights</Text>
            <Ionicons name="chevron-down" size={18} color="#FFF" style={{ marginTop: 2, opacity: 0.8 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ---------------------------- Styles ---------------------------- */
const styles = StyleSheet.create({
  // "Profile" -> Space Grotesk
  pageTitle: {
    color: TEXT,
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    fontFamily: "Geist_800ExtraBold",
  },
  headerRule: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    marginVertical: 10, // CHANGE (SPACING): space above and below the rule under "Profile"
    alignSelf: "stretch",
  },

  topRow: { flexDirection: "row", alignItems: "center", marginTop: 10 /* CHANGE (SPACING): gap above avatar/name row */ },

  pfpWrap: {
    width: 140,  // size only (kept from last version)
    height: 140, // size only
    borderRadius: 70,
    borderWidth: 2,
    borderColor: STROKE,
    overflow: "hidden",
    backgroundColor: "#0C1117",
  },
  pfpImg: { width: "100%", height: "100%" },
  pfpPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Display name -> Geist
  displayName: {
    color: TEXT,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 34,
    fontFamily: FONT.uiBold,
  },
  // Handle -> system
  handle: {
    color: DIM,
    marginTop: 4, // CHANGE (SPACING): vertical gap between name and handle
    fontSize: 16,
  },

  // “Invisible box” for bio
  bioCard: {
    marginTop: 24, // CHANGE (SPACING): space between Name/Handle row and Bio block
    padding: 12,   // CHANGE (SPACING): inner padding of the Bio block
    borderRadius: 12,
    borderWidth: 1,
    borderColor: STROKE,
    backgroundColor: CARD,
  },

  // Section headings -> Geist
  sectionHeading: { color: GREEN, fontSize: 22, fontWeight: "900", fontFamily: FONT.uiBold },

  // Bio description -> system
  bioText: { color: TEXT, fontSize: 14 },

  // Stats row (Followers / Following / Highlights)
  ffRowOuter: {
    marginTop: 22,            // CHANGE (SPACING): gap between Bio block and stats row
    flexDirection: "row",
    justifyContent: "space-between", // spread across full width
    alignItems: "flex-end",
  },
  ffCol: { alignItems: "center", flex: 1 },
  ffLabel: {
    color: DIM,
    fontSize: 12,
    marginBottom: -8, // CHANGE (SPACING): move label closer/farther from the number baseline
  },
  ffNumber: { color: TEXT, fontSize: 28, fontWeight: "900", fontFamily: FONT.uiBold },

  // Buttons row
  btnRow: {
    flexDirection: "row",
    gap: 12,        // CHANGE (SPACING): space between "Edit Profile" and "Add Highlights"
    marginTop: 18,  // CHANGE (SPACING): gap above buttons (from stats row)
    marginBottom: 4 // CHANGE (SPACING): gap below buttons (before "Highlights" header)
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 8, // CHANGE (SPACING): button vertical padding
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  pillSolid: {
    backgroundColor: "#22272E",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
  },
  pillText: { fontSize: 16, fontWeight: "900", fontFamily: FONT.uiBold },

  emptyCard: {
    marginTop: 16,     // CHANGE (SPACING): gap between "Highlights" header and empty state card
    borderRadius: 16,
    borderWidth: 1,
    borderColor: STROKE,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32, // CHANGE (SPACING): height/air inside the empty card
  },

  previewCard: {
    marginTop: 10, // CHANGE (SPACING): gap between "Highlights" header and video preview
    borderRadius: 16,
    borderWidth: 1,
    borderColor: STROKE,
    overflow: "hidden",
    backgroundColor: CARD,
  },
  previewVideo: { width: "100%", height: 280 },

  /* Viewer */
  viewer: { flex: 1, backgroundColor: "black" },
  fullVideo: { width: "100%", height: "100%", backgroundColor: "black" },

  navBtn: {
    position: "absolute",
    zIndex: 1000,
    elevation: 8,
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  backBtn: { left: 10 },
  trashBtn: {
    right: 10,
    backgroundColor: "#B00020",
    borderColor: "rgba(255,255,255,0.18)",
  },

  hintWrap: {
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
    zIndex: 10,
  },
  hintText: { color: "#FFF", opacity: 0.9, fontSize: 14, marginBottom: 2 },
});


























