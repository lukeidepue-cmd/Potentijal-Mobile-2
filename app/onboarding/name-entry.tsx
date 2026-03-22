import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { theme } from '../../constants/theme';
import { updateProfileFromOnboarding, completeOnboarding } from '../../lib/api/onboarding';
import { useAuth } from '../../providers/AuthProvider';

const TOTAL_STEPS = 7;
const CURRENT_STEP = 7;

export default function NameEntryScreen() {
  const insets = useSafeAreaInsets();
  const { setOnboardingComplete } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const dot1Opacity = useSharedValue(1);
  const dot2Opacity = useSharedValue(1);
  const dot3Opacity = useSharedValue(1);

  React.useEffect(() => {
    if (loading) {
      const bounce = () =>
        withRepeat(
          withSequence(
            withTiming(0.3, { duration: 300, easing: Easing.ease }),
            withTiming(1, { duration: 300, easing: Easing.ease }),
          ),
          -1,
          true,
        );
      dot1Opacity.value = withDelay(0, bounce());
      dot2Opacity.value = withDelay(200, bounce());
      dot3Opacity.value = withDelay(400, bounce());
    } else {
      dot1Opacity.value = withTiming(1, { duration: 200 });
      dot2Opacity.value = withTiming(1, { duration: 200 });
      dot3Opacity.value = withTiming(1, { duration: 200 });
    }
  }, [loading]);

  const dot1Style = useAnimatedStyle(() => ({ opacity: dot1Opacity.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dot2Opacity.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dot3Opacity.value }));

  const progressPercentage = (CURRENT_STEP / TOTAL_STEPS) * 100;
  const isFormValid = name.trim().length > 0;

  const handleFinish = async () => {
    if (!isFormValid) return;

    setLoading(true);
    try {
      const { error: profileError } = await updateProfileFromOnboarding({
        display_name: name.trim(),
      });

      if (profileError) {
        const isNetwork =
          profileError.message?.toLowerCase().includes('network') ||
          profileError.message?.toLowerCase().includes('fetch') ||
          profileError.message?.toLowerCase().includes('connection');

        if (isNetwork) {
          Alert.alert('Connection Error', 'Please check your internet connection and try again.', [
            { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
            { text: 'Retry', onPress: () => handleFinish() },
          ]);
          return;
        }
        Alert.alert('Error', profileError.message || 'Failed to save your name.');
        setLoading(false);
        return;
      }

      const { error: completeError } = await completeOnboarding();
      if (completeError) {
        Alert.alert('Error', completeError.message || 'Failed to complete onboarding.');
        setLoading(false);
        return;
      }

      setOnboardingComplete();
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Same background as other onboarding screens */}
        <View style={styles.background} />

        {/* Header - same as other screens */}
        <View style={[styles.header, { zIndex: 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
            </View>
            <Text style={styles.progressText}>{CURRENT_STEP}/{TOTAL_STEPS}</Text>
          </View>
        </View>

        {/* Content - same heading style as other screens */}
        <View style={[styles.content, { zIndex: 10 }]}>
          <Text style={styles.title}>What should we call you?</Text>
          <Text style={styles.subtitle}>This is how you'll appear in the app.</Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputGlass}>
              <BlurView
                intensity={Platform.OS === 'ios' ? 36 : 28}
                tint="dark"
                style={styles.inputGlassBlur}
              />
              <LinearGradient
                colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.08)']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={theme.colors.textLo}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>
        </View>

        {/* Start Training button - same style as other Next buttons */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20, zIndex: 10 }]}>
          <TouchableOpacity
            style={[
              styles.finishButton,
              isFormValid && !loading && styles.finishButtonEnabled,
              (!isFormValid || loading) && styles.finishButtonDisabled,
            ]}
            onPress={handleFinish}
            disabled={!isFormValid || loading}
            activeOpacity={0.85}
          >
            {(!isFormValid || loading) && (
              <>
                <BlurView intensity={Platform.OS === 'ios' ? 32 : 24} tint="dark" style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)']}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              </>
            )}
            {loading ? (
              <View style={styles.loadingContainer}>
                <Animated.View style={[styles.bouncingDot, dot1Style]} />
                <Animated.View style={[styles.bouncingDot, dot2Style]} />
                <Animated.View style={[styles.bouncingDot, dot3Style]} />
              </View>
            ) : (
              <Text
                style={[
                  styles.finishButtonText,
                  (!isFormValid || loading) && styles.finishButtonTextDisabled,
                ]}
              >
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
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
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textLo,
    lineHeight: 24,
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputGlass: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
    minHeight: 52,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  inputGlassBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  textInput: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: theme.colors.textHi,
    zIndex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  finishButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  finishButtonEnabled: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  finishButtonDisabled: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  finishButtonText: {
    color: '#1C1C1E',
    fontSize: 17,
    fontWeight: '700',
  },
  finishButtonTextDisabled: {
    color: 'rgba(255,255,255,0.6)',
  },
  loadingContainer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bouncingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
});
