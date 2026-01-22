// app/(tabs)/profile/followers.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../providers/AuthProvider";
import { listFollowers, searchFollowers, follow, unfollow, type ProfileWithFollowStatus } from "../../../lib/api/social";
import { theme } from "../../../constants/theme";

/* ---- Fonts ---- */
import {
  useFonts as useGeist,
  Geist_700Bold,
  Geist_800ExtraBold,
} from "@expo-google-fonts/geist";
import {
  useFonts as useSpaceGrotesk,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";

export default function Followers() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ profileId?: string }>();
  const profileId = params.profileId || user?.id;

  const [geistLoaded] = useGeist({ Geist_700Bold, Geist_800ExtraBold });
  const [sgLoaded] = useSpaceGrotesk({ SpaceGrotesk_700Bold });
  const fontsReady = geistLoaded && sgLoaded;

  const [searchQuery, setSearchQuery] = useState("");
  const [profiles, setProfiles] = useState<ProfileWithFollowStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState<Map<string, boolean>>(new Map());

  // Load followers on mount
  useEffect(() => {
    if (!user || !profileId) return;
    loadFollowers();
  }, [user, profileId]);

  // Search followers when query changes (debounced)
  useEffect(() => {
    if (!user || !profileId) return;

    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchFollowersDebounced(searchQuery);
      } else {
        loadFollowers();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, profileId]);

  const loadFollowers = async () => {
    if (!user || !profileId) return;
    setLoading(true);
    const { data, error } = await listFollowers(profileId);
    if (data) {
      setProfiles(data);
      const map = new Map<string, boolean>();
      data.forEach((p) => map.set(p.id, p.is_following));
      setFollowingMap(map);
    }
    setLoading(false);
  };

  const searchFollowersDebounced = async (query: string) => {
    if (!user || !profileId) return;
    setLoading(true);
    const { data, error } = await searchFollowers(profileId, query);
    if (data) {
      setProfiles(data);
      const map = new Map<string, boolean>();
      data.forEach((p) => map.set(p.id, p.is_following));
      setFollowingMap(map);
    }
    setLoading(false);
  };

  const handleFollowToggle = async (profileId: string, currentlyFollowing: boolean) => {
    if (!user) return;

    // Optimistic update
    const newMap = new Map(followingMap);
    newMap.set(profileId, !currentlyFollowing);
    setFollowingMap(newMap);

    const { error } = currentlyFollowing
      ? await unfollow(profileId)
      : await follow(profileId);

    if (error) {
      // Revert on error
      newMap.set(profileId, currentlyFollowing);
      setFollowingMap(newMap);
    } else {
      // Update profile list
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profileId ? { ...p, is_following: !currentlyFollowing } : p
        )
      );
    }
  };

  if (!fontsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg0, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg0, paddingTop: insets.top + 16 }}>
      {/* Back button */}
      <Pressable
        onPress={() => router.back()}
        style={styles.backBtn}
        hitSlop={10}
      >
        <Ionicons name="chevron-back" size={22} color={theme.colors.textHi} />
      </Pressable>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      >
        {/* Title */}
        <Text style={styles.title}>Followers</Text>
        <View style={styles.rule} />

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textLo} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search followers..."
            placeholderTextColor={theme.colors.textLo}
            style={styles.searchInput}
            autoCapitalize="none"
          />
        </View>

        {/* Profiles list */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator />
          </View>
        ) : profiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Image
              source={require("../../../assets/empty-star.png")}
              style={styles.emptyStar}
              resizeMode="contain"
            />
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? "No followers found" : "No followers yet"}
            </Text>
          </View>
        ) : (
          <View style={styles.profilesList}>
            {profiles.map((profile) => {
              const isFollowing = followingMap.get(profile.id) || false;
              return (
                <Pressable
                  key={profile.id}
                  style={styles.profileRow}
                  onPress={() => {
                    router.push(`/(tabs)/profile?profileId=${profile.id}`);
                  }}
                >
                  {/* Profile picture with golden glow for creators */}
                  <View style={styles.profilePicContainer}>
                    {profile.is_creator && (
                      <View style={styles.goldenGlow} />
                    )}
                    {profile.profile_image_url ? (
                      <Image
                        source={{ uri: profile.profile_image_url }}
                        style={styles.profilePic}
                      />
                    ) : (
                      <View style={[styles.profilePic, styles.profilePicPlaceholder]}>
                        <Ionicons name="person" size={24} color={theme.colors.textLo} />
                      </View>
                    )}
                  </View>

                  {/* Name and username */}
                  <View style={styles.profileInfo}>
                    <Text style={styles.displayName}>{profile.display_name}</Text>
                    <Text style={styles.username}>@{profile.username}</Text>
                  </View>

                  {/* Follow/Unfollow button */}
                  {profile.id !== user?.id && (
                    <Pressable
                      style={[
                        styles.followBtn,
                        isFollowing && styles.followingBtn,
                      ]}
                      onPress={() => handleFollowToggle(profile.id, isFollowing)}
                    >
                      <Text
                        style={[
                          styles.followBtnText,
                          isFollowing && styles.followingBtnText,
                        ]}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </Text>
                    </Pressable>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    // No box styling - matches onboarding screens
    marginLeft: 16,
    marginBottom: 16,
  },
  title: {
    color: theme.colors.textHi,
    fontSize: 28,
    marginTop: 18,
    fontFamily: "Geist_800ExtraBold",
    letterSpacing: 0.2,
  },
  rule: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    marginTop: 8,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0E1216",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.textHi,
    fontSize: 16,
    paddingVertical: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 400,
    paddingVertical: 60,
  },
  emptyStar: {
    width: 182,
    height: 182,
    marginBottom: -30,
  },
  emptyText: {
    color: theme.colors.textLo,
    fontSize: 26,
  },
  profilesList: {
    gap: 12,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#0E1216",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  profilePicContainer: {
    position: "relative",
    marginRight: 12,
  },
  goldenGlow: {
    position: "absolute",
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 30,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  profilePicPlaceholder: {
    backgroundColor: "#1A2430",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
  },
  displayName: {
    color: theme.colors.textHi,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  username: {
    color: theme.colors.textLo,
    fontSize: 14,
  },
  followBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.primary600,
  },
  followingBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  followBtnText: {
    color: "#06160D",
    fontWeight: "700",
    fontSize: 14,
  },
  followingBtnText: {
    color: theme.colors.textHi,
  },
});

