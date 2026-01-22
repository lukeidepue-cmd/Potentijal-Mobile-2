import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

// Premium glassmorphism tab bar background
export default function TabBarBackground() {
  if (Platform.OS === 'ios') {
    // iOS: Use BlurView for true glassmorphism
    return (
      <BlurView
        intensity={20}
        tint="dark"
        style={StyleSheet.absoluteFill}
      >
        {/* Subtle gradient overlay for depth */}
        <LinearGradient
          colors={['rgba(11, 11, 12, 0.4)', 'rgba(11, 11, 12, 0.7)', 'rgba(11, 11, 12, 0.95)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </BlurView>
    );
  } else {
    // Android/Web: Use gradient with slight blur simulation
    return (
      <LinearGradient
        colors={['rgba(11, 11, 12, 0.85)', 'rgba(11, 11, 12, 0.95)', 'rgba(11, 11, 12, 1)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    );
  }
}

export function useBottomTabOverflow() {
  return 0;
}
