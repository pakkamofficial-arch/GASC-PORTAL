import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header, Card, Badge, Button, Input, SectionHeader, EmptyState, LoadingSpinner } from '../../components';
import { api } from '../../services/api';

const PURPOSES = [
  { key: 'BUS_PASS', label: 'Government Bus Pass (TNSTC Concession)' },
  { key: 'SCHOLARSHIP', label: 'State / Central Post-Matric Scholarship' },
  { key: 'TRAIN_PASS', label: 'Southern Railway Student Concession Pass' },
  { key: 'PASSPORT', label: 'Passport Application Verification' },
  { key: 'BANK_ACCOUNT', label: 'Student Savings Bank Account Opening' },
  { key: 'EDUCATION_LOAN', label: 'Nationalized Bank Education Loan' },
  { key: 'INTERNSHIP', label: 'Summer Internship / Project Work' },
  { key: 'GENERAL', label: 'General Bonafide Verification' },
];

export const StudentBonafideScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPurpose, setSelectedPurpose] = useState(PURPOSES[0].key);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setErrorMessage(null);
      const res = await api.get('/certificates/my-requests');
      if (res.success && res.data) {
        setRequests(res.data.requests || []);
      } else {
        setErrorMessage(res.message || 'Unable to retrieve your certificate requests.');
      }
    } catch (err: any) {
      console.log('Error fetching bonafide requests:', err);
      setErrorMessage(err.message || 'Network error retrieving certificate requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post('/certificates', {
        purpose: selectedPurpose,
        additionalDetails: details.trim(),
      });

      if (res.success) {
        Alert.alert(
          'Request Submitted',
          'Your bonafide certificate request has been submitted to the Administrative Office for verification and issuance.'
        );
        setDetails('');
        fetchRequests();
      }
    } catch (err: any) {
      Alert.alert('Request Failed', err.message || 'Unable to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadDocx = (cert: any) => {
    const downloadUrl = `${api.getBaseUrl()}/certificates/${cert._id}/download-docx`;
    Alert.alert(
      'Official Bonafide Document (.DOCX)',
      `Certificate No: ${cert.certificateNumber || 'ISSUED'}\n\nGenerated directly using the authentic college Word template.\nPreserves all official headings, margins, and signature blocks.\n\nDownload Link:\n${downloadUrl}`
    );
  };

  const handleDownloadPdf = (cert: any) => {
    const downloadUrl = `${api.getBaseUrl()}/certificates/${cert._id}/download`;
    Alert.alert(
      'Official PDF Copy',
      `Certificate No: ${cert.certificateNumber || 'ISSUED'}\n\nAuthenticated document with QR token.\n\nDownload Link:\n${downloadUrl}`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Bonafide Certificate"
        subtitle="Institutional Request & Word/PDF Issuance"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Request Form */}
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Submit New Certificate Request</Text>
          <Text style={styles.formSubtitle}>
            Select purpose and provide necessary verification details for administrative review
          </Text>

          <Text style={styles.label}>Select Purpose:</Text>
          <View style={styles.purposeList}>
            {PURPOSES.map((p) => {
              const isSelected = selectedPurpose === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.purposeRow, isSelected && styles.purposeRowSelected]}
                  onPress={() => setSelectedPurpose(p.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.purposeLabel, isSelected && styles.purposeLabelSelected]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label="Additional Details / Reference Number"
            placeholder="e.g. Bank Account No, Bus Route or Loan File No"
            value={details}
            onChangeText={setDetails}
          />

          <Button
            title="Submit Bonafide Request"
            onPress={handleSubmit}
            loading={submitting}
            icon={<Ionicons name="send-outline" size={16} color="#FFFFFF" />}
            style={{ marginTop: 8 }}
          />
        </Card>

        {/* Existing Requests Section */}
        <SectionHeader
          title="My Certificate Requests"
          subtitle="Real-time verification and issuance tracking"
          icon="document-text-outline"
        />

        {loading ? (
          <LoadingSpinner message="Retrieving your certificate applications..." />
        ) : errorMessage ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={32} color={theme.colors.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Button
              title="Retry Loading"
              onPress={fetchRequests}
              variant="outline"
              size="sm"
              style={{ marginTop: 8 }}
            />
          </View>
        ) : requests.length === 0 ? (
          <EmptyState
            icon="document-outline"
            title="No Certificate Requests"
            description="You have not submitted any certificate applications yet. Use the form above to apply."
          />
        ) : (
          requests.map((r, idx) => (
            <Card key={r._id || idx} style={styles.requestCard}>
              <View style={styles.reqTopRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.reqPurpose}>
                    {PURPOSES.find((p) => p.key === r.purpose)?.label || r.purpose}
                  </Text>
                  <Text style={styles.reqDate}>
                    Applied on: {new Date(r.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <Badge label={r.status} type={r.status === 'ISSUED' || r.status === 'APPROVED' ? 'success' : r.status === 'REJECTED' ? 'error' : 'warning'} />
              </View>

              {r.additionalDetails ? (
                <Text style={styles.reqDetails}>Note: {r.additionalDetails}</Text>
              ) : null}

              {r.certificateNumber ? (
                <View style={styles.certNoBox}>
                  <Ionicons name="checkmark-circle" size={15} color={theme.colors.success} style={{ marginRight: 6 }} />
                  <Text style={styles.certNoText}>Certificate No: {r.certificateNumber}</Text>
                </View>
              ) : null}

              {r.rejectionReason ? (
                <View style={styles.rejectionBox}>
                  <Ionicons name="close-circle" size={15} color={theme.colors.error} style={{ marginRight: 6 }} />
                  <Text style={styles.rejectionText}>Reason: {r.rejectionReason}</Text>
                </View>
              ) : null}

              {(r.status === 'APPROVED' || r.status === 'ISSUED') && (
                <View style={styles.actionButtonGroup}>
                  <Button
                    title="Download Official Bonafide (.DOCX)"
                    onPress={() => handleDownloadDocx(r)}
                    variant="primary"
                    size="sm"
                    icon={<Ionicons name="document-text-outline" size={15} color="#FFFFFF" />}
                    style={{ marginTop: 10 }}
                  />
                  <Button
                    title="Download PDF Copy"
                    onPress={() => handleDownloadPdf(r)}
                    variant="outline"
                    size="sm"
                    icon={<Ionicons name="download-outline" size={15} color={theme.colors.primary} />}
                    style={{ marginTop: 6 }}
                  />
                </View>
              )}
            </Card>
          ))
        )}
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
  formCard: {
    padding: 16,
    marginBottom: 6,
  },
  formTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.md,
    fontWeight: '700',
    color: theme.colors.text,
  },
  formSubtitle: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  label: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginBottom: 6,
  },
  purposeList: {
    marginBottom: 8,
  },
  purposeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    marginVertical: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  purposeRowSelected: {
    backgroundColor: theme.colors.tint,
    borderColor: '#C8E6C9',
  },
  purposeLabel: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 12,
    color: theme.colors.text,
    flex: 1,
  },
  purposeLabelSelected: {
    fontFamily: theme.typography.fonts.semibold,
    color: theme.colors.primary,
  },
  requestCard: {
    padding: 14,
    marginVertical: 4,
  },
  reqTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reqPurpose: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  reqDate: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  reqDetails: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  certNoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.successBg,
    padding: 8,
    borderRadius: theme.borderRadius.sm,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  certNoText: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 11,
    color: theme.colors.success,
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.errorBg,
    padding: 8,
    borderRadius: theme.borderRadius.sm,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  rejectionText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 11,
    color: theme.colors.error,
  },
  actionButtonGroup: {
    marginTop: 6,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 13,
    color: theme.colors.error,
    textAlign: 'center',
    marginVertical: 6,
  },
});
