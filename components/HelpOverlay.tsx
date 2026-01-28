// components/HelpOverlay.tsx
import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from "react-native-reanimated";
import { theme } from "@/constants/theme";
import { Dimensions } from "react-native";

interface HelpOverlayProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function HelpOverlay({ visible, onClose, title, children }: HelpOverlayProps) {
  const screenWidth = Dimensions.get('window').width;
  const translateX = useSharedValue(-screenWidth);
  const opacity = useSharedValue(0);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const [isClosing, setIsClosing] = React.useState(false);

  const finishClose = () => {
    setIsClosing(false);
    onClose();
  };

  const handleClose = () => {
    setIsClosing(true);
    // Slide out to left
    translateX.value = withTiming(-screenWidth, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        // Call onClose after animation completes
        runOnJS(finishClose)();
      }
    });
  };

  React.useEffect(() => {
    if (visible && !isClosing) {
      // Reset position to off-screen left
      translateX.value = -screenWidth;
      // Reset scroll position when opening
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
      // Slide in from left
      translateX.value = withSpring(0, { damping: 35, stiffness: 100 });
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [visible, isClosing]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={StyleSheet.absoluteFill}>
        {/* Backdrop - clickable to close */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}>
          <BlurView
            intensity={20}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <Pressable 
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Content Container - prevents backdrop press */}
        <View style={styles.container} pointerEvents="box-none">
          <Animated.View 
            style={[styles.content, containerAnimatedStyle]}
            onStartShouldSetResponder={() => false}
            onMoveShouldSetResponder={() => false}
          >
            {/* Glassmorphism Background */}
            <BlurView
              intensity={50}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.15)',
                'rgba(255, 255, 255, 0.08)',
                'rgba(255, 255, 255, 0.04)',
              ]}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.12)', 'transparent']}
              locations={[0, 0.3]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            {/* Content Container - above background */}
            <View style={styles.contentContainer}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <Pressable
                  onPress={handleClose}
                  style={styles.closeButton}
                  hitSlop={10}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </Pressable>
              </View>

              {/* Scrollable Content */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                indicatorStyle="white"
                nestedScrollEnabled={true}
                bounces={true}
                scrollEnabled={true}
                alwaysBounceVertical={false}
                keyboardShouldPersistTaps="handled"
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
              >
                {children}
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 500,
    height: '80%',
    maxHeight: 600,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: -8,
  },
  closeButton: {
    padding: 4,
    marginRight: -8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
    gap: 20,
    flexGrow: 1,
  },
});
