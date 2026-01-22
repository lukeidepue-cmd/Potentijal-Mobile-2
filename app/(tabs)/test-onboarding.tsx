/**
 * Test Screen for Onboarding API Functions
 * Temporary screen to test all onboarding backend functions
 * This will be removed or kept for debugging after testing
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../providers/AuthProvider';
import {
  getOnboardingState,
  updateOnboardingStep,
  completeOnboarding,
  needsOnboarding,
  OnboardingData,
} from '../../lib/api/onboarding';
import { handleEmailVerificationLink, parseDeepLink } from '../../lib/deep-links';
import * as Linking from 'expo-linking';

export default function TestOnboarding() {
  const { user, needsOnboarding: authNeedsOnboarding, onboardingLoading, refreshOnboardingStatus } = useAuth();
  const [onboardingState, setOnboardingState] = useState<OnboardingData | null>(null);
  const [needsOnboardingResult, setNeedsOnboardingResult] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Log AuthProvider onboarding status when it changes
  useEffect(() => {
    console.log('🔵 [AuthProvider] Onboarding Status:', {
      needsOnboarding: authNeedsOnboarding,
      loading: onboardingLoading,
      user: user?.id,
    });
  }, [authNeedsOnboarding, onboardingLoading, user]);

  const handleGetState = async () => {
    setLoading(true);
    const { data, error } = await getOnboardingState();
    setLoading(false);
    
    if (error) {
      Alert.alert('Error', error.message || 'Failed to get onboarding state');
      return;
    }
    
    setOnboardingState(data);
    Alert.alert('Success', 'Onboarding state retrieved');
  };

  const handleUpdateStep = async (step: string) => {
    setLoading(true);
    const { data, error } = await updateOnboardingStep(step);
    setLoading(false);
    
    if (error) {
      Alert.alert('Error', error.message || 'Failed to update step');
      return;
    }
    
    if (data) {
      Alert.alert('Success', `Step updated to: ${step}`);
      // Refresh state
      handleGetState();
    }
  };

  const handleUpdateStepWithData = async () => {
    setLoading(true);
    const { data, error } = await updateOnboardingStep('training_intent', {
      training_intent: 'getting_stronger',
    });
    setLoading(false);
    
    if (error) {
      Alert.alert('Error', error.message || 'Failed to update step with data');
      return;
    }
    
    if (data) {
      Alert.alert('Success', 'Step updated with training_intent');
      handleGetState();
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    const { data, error } = await completeOnboarding();
    setLoading(false);
    
    if (error) {
      Alert.alert('Error', error.message || 'Failed to complete onboarding');
      return;
    }
    
    if (data) {
      Alert.alert('Success', 'Onboarding marked as complete');
      handleGetState();
      handleCheckNeeds();
    }
  };

  const handleCheckNeeds = async () => {
    setLoading(true);
    const { data, error } = await needsOnboarding();
    setLoading(false);
    
    if (error) {
      Alert.alert('Error', error.message || 'Failed to check needs onboarding');
      return;
    }
    
    setNeedsOnboardingResult(data);
    Alert.alert('Result', data ? 'User needs onboarding' : 'User does not need onboarding');
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please sign in to test onboarding functions</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Onboarding API Test Screen</Text>
      <Text style={styles.subtitle}>User ID: {user.id}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔵 AuthProvider Integration Test</Text>
        <View style={styles.authStatusContainer}>
          <Text style={styles.authStatusText}>
            Needs Onboarding: {authNeedsOnboarding === null ? 'null' : authNeedsOnboarding ? 'TRUE ✅' : 'FALSE ✅'}
          </Text>
          <Text style={styles.authStatusText}>
            Loading: {onboardingLoading ? 'Yes' : 'No'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.button, styles.refreshButton, loading && styles.buttonDisabled]}
          onPress={async () => {
            setLoading(true);
            await refreshOnboardingStatus();
            setLoading(false);
            Alert.alert('Success', 'Onboarding status refreshed from AuthProvider');
          }}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Refresh from AuthProvider</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Get Onboarding State</Text>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGetState}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Get State</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Update Steps</Text>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={() => handleUpdateStep('email_entry')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Update to: email_entry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={() => handleUpdateStep('account_basics')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Update to: account_basics</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={() => handleUpdateStep('sport_selection')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Update to: sport_selection</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleUpdateStepWithData}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Update with training_intent</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Complete Onboarding</Text>
        <TouchableOpacity
          style={[styles.button, styles.completeButton, loading && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Complete Onboarding</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Check Needs Onboarding</Text>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCheckNeeds}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Check Needs Onboarding</Text>
        </TouchableOpacity>
        {needsOnboardingResult !== null && (
          <Text style={styles.resultText}>
            Result: {needsOnboardingResult ? 'TRUE (needs onboarding)' : 'FALSE (completed)'}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Test Deep Link Handling</Text>
        <TouchableOpacity
          style={[styles.button, styles.deepLinkButton, loading && styles.buttonDisabled]}
          onPress={async () => {
            setLoading(true);
            // Test parsing a deep link URL
            const testUrl = 'myfirstapp://verify?token=test123&type=email';
            const { parseDeepLink } = await import('../../lib/deep-links');
            const parsed = parseDeepLink(testUrl);
            Alert.alert(
              'Deep Link Parsed',
              `Path: ${parsed.path}\nParams: ${JSON.stringify(parsed.params, null, 2)}`,
              [{ text: 'OK' }]
            );
            setLoading(false);
          }}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Parse Deep Link</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.deepLinkButton, loading && styles.buttonDisabled]}
          onPress={async () => {
            setLoading(true);
            // Test email verification handler (won't actually verify, just test parsing)
            const testUrl = 'myfirstapp://verify?token=test123&type=email';
            const { handleEmailVerificationLink } = await import('../../lib/deep-links');
            const result = await handleEmailVerificationLink(testUrl);
            Alert.alert(
              'Deep Link Handler Test',
              `Success: ${result.success}\n${result.error ? `Error: ${result.error}` : 'Note: This is a test token, verification will fail'}`,
              [{ text: 'OK' }]
            );
            setLoading(false);
          }}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Email Verification Handler</Text>
        </TouchableOpacity>
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionTitle}>To Test Real Deep Links:</Text>
          <Text style={styles.instructionText}>
            Option 1: Use Terminal{'\n'}
            npx uri-scheme open myfirstapp://verify?token=test123 --ios{'\n'}
            (or --android for Android)
          </Text>
          <Text style={styles.instructionText}>
            Option 2: Use Expo Go QR Scanner{'\n'}
            Create a QR code with: myfirstapp://verify?token=test123{'\n'}
            Scan it with Expo Go
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current State:</Text>
        {onboardingState ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>
              Current Step: {onboardingState.current_step || 'null'}
            </Text>
            <Text style={styles.stateText}>
              Completed Steps: {onboardingState.completed_steps.join(', ') || 'none'}
            </Text>
            <Text style={styles.stateText}>
              Completed: {onboardingState.completed ? 'Yes' : 'No'}
            </Text>
            <Text style={styles.stateText}>
              Training Intent: {onboardingState.training_intent || 'null'}
            </Text>
            <Text style={styles.stateText}>
              Completed At: {onboardingState.completed_at || 'null'}
            </Text>
          </View>
        ) : (
          <Text style={styles.stateText}>No state loaded yet</Text>
        )}
      </View>

      {loading && <Text style={styles.loadingText}>Loading...</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#34C759',
  },
  refreshButton: {
    backgroundColor: '#9C27B0',
  },
  deepLinkButton: {
    backgroundColor: '#FF9800',
  },
  instructionContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  instructionText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  authStatusContainer: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  authStatusText: {
    fontSize: 14,
    marginBottom: 5,
    fontWeight: '600',
    color: '#1976D2',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  stateContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  stateText: {
    fontSize: 14,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 50,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});
