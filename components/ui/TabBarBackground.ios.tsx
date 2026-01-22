import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

export default function BlurTabBarBackground() {
  return (
    <LinearGradient
      colors={['transparent', 'rgba(11, 11, 12, 0.3)', 'rgba(11, 11, 12, 0.9)', 'rgba(11, 11, 12, 1)']}
      locations={[0, 0.3, 0.7, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}
