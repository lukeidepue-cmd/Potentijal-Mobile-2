// components/Confetti.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPiece {
  id: number;
  color: string;
  startX: number;
  startY: number;
  rotation: number;
  size: number;
}

const COLORS = ['#3eb489', '#4A9EFF', '#FFD700', '#FF6B6B', '#9B59B6', '#FFA500', '#00CED1', '#FF1493'];

interface ConfettiProps {
  active: boolean;
  onComplete?: () => void;
}

export function Confetti({ active, onComplete }: ConfettiProps) {
  const pieces: ConfettiPiece[] = React.useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      color: COLORS[i % COLORS.length],
      startX: Math.random() * SCREEN_WIDTH,
      startY: -20 - Math.random() * 20,
      rotation: Math.random() * 360,
      size: 8 + Math.random() * 8,
    }));
  }, []);

  const opacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      opacity.value = withTiming(1, { duration: 200 });
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 500 }, () => {
          if (onComplete) {
            runOnJS(onComplete)();
          }
        });
      }, 4000); // Extended to match slower fall (was 2500ms, now 4000ms for 3.5-5 second animation)
      return () => clearTimeout(timer);
    }
  }, [active, opacity, onComplete]);

  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((piece) => (
        <ConfettiPiece key={piece.id} piece={piece} opacity={opacity} />
      ))}
    </View>
  );
}

interface ConfettiPieceProps {
  piece: ConfettiPiece;
  opacity: Animated.SharedValue<number>;
}

function ConfettiPiece({ piece, opacity }: ConfettiPieceProps) {
  const translateY = useSharedValue(piece.startY);
  const translateX = useSharedValue(piece.startX);
  const rotation = useSharedValue(piece.rotation);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Random horizontal drift
    const drift = (Math.random() - 0.5) * 200;
    const finalX = piece.startX + drift;
    const finalY = SCREEN_HEIGHT + 100;
    const finalRotation = piece.rotation + (Math.random() * 720 - 360);

    translateX.value = withSpring(finalX, {
      damping: 10,
      stiffness: 50,
    });
    translateY.value = withTiming(finalY, {
      duration: 3500 + Math.random() * 1500, // Slower: 3.5-5 seconds (was 2-3 seconds)
      easing: Easing.out(Easing.quad),
    });
    rotation.value = withTiming(finalRotation, {
      duration: 3500 + Math.random() * 1500, // Slower: 3.5-5 seconds (was 2-3 seconds)
      easing: Easing.linear,
    });
    scale.value = withSequence(
      withTiming(1.2, { duration: 200 }),
      withTiming(0.8, { duration: 3300 }), // Extended to match slower fall (was 1800)
      withTiming(0, { duration: 300 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation.value}deg` },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[styles.piece, animatedStyle]}>
      <View
        style={[
          styles.confetti,
          {
            backgroundColor: piece.color,
            width: piece.size,
            height: piece.size,
            borderRadius: piece.size / 4,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  piece: {
    position: 'absolute',
  },
  confetti: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
});

