import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header, Card, Badge, Button, SectionHeader } from '../../components';
import { api } from '../../services/api';

export const StudentIDCardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const fetchCard = async () => {
    try {
      const res = await api.get('/idcards/my-card');
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.log('Error fetching ID card:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCard();
  }, []);

  const handleRequestCard = async () => {
    setRequesting(true);
    try {
      const res = await api.post('/idcards/request');
      if (res.success) {
        Alert.alert(
          'Application Submitted',
          'Your digital ID card application has been submitted for Principal office verification.'
        );
        fetchCard();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit application');
    } finally {
      setRequesting(false);
    }
  };

  const handleShareToken = async () => {
    if (!card?.qrVerificationToken) return;
    try {
      await Share.share({
        message: `Government Arts & Science College, Kuthalam - Digital ID Card Verification Token for ${student?.fullName} (${student?.registerNo}): ${card.qrVerificationToken}`,
      });
    } catch (err) {
      console.log(err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Digital ID Card" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Retrieving student credentials...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const card = data?.card;
  const student = data?.student;
  const college = data?.college;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Student Identity Card"
        subtitle="Government Arts & Science College, Kuthalam"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Official Identity Card Surface */}
        <Card style={styles.idSurface} variant="default" noPadding>
          {/* Card Header */}
          <View style={styles.idHeader}>
            <Text style={styles.govTamil}>தமிழ்நாடு அரசு</Text>
            <Text style={styles.govTitle}>GOVERNMENT OF TAMIL NADU</Text>
            <Text style={styles.collegeTitle}>
              GOVT. ARTS & SCIENCE COLLEGE, KUTHALAM
            </Text>
            <Text style={styles.locationTitle}>
              Mayiladuthurai District • Affiliated with Annamalai University
            </Text>
            <Text style={styles.mottoText}>அறிவே ஆற்றல் (Knowledge is Power)</Text>
          </View>

          {/* Card Body */}
          <View style={styles.idBody}>
            <View style={styles.photoContainer}>
              <View style={styles.photoBox}>
                <Ionicons name="person" size={44} color={theme.colors.primary} />
                <Text style={styles.photoPlaceholder}>PHOTO</Text>
              </View>
              <Badge
                label={card?.status || 'NOT_REQUESTED'}
                type={card?.status === 'ISSUED' ? 'success' : 'warning'}
              />
            </View>

            <View style={styles.detailsCol}>
              <Text style={styles.nameLabel}>STUDENT NAME</Text>
              <Text style={styles.nameValue}>{student?.fullName?.toUpperCase() || 'STUDENT'}</Text>

              <Text style={styles.fieldLabel}>REGISTER NO:</Text>
              <Text style={styles.fieldValue}>{student?.registerNo || '—'}</Text>

              <Text style={styles.fieldLabel}>DEPARTMENT:</Text>
              <Text style={styles.fieldValue}>{student?.departmentId?.name || 'Computer Science'}</Text>

              <Text style={styles.fieldLabel}>COURSE & YEAR:</Text>
              <Text style={styles.fieldValue}>
                {student?.courseId?.name || 'B.Sc CS'} ({student?.academicYear || '2023-2026'})
              </Text>

              <Text style={styles.fieldLabel}>BLOOD GROUP:</Text>
              <Text style={styles.fieldValue}>{student?.bloodGroup || 'O+'} (RH POSITIVE)</Text>
            </View>
          </View>

          {/* QR Code Verification Section */}
          <View style={styles.qrSection}>
            <View style={styles.qrBox}>
              <Ionicons name="qr-code" size={42} color={theme.colors.primary} />
              <Text style={styles.qrBadgeText}>SECURE QR</Text>
            </View>
            <View style={styles.qrInfo}>
              <Text style={styles.cardNumText}>ID No: {card?.cardNumber || 'PENDING'}</Text>
              <Text style={styles.validityText}>
                Valid Until:{' '}
                {card?.expiryDate
                  ? new Date(card.expiryDate).toLocaleDateString('en-IN')
                  : 'Academic Completion (2026)'}
              </Text>
              <Text style={styles.tokenHint} numberOfLines={1}>
                Token: {card?.qrVerificationToken ? card.qrVerificationToken.substring(0, 18) + '...' : 'Awaiting Issue'}
              </Text>
              {card?.qrVerificationToken ? (
                <TouchableOpacity onPress={handleShareToken} style={styles.shareBtn}>
                  <Ionicons name="share-social-outline" size={13} color={theme.colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.shareText}>Share Verification Token</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Signatory Footer */}
          <View style={styles.signFooter}>
            <View style={styles.signCol}>
              <View style={styles.signLine} />
              <Text style={styles.signRole}>Student Signature</Text>
            </View>
            <View style={styles.signCol}>
              <View style={styles.signLine} />
              <Text style={styles.signRole}>Principal & Seal</Text>
            </View>
          </View>
        </Card>

        {!card || card.status === 'REVOKED' ? (
          <Button
            title="Apply for Digital ID Card"
            onPress={handleRequestCard}
            loading={requesting}
            icon={<Ionicons name="card-outline" size={18} color="#FFFFFF" />}
            style={{ marginTop: 14 }}
          />
        ) : null}

        <View style={styles.noticeBox}>
          <View style={styles.noticeHeaderRow}>
            <Ionicons name="shield-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.noticeHeading}>Official Statutory Notice</Text>
          </View>
          <Text style={styles.noticeText}>
            This digital ID card is institutional property of Government Arts & Science College, Kuthalam. Digital QR tokens can be verified at institutional entrances without exposing personal contact records. Tampering or forgery is punishable under Tamil Nadu Educational Rules.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: 36,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: theme.typography.fonts.regular,
    marginTop: 10,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  idSurface: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  idHeader: {
    backgroundColor: theme.colors.primaryDark,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  govTamil: {
    fontFamily: theme.typography.fonts.tamilSemiBold,
    color: '#DCE7DC',
    fontSize: 10,
    fontWeight: '600',
  },
  govTitle: {
    fontFamily: theme.typography.fonts.bold,
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 1,
  },
  collegeTitle: {
    fontFamily: theme.typography.fonts.bold,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  locationTitle: {
    fontFamily: theme.typography.fonts.regular,
    color: '#DCE7DC',
    fontSize: 9,
    marginTop: 1,
  },
  mottoText: {
    fontFamily: theme.typography.fonts.tamilMedium,
    color: '#A8C5A8',
    fontSize: 9,
    marginTop: 2,
  },
  idBody: {
    flexDirection: 'row',
    padding: 14,
  },
  photoContainer: {
    alignItems: 'center',
    marginRight: 14,
  },
  photoBox: {
    width: 84,
    height: 100,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoPlaceholder: {
    fontFamily: theme.typography.fonts.semibold,
    color: theme.colors.textSecondary,
    fontSize: 9,
    marginTop: 2,
  },
  detailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameLabel: {
    fontFamily: theme.typography.fonts.medium,
    color: theme.colors.textSecondary,
    fontSize: 10,
  },
  nameValue: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.primaryDark,
    marginBottom: 4,
  },
  fieldLabel: {
    fontFamily: theme.typography.fonts.medium,
    color: theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  fieldValue: {
    fontFamily: theme.typography.fonts.semibold,
    color: theme.colors.text,
    fontSize: 12,
  },
  qrSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 12,
    marginHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  qrBox: {
    width: 60,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  qrBadgeText: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 8,
    color: theme.colors.primary,
    marginTop: 1,
  },
  qrInfo: {
    flex: 1,
  },
  cardNumText: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 12,
    color: theme.colors.text,
  },
  validityText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tokenHint: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  shareText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 11,
    color: theme.colors.primary,
  },
  signFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    marginTop: 8,
  },
  signCol: {
    alignItems: 'center',
    width: 120,
  },
  signLine: {
    width: 100,
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: 4,
  },
  signRole: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  noticeBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noticeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  noticeHeading: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: 12,
    color: theme.colors.text,
  },
  noticeText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 17,
  },
});
