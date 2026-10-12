import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Header, Card, Input, Button } from '../../components';

export const ActivateAccountScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { setSession } = useAuth();
  const [accountType, setAccountType] = useState<'STUDENT' | 'STAFF'>('STUDENT');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Student Fields
  const [registerNo, setRegisterNo] = useState<string>('');
  const [dob, setDob] = useState<string>(''); // YYYY-MM-DD
  const [studentPassword, setStudentPassword] = useState<string>('');
  const [studentConfirmPassword, setStudentConfirmPassword] = useState<string>('');

  // Staff Fields
  const [employeeId, setEmployeeId] = useState<string>('');
  const [activationCode, setActivationCode] = useState<string>('');
  const [staffPassword, setStaffPassword] = useState<string>('');
  const [staffConfirmPassword, setStaffConfirmPassword] = useState<string>('');

  const handleStudentActivation = async () => {
    setError(null);
    if (!registerNo.trim()) {
      setError('Please enter your college register number');
      return;
    }
    if (!dob.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) {
      setError('Date of birth must be in YYYY-MM-DD format (e.g. 2006-08-12)');
      return;
    }
    if (studentPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (studentPassword !== studentConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/activate-student', {
        registerNo: registerNo.trim().toUpperCase(),
        dob: dob.trim(),
        newPassword: studentPassword,
      });

      if (res.success && res.data) {
        Alert.alert(
          'Account Activated',
          'Your student account has been successfully verified and activated.',
          [
            {
              text: 'Enter Portal',
              onPress: () => {
                setSession(res.data.user, res.data.profile, res.data.tokens);
              },
            },
          ]
        );
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check register number and date of birth.');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffActivation = async () => {
    setError(null);
    if (!employeeId.trim()) {
      setError('Please enter your faculty employee ID');
      return;
    }
    if (!activationCode.trim()) {
      setError('Please enter the activation credential provided by the Principal Office');
      return;
    }
    if (staffPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (staffPassword !== staffConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const isDate = /^\d{4}-\d{2}-\d{2}$/.test(activationCode.trim());
      const res = await api.post('/auth/activate-staff', {
        employeeId: employeeId.trim().toUpperCase(),
        dob: isDate ? activationCode.trim() : undefined,
        activationCode: !isDate ? activationCode.trim() : undefined,
        newPassword: staffPassword,
      });

      if (res.success && res.data) {
        Alert.alert(
          'Staff Account Activated',
          'Your faculty account has been activated successfully.',
          [
            {
              text: 'Enter Portal',
              onPress: () => {
                setSession(res.data.user, res.data.profile, res.data.tokens);
              },
            },
          ]
        );
      }
    } catch (err: any) {
      setError(err.message || 'Staff activation failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="First-Time Account Activation"
        subtitle="Identity verification and credential setup"
        showBack
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Identity Notice */}
          <View style={styles.noticeBanner}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.noticeText}>
              Official Verification: Student date of birth is matched against institutional admission records. It is never stored as a permanent password.
            </Text>
          </View>

          {/* Role Selector Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, accountType === 'STUDENT' && styles.tabActive]}
              onPress={() => {
                setAccountType('STUDENT');
                setError(null);
              }}
              accessibilityRole="button"
              accessibilityLabel="Select student activation"
            >
              <Ionicons
                name="school-outline"
                size={16}
                color={accountType === 'STUDENT' ? theme.colors.textWhite : theme.colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabText, accountType === 'STUDENT' && styles.tabTextActive]}>
                Student Activation
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, accountType === 'STAFF' && styles.tabActive]}
              onPress={() => {
                setAccountType('STAFF');
                setError(null);
              }}
              accessibilityRole="button"
              accessibilityLabel="Select staff activation"
            >
              <Ionicons
                name="briefcase-outline"
                size={16}
                color={accountType === 'STAFF' ? theme.colors.textWhite : theme.colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabText, accountType === 'STAFF' && styles.tabTextActive]}>
                Staff Activation
              </Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={theme.colors.error} style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {accountType === 'STUDENT' ? (
            <Card style={styles.formCard}>
              <Text style={styles.sectionTitle}>Student Identity Verification</Text>
              <Text style={styles.sectionSubtitle}>
                Verify your official admission details to establish your secure password.
              </Text>

              <Input
                label="Register Number"
                placeholder="e.g. 24UCS099"
                value={registerNo}
                onChangeText={setRegisterNo}
                autoCapitalize="characters"
                leftIcon="id-card-outline"
              />

              <Input
                label="Date of Birth (YYYY-MM-DD)"
                placeholder="e.g. 2006-08-12"
                value={dob}
                onChangeText={setDob}
                leftIcon="calendar-outline"
              />

              <Input
                label="New Private Password"
                placeholder="At least 6 characters"
                value={studentPassword}
                onChangeText={setStudentPassword}
                isPassword
                leftIcon="lock-closed-outline"
              />

              <Input
                label="Confirm Password"
                placeholder="Re-enter password"
                value={studentConfirmPassword}
                onChangeText={setStudentConfirmPassword}
                isPassword
                leftIcon="lock-closed-outline"
              />

              <Button
                title="Verify and Activate Account"
                onPress={handleStudentActivation}
                loading={loading}
                icon={<Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />}
                style={styles.actionBtn}
              />
            </Card>
          ) : (
            <Card style={styles.formCard}>
              <Text style={styles.sectionTitle}>Faculty / Staff Activation</Text>
              <Text style={styles.sectionSubtitle}>
                Enter your Employee ID and the unique activation code issued by the Principal office.
              </Text>

              <Input
                label="Faculty Employee ID"
                placeholder="e.g. FAC-CS-02"
                value={employeeId}
                onChangeText={setEmployeeId}
                autoCapitalize="characters"
                leftIcon="card-outline"
              />

              <Input
                label="Date of Birth (YYYY-MM-DD) or Activation Code"
                placeholder="e.g. 1985-06-15 or GASC-ACT-7890"
                value={activationCode}
                onChangeText={setActivationCode}
                autoCapitalize="characters"
                leftIcon="calendar-outline"
              />

              <Input
                label="New Private Password"
                placeholder="At least 6 characters"
                value={staffPassword}
                onChangeText={setStaffPassword}
                isPassword
                leftIcon="lock-closed-outline"
              />

              <Input
                label="Confirm Password"
                placeholder="Re-enter password"
                value={staffConfirmPassword}
                onChangeText={setStaffConfirmPassword}
                isPassword
                leftIcon="lock-closed-outline"
              />

              <Button
                title="Activate Staff Account"
                onPress={handleStaffActivation}
                loading={loading}
                icon={<Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />}
                style={styles.actionBtn}
              />
            </Card>
          )}

          <TouchableOpacity
            style={styles.backToLoginRow}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
          >
            <Ionicons name="arrow-back-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.backToLoginText}>Already activated? Return to Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing.xxl,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.tint,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.base,
  },
  noticeText: {
    flex: 1,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    lineHeight: theme.typography.lineHeights.normal,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 3,
    marginBottom: theme.spacing.base,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.borderRadius.sm,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.textWhite,
  },
  formCard: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.base,
  },
  sectionTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.primaryDark,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.base,
    lineHeight: theme.typography.lineHeights.tight,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.errorBg,
    borderColor: theme.colors.error,
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm + 2,
    marginBottom: theme.spacing.base,
  },
  errorText: {
    flex: 1,
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.error,
  },
  actionBtn: {
    marginTop: theme.spacing.sm,
  },
  backToLoginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.base,
  },
  backToLoginText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.primary,
  },
});
