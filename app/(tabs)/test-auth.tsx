// app/(tabs)/test-auth.tsx
// Temporary test authentication screen for development
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../providers/AuthProvider';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TestAuthScreen() {
  const { user, signIn, signUp, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('testpassword123');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    const { error } = isSignUp
      ? await signUp(email.trim(), password, {
          username: email.split('@')[0],
          display_name: email.split('@')[0],
        })
      : await signIn(email.trim(), password);

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message || 'Authentication failed');
    } else {
      Alert.alert('Success', isSignUp ? 'Account created! You can now use the app.' : 'Signed in!');
      router.replace('/(tabs)/workouts');
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    const { error } = await signOut();
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message || 'Failed to sign out');
    }
  };

  if (user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg0, paddingTop: insets.top + 16 }]}>
        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.textHi} />
        </Pressable>

        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.colors.textHi }]}>✅ Signed In</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textLo }]}>
            Email: {user.email}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textLo, fontSize: 12, marginTop: -8 }]}>
            User ID: {user.id}
          </Text>
          <Pressable
            onPress={handleSignOut}
            disabled={loading}
            style={[styles.button, { backgroundColor: '#B00020', marginTop: 24 }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Out</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            style={[styles.button, { backgroundColor: theme.colors.primary, marginTop: 12 }]}
          >
            <Text style={styles.buttonText}>Back to App</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg0, paddingTop: insets.top + 16 }]}>
      {/* Back button */}
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
        hitSlop={10}
      >
        <Ionicons name="chevron-back" size={22} color={theme.colors.textHi} />
      </Pressable>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.textHi }]}>
          Test Authentication
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textLo }]}>
          Sign in or create a test account to use the app
        </Text>

        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.bg1, color: theme.colors.textHi }]}
          placeholder="Email"
          placeholderTextColor={theme.colors.textLo}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.bg1, color: theme.colors.textHi }]}
          placeholder="Password"
          placeholderTextColor={theme.colors.textLo}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          onPress={handleAuth}
          disabled={loading}
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => setIsSignUp(!isSignUp)} style={styles.switchButton}>
          <Text style={[styles.switchText, { color: theme.colors.textLo }]}>
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    marginBottom: 16,
  },
  content: {
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    padding: 12,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
  },
});


