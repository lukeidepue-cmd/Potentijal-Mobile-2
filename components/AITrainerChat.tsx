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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../constants/theme";
import { sendMessageToAI } from "../lib/api/ai-trainer";

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

export default function AITrainerChat({ onClose }: AITrainerChatProps) {
  const insets = useSafeAreaInsets();
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const fontsReady = geistLoaded;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI Trainer. I have access to all your workouts, games, practices, and meals. How can I help you improve today?",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable
          onPress={onClose}
          style={styles.backButton}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AI Trainer</Text>
          <Text style={styles.headerSubtitle}>Your personalized training coach</Text>
        </View>
      </View>

      {/* Messages */}
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
          <View style={styles.assistantMessageWrapper}>
            <View style={styles.assistantBubble}>
              <ActivityIndicator size="small" color={theme.colors.textHi} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask me anything about your training..."
          placeholderTextColor={theme.colors.textLo}
          multiline
          maxLength={500}
          editable={!isLoading}
        />
        <Pressable
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading}
          style={[
            styles.sendButton,
            (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
          ]}
        >
          <Ionicons
            name="send"
            size={20}
            color={(!inputText.trim() || isLoading) ? theme.colors.textLo : theme.colors.textHi}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.strokeSoft,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.textHi,
    fontFamily: FONT.uiBold,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textLo,
    marginTop: 2,
    fontFamily: FONT.uiRegular,
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
  },
  userMessageWrapper: {
    alignItems: "flex-end",
  },
  assistantMessageWrapper: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
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
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.strokeSoft,
    backgroundColor: theme.colors.bg0,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: theme.colors.surface1,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
    color: theme.colors.textHi,
    fontSize: 16,
    fontFamily: FONT.uiRegular,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary600,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.surface2,
    opacity: 0.5,
  },
});

