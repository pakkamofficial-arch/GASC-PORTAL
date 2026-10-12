import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Card, Input, Button } from '../../components';
import { useAuth } from '../../context/AuthContext';

export const FirstLoginChangePasswordScreen: React.FC = () => {
  const { user, completePasswordChange, logout, isLoading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const validateStrength = (pwd: string) => {
    return {
      hasLength: pwd.length >= 8,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasDigitOrSpecial: /[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    };
  };

  const strength = validateStrength(newPassword);
  const isAllValid =
    strength.hasLength && strength.hasUpper && strength.hasLower && strength.hasDigitOrSpecial;

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!currentPassword.trim()) {
      setErrorMsg('Please enter your current temporary password.');
      return;
    }
    if (!isAllValid) {
      setErrorMsg('New password does not fulfill the required security strength criteria.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation password do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMsg('New password must be different from your temporary password.');
      return;
    }

    try {
      await completePasswordChange(currentPassword.trim(), newPassword.trim());
      Alert.alert(
        'Password Updated Successfully',
        'Your new password has been set and your account is now fully active. Welcome to Government College Connect!'
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password. Please check your current temporary password.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.shieldBadge}>
              <Ionicons name="shield-checkmark" size={36} color={theme.colors.primary} />
            </View>
            <Text style={styles.collegeName}>Government Arts & Science College, Kuthalam</Text>
            <Text style={styles.screenTitle}>Temporary Password Change Required</Text>
            <Text style={styles.screenSubtitle}>
              Welcome, <Text style={styles.boldText}>{user?.identifier || 'Staff Member'}</Text>! To secure your
              collegiate account, please update your initial password to proceed.
            </Text>
          </View>

          <Card style={styles.card} variant="default">
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.error} style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <Input
              label="Current Temporary Password *"
              placeholder="Enter the initial temporary password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              isPassword
              leftIcon="key-outline"
            />

            <Input
              label="New Secure Password *"
              placeholder="Minimum 8 characters"
              value={newPassword}
              onChangeText={setNewPassword}
              isPassword
              leftIcon="lock-closed-outline"
            />

            <Input
              label="Confirm New Password *"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
              leftIcon="checkmark-circle-outline"
            />

            {/* Password Criteria Checklist */}
            <View style={styles.checklistCard}>
              <Text style={styles.checklistTitle}>Institutional Password Policy:</Text>
              <View style={styles.checkItem}>
                <Ionicons
                  name={strength.hasLength ? 'checkmark-circle' : 'ellipse-outline'}
                  size={15}
                  color={strength.hasLength ? theme.colors.success : theme.colors.textMuted}
                />
                <Text style={[styles.checkText, strength.hasLength && styles.checkTextValid]}>
                  At least 8 characters long
                </Text>
              </View>
              <View style={styles.checkItem}>
                <Ionicons
                  name={strength.hasUpper ? 'checkmark-circle' : 'ellipse-outline'}
                  size={15}
                  color={strength.hasUpper ? theme.colors.success : theme.colors.textMuted}
                />
                <Text style={[styles.checkText, strength.hasUpper && styles.checkTextValid]}>
                  At least 1 uppercase letter (A-Z)
                </Text>
              </View>
              <View style={styles.checkItem}>
                <Ionicons
                  name={strength.hasLower ? 'checkmark-circle' : 'ellipse-outline'}
                  size={15}
                  color={strength.hasLower ? theme.colors.success : theme.colors.textMuted}
                />
                <Text style={[styles.checkText, strength.hasLower && styles.checkTextValid]}>
                  At least 1 lowercase letter (a-z)
                </Text>
              </View>
              <View style={styles.checkItem}>
                <Ionicons
                  name={strength.hasDigitOrSpecial ? 'checkmark-circle' : 'ellipse-outline'}
                  size={15}
                  color={strength.hasDigitOrSpecial ? theme.colors.success : theme.colors.textMuted}
                />
                <Text style={[styles.checkText, strength.hasDigitOrSpecial && styles.checkTextValid]}>
                  At least 1 number or special symbol (!@#$)
                </Text>
              </View>
            </View>

            <Button
              title="Save Password & Enter Portal"
              variant="primary"
              onPress={handleSubmit}
              loading={isLoading}
              icon="shield-checkmark-outline"
              style={styles.submitBtn}
            />

            <Button
              title="Sign Out"
              variant="ghost"
              onPress={logout}
              style={styles.logoutBtn}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingTop: 30,
    paddingBottom: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  shieldBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  collegeName: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 13,
    color: theme.colors.primary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  screenTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 20,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: 6,
  },
  screenSubtitle: {
    fontFamily: theme.typography.families.primary,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  boldText: {
    fontFamily: theme.typography.families.primaryBold,
    color: theme.colors.text,
  },
  card: {
    padding: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.errorBg,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    flex: 1,
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 13,
    color: theme.colors.error,
  },
  checklistCard: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  checklistTitle: {
    fontFamily: theme.typography.families.primarySemiBold,
    fontSize: 12,
    color: theme.colors.text,
    marginBottom: 6,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  checkText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  checkTextValid: {
    color: theme.colors.success,
    fontFamily: theme.typography.families.primaryMedium,
  },
  submitBtn: {
    marginTop: 10,
  },
  logoutBtn: {
    marginTop: 6,
  },
});
