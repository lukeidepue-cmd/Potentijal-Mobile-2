// components/AITrainerChat.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { theme } from "../constants/theme";
import { sendMessageToAI } from "../lib/api/ai-trainer";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/* ---- Fonts ---- */
import {
  useFonts as useGeist,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from "@expo-google-fonts/geist";

const FONT = {
  uiRegular: "Geist_400Regular",
  uiMedium: "Geist_500Medium",
  uiSemi: "Geist_600SemiBold",
  uiBold: "Geist_700Bold",
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AITrainerChatProps {
  onClose: () => void;
}

const MESSAGES_STORAGE_KEY = '@ai_trainer_messages';

export default function AITrainerChat({ onClose }: AITrainerChatProps) {
  const insets = useSafeAreaInsets();
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const fontsReady = geistLoaded;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load messages from storage on mount
  useEffect(() => {
    loadMessages();
  }, []);

  // Save messages to storage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      const stored = await AsyncStorage.getItem(MESSAGES_STORAGE_KEY);
      if (stored) {
        const parsedMessages = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(messagesWithDates);
      }
    } catch (error) {
      console.error('❌ [AI Trainer] Error loading messages:', error);
    }
  };

  const saveMessages = async (msgs: Message[]) => {
    try {
      await AsyncStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(msgs));
    } catch (error) {
      console.error('❌ [AI Trainer] Error saving messages:', error);
    }
  };

  const clearMessages = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Clear Chat",
      "Are you sure you want to clear all messages?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(MESSAGES_STORAGE_KEY);
              setMessages([]);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (error) {
              console.error('❌ [AI Trainer] Error clearing messages:', error);
            }
          },
        },
      ]
    );
  };
  
  // Animation for input focus
  const inputScale = useSharedValue(1);

  // Bouncing dots animation for loading
  const dot1Opacity = useSharedValue(1);
  const dot2Opacity = useSharedValue(1);
  const dot3Opacity = useSharedValue(1);

  useEffect(() => {
    if (isLoading) {
      // Animate dots in sequence - each dot bounces with a delay
      const bounceAnimation = () => {
        return withRepeat(
          withSequence(
            withTiming(0.3, { duration: 300, easing: Easing.ease }),
            withTiming(1, { duration: 300, easing: Easing.ease }),
          ),
          -1, // Infinite loop
          false // Don't reverse
        );
      };

      // Start animations with delays for sequential bounce effect
      dot1Opacity.value = withDelay(0, bounceAnimation());
      dot2Opacity.value = withDelay(200, bounceAnimation());
      dot3Opacity.value = withDelay(400, bounceAnimation());
    } else {
      dot1Opacity.value = withTiming(1, { duration: 200 });
      dot2Opacity.value = withTiming(1, { duration: 200 });
      dot3Opacity.value = withTiming(1, { duration: 200 });
    }
  }, [isLoading]);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }));
  
  const inputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputScale.value }],
  }));

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    // Build conversation history for context
    const conversationHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const { data: aiResponse, error } = await sendMessageToAI(
      userMessage.content,
      conversationHistory
    );

    setIsLoading(false);

    if (error || !aiResponse) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error?.message || "Sorry, I'm having trouble connecting right now. Please try again later.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
  };

  if (!fontsReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  const hasMessages = messages.length > 0;

  return (
    <View style={styles.container}>
      {/* Blue gradient background (like account-basics) */}
      <LinearGradient
        colors={['#0B0F1A', '#0F1A2E', '#0F2A4A', '#070B10']}
        locations={[0, 0.3, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Vignette overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent', 'rgba(0,0,0,0.5)']}
        locations={[0, 0.15, 0.85, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Subtle grain */}
      <View style={styles.grainOverlay} pointerEvents="none" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable
          onPress={onClose}
          style={styles.backButton}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </Pressable>
        {messages.length > 0 && (
          <Pressable
            onPress={clearMessages}
            style={styles.deleteButton}
            hitSlop={10}
          >
            <Ionicons name="trash-outline" size={22} color={theme.colors.textLo} />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages or Welcome Screen */}
        {hasMessages ? (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageWrapper,
                  message.role === 'user' ? styles.userMessageWrapper : styles.assistantMessageWrapper,
                ]}
              >
                {message.role === 'assistant' && (
                  <Image
                    source={require("../assets/star.png")}
                    style={styles.messageStarIcon}
                    resizeMode="contain"
                  />
                )}
                <View
                  style={[
                    styles.messageBubble,
                    message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.role === 'user' ? styles.userMessageText : styles.assistantMessageText,
                    ]}
                  >
                    {message.content}
                  </Text>
                </View>
              </View>
            ))}

            {isLoading && (
              <View style={styles.loadingWrapper}>
                <Image
                  source={require("../assets/star.png")}
                  style={styles.messageStarIcon}
                  resizeMode="contain"
                />
                <View style={styles.bouncingDotsContainer}>
                  <Animated.View style={[styles.bouncingDot, dot1Style]} />
                  <Animated.View style={[styles.bouncingDot, dot2Style]} />
                  <Animated.View style={[styles.bouncingDot, dot3Style]} />
                </View>
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.welcomeContainer}>
            <Image
              source={require("../assets/star.png")}
              style={styles.welcomeStar}
              resizeMode="contain"
            />
            <Text style={styles.welcomeText}>How can I help you today!</Text>
          </View>
        )}

        {/* Floating Input Box */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
          <Animated.View style={[styles.floatingInputBox, inputAnimatedStyle]}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask me anything about your training..."
              placeholderTextColor={theme.colors.textLo}
              multiline
              maxLength={500}
              editable={!isLoading}
              onFocus={() => {
                setInputFocused(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                inputScale.value = withTiming(1.02, { duration: 250 });
              }}
              onBlur={() => {
                setInputFocused(false);
                inputScale.value = withTiming(1, { duration: 250 });
              }}
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              hitSlop={8}
            >
              <Ionicons
                name="send"
                size={20}
                color={(!inputText.trim() || isLoading) ? theme.colors.textLo : theme.colors.textHi}
              />
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg0,
  },
  grainOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.02)',
    opacity: 0.06,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    // No box styling - matches onboarding screens
  },
  deleteButton: {
    padding: 8,
    // No box styling - matches onboarding screens
  },
  keyboardView: {
    flex: 1,
  },
  welcomeContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  welcomeStar: {
    width: 192,
    height: 192,
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.textHi,
    fontFamily: FONT.uiSemi,
    textAlign: "center",
    marginTop: -84,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageWrapper: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  userMessageWrapper: {
    justifyContent: "flex-end",
  },
  assistantMessageWrapper: {
    justifyContent: "flex-start",
  },
  messageStarIcon: {
    width: 40,
    height: 40,
    marginRight: 10,
    marginBottom: -18,
  },
  messageBubble: {
    maxWidth: "65%",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: theme.colors.primary600,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: theme.colors.surface1,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: FONT.uiRegular,
  },
  userMessageText: {
    color: "#06160D",
  },
  assistantMessageText: {
    color: theme.colors.textHi,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  floatingInputBox: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: theme.colors.surface1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
    paddingHorizontal: 16,
    paddingVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingVertical: 8,
    color: theme.colors.textHi,
    fontSize: 16,
    fontFamily: FONT.uiRegular,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary600,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.surface2,
    opacity: 0.5,
  },
  loadingWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  bouncingDotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
  bouncingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.textHi,
  },
});
