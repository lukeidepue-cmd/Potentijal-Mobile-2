// app/onboarding/sport-selection.tsx
// Sport Selection Screen - Select up to 2 sports (UI matches reference: dark background, 2x2-style cards)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import { useOnboardingData } from '../../providers/OnboardingDataContext';

const TOTAL_STEPS = 7;
const CURRENT_STEP = 2;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 48 - CARD_GAP) / 2; // 24 padding each side, one gap between

const AVAILABLE_SPORTS = [
  { id: 'workout', name: 'Lifting', tagline: 'Build strength', icon: 'dumbbell' as const, lib: 'mci' as const },
  { id: 'basketball', name: 'Basketball', tagline: 'Shoot better', icon: 'basketball-outline', lib: 'ion' as const },
  { id: 'football', name: 'Football', tagline: 'Get faster', icon: 'american-football-outline', lib: 'ion' as const },
  { id: 'baseball', name: 'Baseball', tagline: 'Hit further', icon: 'baseball', lib: 'mci' as const },
  { id: 'soccer', name: 'Soccer', tagline: 'Score more', icon: 'football-outline', lib: 'ion' as const },
  { id: 'hockey', name: 'Hockey', tagline: 'Skate stronger', icon: 'hockey-sticks', lib: 'mci' as const },
  { id: 'tennis', name: 'Tennis', tagline: 'Serve better', icon: 'tennisball-outline', lib: 'ion' as const },
];

function SportCard({
  sport,
  isSelected,
  isDisabled,
  onToggle,
}: {
  sport: (typeof AVAILABLE_SPORTS)[number];
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: () => void;
}) {
  const overlayOpacity = useSharedValue(isSelected ? 1 : 0);
  React.useEffect(() => {
    overlayOpacity.value = withTiming(isSelected ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.ease),
    });
  }, [isSelected]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const iconColor = isSelected ? '#3A3A3C' : theme.colors.textHi;
  const titleColor = isSelected ? '#1C1C1E' : theme.colors.textHi;

  const IconComponent = sport.lib === 'mci' ? MaterialCommunityIcons : Ionicons;

  return (
    <View style={[styles.card, isDisabled && styles.cardDisabled]}>
      {/* Liquid glass base: blur + subtle sheen (unselected frosted look) */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 36 : 28}
        tint="dark"
        style={styles.cardBlur}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)', 'transparent']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Selected: light glass overlay fades in */}
      <Animated.View style={[styles.cardSelectedGlass, overlayStyle]} pointerEvents="none">
        <BlurView
          intensity={Platform.OS === 'ios' ? 50 : 40}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.85)', 'rgba(242,242,247,0.9)', 'rgba(229,229,234,0.95)']}
          locations={[0, 0.3, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <TouchableOpacity
        style={styles.cardInner}
        onPress={onToggle}
        disabled={isDisabled}
        activeOpacity={0.85}
      >
        <View style={styles.cardIconWrap}>
          <IconComponent
            name={sport.icon}
            size={44}
            color={iconColor}
            style={styles.cardIcon}
          />
        </View>
        <Text style={[styles.cardTitle, { color: titleColor }]} numberOfLines={1}>
          {sport.name}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function SportSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { setSports } = useOnboardingData();
  const [selectedSports, setSelectedSports] = useState<string[]>([]);

  const progressPercentage = (CURRENT_STEP / TOTAL_STEPS) * 100;

  const handleSportToggle = (sportId: string) => {
    if (selectedSports.includes(sportId)) {
      setSelectedSports(selectedSports.filter((id) => id !== sportId));
    } else {
      if (selectedSports.length < 2) {
        setSelectedSports([...selectedSports, sportId]);
      }
    }
  };

  const handleNext = () => {
    if (selectedSports.length === 0) return;
    const primarySport = selectedSports[0];
    setSports(selectedSports, primarySport);
    router.push('/onboarding/first-win');
  };

  const isFormValid = selectedSports.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Solid dark charcoal background (reference) */}
      <View style={styles.background} />

      {/* Header: keep current bar */}
      <View style={[styles.header, { zIndex: 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={styles.progressText}>{CURRENT_STEP}/{TOTAL_STEPS}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={[styles.content, { zIndex: 10 }]}>
        {/* Title - reference style (same typography as reference) */}
        <Text style={styles.title}>Which sports do you train?</Text>

        {/* 2-column grid of cards - scrollable */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.gridWrap, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {AVAILABLE_SPORTS.map((sport) => {
              const isSelected = selectedSports.includes(sport.id);
              const isDisabled = !isSelected && selectedSports.length >= 2;
              return (
                <SportCard
                  key={sport.id}
                  sport={sport}
                  isSelected={isSelected}
                  isDisabled={isDisabled}
                  onToggle={() => handleSportToggle(sport.id)}
                />
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Next button - reference: pill; enabled = solid white, disabled = frosted glass */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20, zIndex: 10 }]}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            isFormValid && styles.nextButtonEnabled,
            !isFormValid && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!isFormValid}
          activeOpacity={0.85}
        >
          {!isFormValid && (
            <>
              <BlurView intensity={Platform.OS === 'ios' ? 32 : 24} tint="dark" style={StyleSheet.absoluteFill} />
              <LinearGradient
                colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            </>
          )}
          <Text style={[
            styles.nextButtonText,
            !isFormValid && styles.nextButtonTextDisabled,
          ]}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1C1C1E',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginLeft: 20,
  },
  progressBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.strokeSoft,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary600,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textLo,
    minWidth: 30,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 32,
    marginBottom: 28,
    letterSpacing: -0.3,
  },
  scrollView: {
    flex: 1,
  },
  gridWrap: {
    paddingTop: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -CARD_GAP / 2,
  },
  card: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_GAP / 2,
    marginBottom: CARD_GAP,
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 140,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cardBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  cardSelectedGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardInner: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: 140,
    zIndex: 10,
  },
  cardIconWrap: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: 0,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  nextButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    // Default (disabled): transparent so BlurView shows
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  nextButtonEnabled: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  nextButtonDisabled: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  nextButtonText: {
    color: '#1C1C1E',
    fontSize: 17,
    fontWeight: '700',
  },
  nextButtonTextDisabled: {
    color: 'rgba(255,255,255,0.6)',
  },
});
