import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { api } from '../../services/api';
import { Header, Card, Badge, Button, Input, SectionHeader, EmptyState } from '../../components';

const COMPLAINT_CATEGORIES = [
  { id: 'ACADEMIC', label: 'Academic / Curriculum' },
  { id: 'INFRASTRUCTURE', label: 'Classroom / Lab Infrastructure' },
  { id: 'HOSTEL_CANTEEN', label: 'Hostel & Canteen' },
  { id: 'HARASSMENT_RAGGING', label: 'Anti-Ragging / Harassment (Urgent)' },
  { id: 'EXAMINATION', label: 'Examination & Hall Tickets' },
  { id: 'LIBRARY', label: 'Library & Reading Room' },
  { id: 'GENERAL', label: 'General Administration' },
];

export const StudentComplaintsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [complaints, setComplaints] = useState<any[]>([]);

  // Submission Modal
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ACADEMIC');
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchComplaints = useCallback(async () => {
    try {
      const res = await api.get('/complaints/my');
      if (res.success && res.data) {
        setComplaints(res.data.complaints || []);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load grievances');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints();
  };

  const handleSubmitComplaint = async () => {
    if (subject.trim().length < 5) {
      Alert.alert('Required', 'Subject must be at least 5 characters');
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert('Required', 'Please describe your grievance in at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/complaints', {
        category: selectedCategory,
        subject: subject.trim(),
        description: description.trim(),
        evidenceUrl: evidenceUrl.trim() || undefined,
      });

      if (res.success && res.data) {
        Alert.alert(
          'Grievance Submitted',
          `Your ticket number is: ${res.data.ticketNumber}.\nTrack updates confidentially in this portal.`
        );
        setModalVisible(false);
        setSubject('');
        setDescription('');
        setEvidenceUrl('');
        fetchComplaints();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit grievance');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'RESOLVED':
      case 'CLOSED':
        return 'success';
      case 'UNDER_REVIEW':
      case 'IN_PROGRESS':
      case 'ASSIGNED':
        return 'info';
      default:
        return 'neutral';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading confidential grievance record...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Student Grievance Cell"
        subtitle="Confidential complaint registration and status tracking"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Submit new grievance"
            style={{ padding: 4 }}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Confidentiality Notice */}
        <View style={styles.confidentialBanner}>
          <Ionicons name="lock-closed-outline" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.confidentialText}>
            Submissions are kept strictly confidential under institutional guidelines. Only designated college officers have access to your grievance.
          </Text>
        </View>

        <Button
          title="Submit New Grievance"
          onPress={() => setModalVisible(true)}
          icon={<Ionicons name="create-outline" size={18} color="#FFFFFF" />}
          style={styles.newGrievanceBtn}
        />

        <SectionHeader
          title={`My Registered Grievances (${complaints.length})`}
          subtitle="Chronological ticket records and administrative updates"
        />

        {complaints.length === 0 ? (
          <EmptyState
            title="No Grievances Submitted"
            message="You have no recorded grievance tickets. Tap 'Submit New Grievance' if you require assistance."
            icon="document-text-outline"
          />
        ) : (
          complaints.map((item) => (
            <Card key={item._id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <View>
                  <Text style={styles.ticketNumber}>{item.ticketNumber}</Text>
                  <Text style={styles.categoryBadgeText}>
                    {item.category.replace('_', ' ')} • {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Badge label={item.status.replace('_', ' ')} type={getStatusVariant(item.status)} />
              </View>

              <Text style={styles.ticketSubject}>{item.subject}</Text>
              <Text style={styles.ticketDescription}>{item.description}</Text>

              {item.officialResponse ? (
                <View style={styles.responseBox}>
                  <View style={styles.responseHeaderRow}>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.responseTitle}>Official Administrative Response:</Text>
                  </View>
                  <Text style={styles.responseText}>{item.officialResponse}</Text>
                </View>
              ) : (
                <View style={styles.pendingResponseBox}>
                  <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} style={{ marginRight: 6 }} />
                  <Text style={styles.pendingResponseText}>
                    Under review by designated grievance inquiry committee.
                  </Text>
                </View>
              )}
            </Card>
          ))
        )}
      </ScrollView>

      {/* New Grievance Submission Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Formal Grievance</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} accessibilityRole="button">
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Select Grievance Category:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {COMPLAINT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat.id && styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === cat.id && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Input
                label="Grievance Subject"
                placeholder="Brief summary of the issue"
                value={subject}
                onChangeText={setSubject}
              />

              <Input
                label="Detailed Description"
                placeholder="Provide specific details, dates, or locations..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                style={{ height: 100, textAlignVertical: 'top' }}
              />

              <Input
                label="Supporting Document / Evidence Link (Optional)"
                placeholder="Google Drive link or reference URL"
                value={evidenceUrl}
                onChangeText={setEvidenceUrl}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1, marginRight: theme.spacing.sm }}
              />
              <Button
                title="Submit Grievance"
                onPress={handleSubmitComplaint}
                loading={submitting}
                style={{ flex: 1.5 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  confidentialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.tint,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.base,
  },
  confidentialText: {
    flex: 1,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
    lineHeight: theme.typography.lineHeights.normal,
  },
  newGrievanceBtn: {
    marginBottom: theme.spacing.base,
  },
  ticketCard: {
    padding: theme.spacing.base,
    marginBottom: theme.spacing.base,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  ticketNumber: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primaryDark,
  },
  categoryBadgeText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  ticketSubject: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    marginBottom: 6,
  },
  ticketDescription: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeights.normal,
    marginBottom: theme.spacing.md,
  },
  responseBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.xs,
  },
  responseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  responseTitle: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primaryDark,
  },
  responseText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    lineHeight: theme.typography.lineHeights.normal,
  },
  pendingResponseBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  pendingResponseText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: theme.spacing.base,
  },
  modalCard: {
    padding: theme.spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.base,
  },
  modalTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.primaryDark,
  },
  fieldLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  categoryScroll: {
    marginBottom: theme.spacing.base,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
  },
  categoryChipTextActive: {
    color: theme.colors.textWhite,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.base,
  },
});
