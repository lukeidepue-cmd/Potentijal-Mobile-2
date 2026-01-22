// app/(tabs)/settings/account/email-password.tsx
// Email & Password Settings Screen
import React, { useState, useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";
import { updateEmail, updatePassword } from "@/lib/api/settings";
import { supabase } from "@/lib/supabase";
import { LinearGradient } from "expo-linear-gradient";

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

export default function EmailPasswordSettings() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const fontsReady = geistLoaded;

  // Initialize currentEmail from user context, but only if we haven't just updated
  const [currentEmail, setCurrentEmail] = useState(() => {
    // Initialize with user email if available, otherwise empty string
    return user?.email || "";
  });
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [emailJustUpdated, setEmailJustUpdated] = useState(false); // Track if we just updated email
  const [lastUpdatedEmail, setLastUpdatedEmail] = useState<string | null>(null); // Track the email we just updated to
  const emailUpdateRef = useRef<string | null>(null); // Ref to track the email we're updating to (for immediate access)
  const pendingEmailRef = useRef<string | null>(null); // Ref to track pending email that needs confirmation
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null); // Ref to store the interval so we can clear it
  const emailConfirmedRef = useRef<boolean>(false); // Ref to track if email was confirmed (to force update)

  useEffect(() => {
    // CRITICAL: Check for pending email FIRST - this prevents old email from showing during confirmation wait
    if (pendingEmailRef.current) {
      // We have a pending email waiting for confirmation
      // Only update if the pending email was confirmed
      if (user?.email && user.email.toLowerCase() === pendingEmailRef.current.toLowerCase()) {
        // Pending email was confirmed! Update the display
        const confirmedEmail = user.email;
        // Clear all flags and refs first
        pendingEmailRef.current = null;
        emailUpdateRef.current = null;
        emailConfirmedRef.current = true; // Mark as confirmed
        setEmailJustUpdated(false);
        setLastUpdatedEmail(null);
        // Update the email display
        setCurrentEmail(confirmedEmail);
        // Clear any running interval
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
      } else {
        // Still waiting for confirmation - keep showing the CURRENT email (old one)
        // Don't update until confirmation link is clicked
        // Don't change currentEmail - keep what's currently showing (the old email)
      }
      return; // Exit early - don't process further
    }
    
    // CRITICAL: Check ref for immediate access (before state updates take effect)
    const expectedEmail = emailUpdateRef.current || lastUpdatedEmail;
    
    // If we just updated the email, NEVER override it with old email from user context
    if (emailJustUpdated && expectedEmail) {
      // We just updated - only update if user context confirms the NEW email
      if (user?.email && user.email.toLowerCase() === expectedEmail.toLowerCase()) {
        // User context has confirmed the new email - safe to update and clear flags
        setCurrentEmail(user.email);
        emailUpdateRef.current = null; // Clear the ref first
        setEmailJustUpdated(false);
        setLastUpdatedEmail(null);
      } else {
        // User context still has old email - IGNORE IT and keep the new email
        // Force set the new email to ensure it's displayed
        setCurrentEmail(prev => {
          if (prev.toLowerCase() !== expectedEmail.toLowerCase()) {
            return expectedEmail;
          }
          return prev;
        });
      }
      return; // Exit early - don't process further
    }
    
    // If emailJustUpdated is true but no expectedEmail (pending confirmation), block ALL updates
    // Keep showing the current email (old one) until confirmation link is clicked
    if (emailJustUpdated && !expectedEmail && pendingEmailRef.current) {
      // Don't change currentEmail - keep what's currently showing (the old email)
      return; // Exit early - don't process further, don't let old email override
    }
    
    // Normal case: update from user context (only when we haven't just updated and no pending email)
    // BUT: Only update if the user context email matches what we currently have displayed
    // This prevents the old email from overriding after we've confirmed a new email
    // CRITICAL: Also check if emailJustUpdated is true but expectedEmail is null (pending confirmation)
    const hasPendingConfirmation = emailJustUpdated && !lastUpdatedEmail && !emailUpdateRef.current;
    
    // If all flags are cleared and no pending email, always update from user context
    if (user?.email && !emailJustUpdated && !emailUpdateRef.current && !pendingEmailRef.current && !hasPendingConfirmation) {
      setCurrentEmail(prev => {
        // Update if email is different from current
        if (prev.toLowerCase() !== user.email.toLowerCase()) {
          // If we have a lastUpdatedEmail, only update if user context matches it
          if (lastUpdatedEmail) {
            if (user.email.toLowerCase() === lastUpdatedEmail.toLowerCase()) {
              // User context matches the expected email - safe to update and clear flags
              setEmailJustUpdated(false);
              setLastUpdatedEmail(null);
              return user.email;
            } else {
              // User context has different email than expected - keep current
              return prev;
            }
          }
          // No lastUpdatedEmail - safe to update from user context
          return user.email;
        }
        return prev;
      });
    }
    
    // CRITICAL: If email was confirmed, ensure it matches user context and keep it updated
    if (emailConfirmedRef.current && user?.email) {
      // Email was confirmed - update display to match user context (the new confirmed email)
      setCurrentEmail(user.email);
      // Clear flags since confirmation is complete
      emailConfirmedRef.current = false;
      setEmailJustUpdated(false);
      setLastUpdatedEmail(null);
      emailUpdateRef.current = null;
      pendingEmailRef.current = null;
      return;
    }
    
    // CRITICAL: If all flags are cleared, always sync with user context
    // This ensures the email display stays in sync with Supabase
    if (user?.email && !emailJustUpdated && !lastUpdatedEmail && !emailUpdateRef.current && !pendingEmailRef.current && !emailConfirmedRef.current) {
      setCurrentEmail(prev => {
        // Always update if different - user context is the source of truth
        if (prev.toLowerCase() !== user.email.toLowerCase()) {
          return user.email;
        }
        return prev;
      });
    }
  }, [user, emailJustUpdated, lastUpdatedEmail]);

  // Check for email updates when app comes to foreground (after clicking confirmation link)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && pendingEmailRef.current) {
        // App came to foreground and we have a pending email - check if it was confirmed
        const { data: { user: updatedUser } } = await supabase.auth.getUser();
        if (updatedUser?.email && updatedUser.email.toLowerCase() === pendingEmailRef.current.toLowerCase()) {
          // Email was confirmed!
          const confirmedEmail = updatedUser.email;
          // Clear all flags and refs first
          pendingEmailRef.current = null;
          emailUpdateRef.current = null;
          setEmailJustUpdated(false);
          setLastUpdatedEmail(null);
          // Clear any running interval
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
          // Update the email display IMMEDIATELY when confirmation is detected
          setCurrentEmail(confirmedEmail);
          // Mark email as confirmed
          emailConfirmedRef.current = true;
          
          // Show alert (email is already updated above)
          Alert.alert(
            "Email Updated", 
            "Your email has been successfully updated!",
            [{ text: "OK" }]
          );
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Check for email confirmation when screen comes into focus (user manually opens app)
  useFocusEffect(
    useCallback(() => {
      // Check if we have a pending email and verify if it was confirmed
      if (pendingEmailRef.current) {
        const checkEmailConfirmation = async () => {
          const { data: { user: updatedUser } } = await supabase.auth.getUser();
          if (updatedUser?.email && updatedUser.email.toLowerCase() === pendingEmailRef.current?.toLowerCase()) {
            // Email was confirmed! Update immediately
            const confirmedEmail = updatedUser.email;
            
            // Clear all flags and refs
            pendingEmailRef.current = null;
            emailUpdateRef.current = null;
            emailConfirmedRef.current = true;
            setEmailJustUpdated(false);
            setLastUpdatedEmail(null);
            
            // Clear any running interval
            if (checkIntervalRef.current) {
              clearInterval(checkIntervalRef.current);
              checkIntervalRef.current = null;
            }
            
            // Update the email display IMMEDIATELY
            setCurrentEmail(confirmedEmail);
            
            // Show alert
            Alert.alert(
              "Email Updated", 
              "Your email has been successfully updated!",
              [{ text: "OK" }]
            );
          }
        };
        
        // Check immediately when screen comes into focus
        checkEmailConfirmation();
      }
    }, [])
  );

  const handleUpdateEmail = async () => {
    if (!newEmail || !newEmail.trim()) {
      Alert.alert("Error", "Please enter a new email address");
      return;
    }

    const trimmedNewEmail = newEmail.trim().toLowerCase();
    
    if (trimmedNewEmail === currentEmail.toLowerCase()) {
      Alert.alert("Error", "Please enter a different email address");
      return;
    }

    // Basic format check - just ensure it has @ and .
    if (!trimmedNewEmail.includes("@") || !trimmedNewEmail.includes(".")) {
      Alert.alert("Error", "Please enter a valid email address format");
      return;
    }

    // Additional validation: ensure @ comes before .
    const atIndex = trimmedNewEmail.indexOf("@");
    const dotIndex = trimmedNewEmail.lastIndexOf(".");
    if (atIndex < 1 || dotIndex < atIndex + 2 || dotIndex === trimmedNewEmail.length - 1) {
      Alert.alert("Error", "Please enter a valid email address format");
      return;
    }

    setSavingEmail(true);
    try {
      const result = await updateEmail(trimmedNewEmail);
      const { data, error } = result;
      
      if (error) {
        // Show the actual error message from our API (which handles Supabase errors)
        console.error('❌ [Email] Email update error:', error);
        Alert.alert("Error", error.message || "Failed to update email");
        setSavingEmail(false);
        return;
      }
      
      if (data) {
        
        // Check if confirmation is required
        const requiresConfirmation = (result as any).requiresConfirmation;
        
        if (requiresConfirmation) {
          Alert.alert(
            "Email Update Pending", 
            "A confirmation email has been sent to your new email address. Please check your email and click the confirmation link to complete the update. The email will update after you confirm."
          );
          
          // DON'T change the current email display - keep showing the old email
          // The email will only update AFTER the user clicks the confirmation link
          setNewEmail(""); // Clear the input field
          
          // Store the pending email so we can check for it later
          pendingEmailRef.current = trimmedNewEmail;
          
          // CRITICAL: Set flags to prevent useEffect from overriding with old email
          // We set emailJustUpdated but NOT lastUpdatedEmail - this blocks updates but keeps current display
          setEmailJustUpdated(true);
          // Don't set lastUpdatedEmail - we want to keep the current (old) email displayed
          // Don't set emailUpdateRef - we want to keep the current (old) email displayed
          
          // Set up periodic check to detect when Supabase confirms the email
          let checkCount = 0;
          const maxChecks = 120; // Check for 4 minutes (120 * 2 seconds) - give user time to click link
          
          // Clear any existing interval
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
          }
          
          checkIntervalRef.current = setInterval(async () => {
            checkCount++;
            
            const { data: { user: updatedUser }, error: refreshError } = await supabase.auth.getUser();
            
            if (updatedUser?.email) {
              // Check if email has been updated in Supabase (after confirmation)
              if (updatedUser.email.toLowerCase() === trimmedNewEmail.toLowerCase()) {
                // Confirmation link was clicked! Email is now updated in Supabase
                const confirmedEmail = updatedUser.email;
                // Clear all flags and refs first
                pendingEmailRef.current = null;
                emailUpdateRef.current = null;
                setEmailJustUpdated(false);
                setLastUpdatedEmail(null);
                // Clear interval
                if (checkIntervalRef.current) {
                  clearInterval(checkIntervalRef.current);
                  checkIntervalRef.current = null;
                }
                // Update the email display IMMEDIATELY when confirmation is detected
                setCurrentEmail(confirmedEmail);
                // Mark email as confirmed
                emailConfirmedRef.current = true;
                
                // Show alert (email is already updated above)
                Alert.alert(
                  "Email Updated", 
                  "Your email has been successfully updated!",
                  [{ text: "OK" }]
                );
                return;
              } else if (updatedUser.email.toLowerCase() !== currentEmail.toLowerCase()) {
                // Email changed but not to what we expected - update display anyway
                const newEmail = updatedUser.email;
                pendingEmailRef.current = null;
                emailUpdateRef.current = null;
                setEmailJustUpdated(false);
                setLastUpdatedEmail(null);
                setCurrentEmail(newEmail);
                if (checkIntervalRef.current) {
                  clearInterval(checkIntervalRef.current);
                  checkIntervalRef.current = null;
                }
                return;
              }
            }
            
            if (refreshError) {
              console.error('⚠️ [Email] Error checking updated user:', refreshError);
            }
            
            // Stop checking after max attempts
            if (checkCount >= maxChecks) {
              if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
                checkIntervalRef.current = null;
              }
            }
          }, 2000); // Check every 2 seconds
          
        } else {
          // No confirmation required - email updated immediately
          Alert.alert("Success", "Email updated successfully.");
          setNewEmail("");
          
          // CRITICAL: Set ref FIRST for immediate access (before state updates)
          emailUpdateRef.current = trimmedNewEmail;
          
          // Mark that we just updated the email to prevent useEffect from overriding
          setEmailJustUpdated(true);
          setLastUpdatedEmail(trimmedNewEmail); // Store the email we're updating to
          
          // Immediately set the new email in the UI
          setCurrentEmail(trimmedNewEmail);
          
          // Periodically check if Supabase has updated the email
          // Only update the UI if Supabase confirms the new email
          let checkCount = 0;
          const maxChecks = 15; // Check for 30 seconds (15 * 2 seconds)
          
          const checkEmailUpdate = setInterval(async () => {
            checkCount++;
            
            const { data: { user: updatedUser }, error: refreshError } = await supabase.auth.getUser();
            
            if (updatedUser?.email) {
              if (updatedUser.email.toLowerCase() === trimmedNewEmail.toLowerCase()) {
                // Supabase has confirmed the new email!
                setCurrentEmail(updatedUser.email);
                // DON'T clear the flags yet - keep them until user context also updates
                // This prevents the old email from overriding after confirmation
                emailUpdateRef.current = null; // Clear the ref
                clearInterval(checkEmailUpdate);
                return;
              } else {
              }
            }
            
            if (refreshError) {
              console.error('⚠️ [Email] Error checking updated user:', refreshError);
            }
            
            // Stop checking after max attempts
            if (checkCount >= maxChecks) {
              clearInterval(checkEmailUpdate);
              // Keep the flag set to prevent old email from showing
            }
          }, 2000); // Check every 2 seconds
        }
      }
    } catch (error: any) {
      console.error('Email update exception:', error);
      Alert.alert("Error", error.message || "Failed to update email");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        Alert.alert("Error", error.message || "Failed to update password");
      } else {
        Alert.alert("Success", "Password updated successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  if (!fontsReady) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={["#1A4A3A", "rgba(18, 48, 37, 0.5)", "transparent", theme.colors.bg0]}
        locations={[0, 0.2, 0.4, 0.7]}
        style={styles.gradientBackground}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={{ width: 40, alignItems: "flex-start" }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.textHi} />
          </Pressable>
        </View>
        <Text style={styles.headerTitle}>Email & Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Email Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email</Text>
          
          {/* Current Email Line - Now Editable */}
          <View style={styles.inputLine}>
            <TextInput
              style={styles.lineInput}
              value={currentEmail}
              onChangeText={setCurrentEmail}
              placeholder="Current email"
              placeholderTextColor={theme.colors.textLo}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={true}
            />
            <View style={styles.lineUnderline} />
          </View>

          {/* New Email Line */}
          <View style={styles.inputLine}>
            <TextInput
              style={styles.lineInput}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="Enter new email"
              placeholderTextColor={theme.colors.textLo}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={styles.lineUnderline} />
          </View>

          <Pressable
            style={[styles.saveButton, savingEmail && styles.saveButtonDisabled]}
            onPress={handleUpdateEmail}
            disabled={savingEmail}
          >
            {savingEmail ? (
              <ActivityIndicator color="#06160D" />
            ) : (
              <Text style={styles.saveButtonText}>Update Email</Text>
            )}
          </Pressable>
        </View>

        {/* Password Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Password</Text>
          
          {/* New Password Line */}
          <View style={styles.inputLine}>
            <TextInput
              style={styles.lineInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor={theme.colors.textLo}
              secureTextEntry={true}
              autoCapitalize="none"
            />
            <View style={styles.lineUnderline} />
          </View>

          {/* Confirm Password Line */}
          <View style={styles.inputLine}>
            <TextInput
              style={styles.lineInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={theme.colors.textLo}
              secureTextEntry={true}
              autoCapitalize="none"
            />
            <View style={styles.lineUnderline} />
          </View>

          <Pressable
            style={[styles.saveButton, savingPassword && styles.saveButtonDisabled]}
            onPress={handleUpdatePassword}
            disabled={savingPassword}
          >
            {savingPassword ? (
              <ActivityIndicator color="#06160D" />
            ) : (
              <Text style={styles.saveButtonText}>Update Password</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg0,
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 360,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.textHi,
    fontFamily: FONT.uiBold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textLo,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 20,
    fontFamily: FONT.uiSemi,
  },
  inputLine: {
    marginBottom: 24,
  },
  lineInput: {
    fontSize: 16,
    color: theme.colors.textHi,
    fontFamily: FONT.uiRegular,
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  lineUnderline: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: theme.colors.primary600,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#06160D",
    fontFamily: FONT.uiSemi,
  },
});

