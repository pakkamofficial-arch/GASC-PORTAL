import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Input, Button, Card } from '../../components';
import { useAuth } from '../../context/AuthContext';

export const LoginScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { login, isLoading, error } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your College ID / Register Number and Password.');
      return;
    }

    try {
      await login(identifier.trim(), password.trim());
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
    }
  };

  const fillDemoAccount = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Emblem & College Branding */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/branding/college-logo.png')}
            style={styles.collegeLogo}
            resizeMode="contain"
            accessibilityLabel="Government Arts and Science College Official Emblem"
          />
          <View style={styles.emblemBadge}>
            <Text style={styles.emblemTamil}>அறிவே ஆற்றல்</Text>
            <Text style={styles.emblemText}>GOVT OF TAMIL NADU</Text>
          </View>
          <Text style={styles.collegeName}>
            Government Arts & Science College
          </Text>
          <Text style={styles.location}>Kuthalam, Mayiladuthurai District</Text>
          <Text style={styles.affiliation}>
            Affiliated with Annamalai University
          </Text>
          <View style={styles.appTitleBadge}>
            <Ionicons name="school" size={13} color={theme.colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.appTitle}>COLLEGE CONNECT PORTAL</Text>
          </View>
        </View>

        {/* College Campus Showcase Photograph Card */}
        <View style={styles.campusCard}>
          <Image
            source={require('../../../assets/branding/college-photo.jpg')}
            style={styles.campusPhoto}
            resizeMode="cover"
            accessibilityLabel="GASC Kuthalam Campus Grounds"
          />
          <View style={styles.campusOverlay}>
            <View style={styles.campusTag}>
              <Ionicons name="business" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.campusTagText}>GASC Kuthalam Campus</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation?.navigate('AboutCollege')}
              style={styles.aboutCollegeBtn}
              accessibilityRole="button"
              accessibilityLabel="View About College Profile"
            >
              <Text style={styles.aboutCollegeBtnText}>About Campus</Text>
              <Ionicons name="chevron-forward" size={12} color="#FFFFFF" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Login Form */}
        <Card style={styles.loginCard} variant="default">
          <Text style={styles.loginTitle}>Account Sign In</Text>
          <Text style={styles.loginSubtitle}>
            Enter your college-issued Register Number or Employee ID
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={theme.colors.error} style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="College ID / Register Number"
            placeholder="e.g. 23UCS042 or FAC-CS-01"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="characters"
            leftIcon="person-outline"
          />

          <Input
            label="Password"
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            isPassword
            leftIcon="lock-closed-outline"
          />

          <Button
            title="Sign In to Portal"
            onPress={handleLogin}
            loading={isLoading}
            icon={<Ionicons name="log-in-outline" size={18} color="#FFFFFF" />}
            style={styles.loginBtn}
          />

          {/* Quick Demo Fill Buttons for reviewers */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Quick Select Seed Account:</Text>
            <View style={styles.demoRow}>
              <TouchableOpacity
                style={styles.demoChip}
                onPress={() => fillDemoAccount('23UCS042', 'Password@123')}
                accessibilityRole="button"
                accessibilityLabel="Fill demo student account"
              >
                <Ionicons name="school-outline" size={14} color={theme.colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.demoChipText}>Student</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.demoChip}
                onPress={() => fillDemoAccount('FAC-CS-01', 'Password@123')}
                accessibilityRole="button"
                accessibilityLabel="Fill demo faculty account"
              >
                <Ionicons name="briefcase-outline" size={14} color={theme.colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.demoChipText}>Faculty</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.demoChip}
                onPress={() => fillDemoAccount('ADMIN001', 'Admin@123')}
                accessibilityRole="button"
                accessibilityLabel="Fill demo administrator account"
              >
                <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.demoChipText}>Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* First-Time Activation CTA */}
        <TouchableOpacity
          style={styles.activateBanner}
          onPress={() => navigation.navigate('ActivateAccount')}
          accessibilityRole="button"
          accessibilityLabel="First-time student or staff account activation"
        >
          <Ionicons name="key-outline" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.activateTitle}>First-Time User? Activate Your Account</Text>
            <Text style={styles.activateSub}>
              Verify your Student DOB or Staff Activation Code to establish your private password
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* Institutional Help & Instructions */}
        <View style={styles.helpSection}>
          <View style={styles.helpHeaderRow}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.helpHeading}>Account Activation & Help</Text>
          </View>
          <Text style={styles.helpText}>
            • Student accounts are pre-provisioned using university register numbers.
          </Text>
          <Text style={styles.helpText}>
            • Faculty accounts require official employee ID validation.
          </Text>
          <Text style={styles.helpText}>
            • For password recovery or access issues, visit the Administrative Office (Room 102).
          </Text>
        </View>

        {/* Developer Credit Footer */}
        <View style={styles.developerFooter}>
          <Text style={styles.developerFooterText}>
            Developed by Abishek Shanmugavadivel | GASC Connect
          </Text>
        </View>
      </ScrollView>
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
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginVertical: 12,
  },
  collegeLogo: {
    width: 68,
    height: 68,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
  },
  campusCard: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
    backgroundColor: '#000000',
  },
  campusPhoto: {
    width: '100%',
    height: 145,
  },
  campusOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  campusTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  campusTagText: {
    fontFamily: theme.typography.fonts.semibold,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  aboutCollegeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 4,
  },
  aboutCollegeBtnText: {
    fontFamily: theme.typography.fonts.bold,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emblemBadge: {
    backgroundColor: theme.colors.primaryDark,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    marginBottom: 8,
  },
  emblemTamil: {
    fontFamily: theme.typography.fonts.tamilSemiBold,
    color: '#DCE7DC',
    fontSize: 12,
    fontWeight: '700',
  },
  emblemText: {
    fontFamily: theme.typography.fonts.bold,
    color: '#FFFFFF',
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '600',
    marginTop: 2,
  },
  collegeName: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 19,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  location: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 2,
  },
  affiliation: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  appTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.tint,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginTop: 8,
  },
  appTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  loginCard: {
    marginTop: 8,
    padding: 18,
  },
  loginTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  loginSubtitle: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 14,
    marginTop: 4,
  },
  loginBtn: {
    marginTop: 10,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.errorBg,
    padding: 10,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginBottom: 10,
  },
  errorText: {
    fontFamily: theme.typography.fonts.medium,
    color: theme.colors.error,
    fontSize: 12,
    flex: 1,
  },
  demoSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  demoTitle: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  demoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  demoChip: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.tint,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 7,
    marginHorizontal: 3,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoChipText: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  helpSection: {
    marginTop: 16,
    padding: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  helpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  helpHeading: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  helpText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  activateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.tint,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.base,
  },
  activateTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primaryDark,
  },
  activateSub: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  developerFooter: {
    marginTop: 24,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  developerFooterText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 11,
    color: theme.colors.textSecondary,
    letterSpacing: 0.3,
  },
});
