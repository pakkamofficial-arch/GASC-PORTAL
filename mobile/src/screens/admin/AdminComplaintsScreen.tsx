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

const STATUS_OPTIONS = [
  'ALL',
  'SUBMITTED',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
];

export const AdminComplaintsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Action Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [statusToSet, setStatusToSet] = useState<string>('UNDER_REVIEW');
  const [priorityToSet, setPriorityToSet] = useState<string>('MEDIUM');
  const [officialResponse, setOfficialResponse] = useState<string>('');
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const fetchComplaints = useCallback(async () => {
    try {
      const endpoint =
        selectedStatusFilter === 'ALL'
          ? '/complaints'
          : `/complaints?status=${selectedStatusFilter}`;
      const res = await api.get(endpoint);
      if (res.success && res.data) {
        setComplaints(res.data.complaints || []);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStatusFilter]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints();
  };

  const handleOpenAction = (item: any) => {
    setSelectedComplaint(item);
    setStatusToSet(item.status);
    setPriorityToSet(item.priority || 'MEDIUM');
    setOfficialResponse(item.officialResponse || '');
    setInternalNotes(item.internalNotes || '');
    setModalVisible(true);
  };

  const handleUpdateComplaint = async () => {
    if (!selectedComplaint) return;

    setSaving(true);
    try {
      const res = await api.patch(`/complaints/${selectedComplaint._id}`, {
        status: statusToSet,
        priority: priorityToSet,
        officialResponse: officialResponse.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
      });

      if (res.success) {
        Alert.alert('Updated', 'Grievance record and audit trail updated successfully.');
        setModalVisible(false);
        fetchComplaints();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update complaint');
    } finally {
      setSaving(false);
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
      case 'HIGH':
        return 'error';
      case 'MEDIUM':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading student grievance registry...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Grievance Cell Registry"
        subtitle="Confidential complaints oversight & resolution"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Status Filter Horizontal Pills */}
        <SectionHeader title="Filter Grievance Registry" subtitle="Filter by review and resolution progress" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {STATUS_OPTIONS.map((st) => (
            <TouchableOpacity
              key={st}
              style={[
                styles.filterPill,
                selectedStatusFilter === st && styles.filterPillActive,
              ]}
              onPress={() => setSelectedStatusFilter(st)}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedStatusFilter === st && styles.filterPillTextActive,
                ]}
              >
                {st.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SectionHeader
          title={`Grievance Records (${complaints.length})`}
          subtitle="Showing ticket inquiries and restricted internal notes"
        />

        {complaints.length === 0 ? (
          <EmptyState
            title="No Grievance Records"
            message="No registered complaints found for this filter."
            icon="shield-checkmark-outline"
          />
        ) : (
          complaints.map((item) => {
            const studentInfo = item.studentId;
            return (
              <Card key={item._id} style={styles.complaintCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ticketNum}>{item.ticketNumber}</Text>
                    <Text style={styles.studentMeta}>
                      Student: {studentInfo?.fullName || 'Enrolled Student'} ({studentInfo?.registerNo || 'Reg No'})
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ marginBottom: 4 }}>
                      <Badge label={item.status.replace('_', ' ')} type="info" />
                    </View>
                    <Badge label={`Priority: ${item.priority}`} type={getPriorityVariant(item.priority)} />
                  </View>
                </View>

                <Text style={styles.subjectText}>{item.subject}</Text>
                <Text style={styles.descriptionText}>{item.description}</Text>

                {item.internalNotes ? (
                  <View style={styles.internalBox}>
                    <View style={styles.internalHeaderRow}>
                      <Ionicons name="lock-closed" size={14} color={theme.colors.error} style={{ marginRight: 4 }} />
                      <Text style={styles.internalTitle}>Confidential Internal Notes (Admin Only):</Text>
                    </View>
                    <Text style={styles.internalContent}>{item.internalNotes}</Text>
                  </View>
                ) : null}

                {item.officialResponse ? (
                  <View style={styles.officialBox}>
                    <Text style={styles.officialTitle}>Published Response to Student:</Text>
                    <Text style={styles.officialContent}>{item.officialResponse}</Text>
                  </View>
                ) : null}

                <Button
                  title="Review & Take Action"
                  onPress={() => handleOpenAction(item)}
                  variant="outline"
                  size="small"
                  icon={<Ionicons name="hammer-outline" size={16} color={theme.colors.primary} />}
                  style={styles.actionBtn}
                />
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Review & Resolution Action Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Grievance Ticket</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} accessibilityRole="button">
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {selectedComplaint && (
              <View style={styles.ticketSummaryBox}>
                <Text style={styles.ticketSummaryTitle}>
                  {selectedComplaint.ticketNumber} • {selectedComplaint.subject}
                </Text>
                <Text style={styles.ticketSummarySub}>
                  Submitted: {new Date(selectedComplaint.createdAt).toLocaleDateString()}
                </Text>
              </View>
            )}

            <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Update Status:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                {['UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.choiceChip,
                      statusToSet === st && styles.choiceChipActive,
                    ]}
                    onPress={() => setStatusToSet(st)}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.choiceChipText, statusToSet === st && styles.choiceChipTextActive]}>
                      {st.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Set Priority Level:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((pr) => (
                  <TouchableOpacity
                    key={pr}
                    style={[
                      styles.choiceChip,
                      priorityToSet === pr && styles.choiceChipActive,
                    ]}
                    onPress={() => setPriorityToSet(pr)}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.choiceChipText, priorityToSet === pr && styles.choiceChipTextActive]}>
                      {pr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Input
                label="Official Response to Student"
                placeholder="Message that the student will see in their portal..."
                value={officialResponse}
                onChangeText={setOfficialResponse}
                multiline
                numberOfLines={3}
                style={{ height: 80, textAlignVertical: 'top' }}
              />

              <Input
                label="Confidential Internal Notes (Restricted)"
                placeholder="Internal committee notes, discussions, or maintenance details..."
                value={internalNotes}
                onChangeText={setInternalNotes}
                multiline
                numberOfLines={3}
                style={{ height: 80, textAlignVertical: 'top' }}
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
                title="Save Changes"
                onPress={handleUpdateComplaint}
                loading={saving}
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
  filterScroll: {
    marginBottom: theme.spacing.base,
  },
  filterPill: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterPillText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
  },
  filterPillTextActive: {
    color: theme.colors.textWhite,
  },
  complaintCard: {
    padding: theme.spacing.base,
    marginBottom: theme.spacing.base,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  ticketNum: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primaryDark,
  },
  studentMeta: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  subjectText: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    marginBottom: 4,
  },
  descriptionText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeights.normal,
    marginBottom: theme.spacing.sm,
  },
  internalBox: {
    backgroundColor: '#FFF8F8',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.xs,
    marginBottom: theme.spacing.sm,
  },
  internalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  internalTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.error,
  },
  internalContent: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
    lineHeight: theme.typography.lineHeights.tight,
  },
  officialBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.xs,
    marginBottom: theme.spacing.sm,
  },
  officialTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primaryDark,
    marginBottom: 2,
  },
  officialContent: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
    lineHeight: theme.typography.lineHeights.tight,
  },
  actionBtn: {
    marginTop: 4,
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
  ticketSummaryBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.base,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ticketSummaryTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primaryDark,
  },
  ticketSummarySub: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  inputLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginBottom: 6,
  },
  selectorScroll: {
    marginBottom: theme.spacing.base,
  },
  choiceChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
  },
  choiceChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  choiceChipText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
  },
  choiceChipTextActive: {
    color: theme.colors.textWhite,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.base,
  },
});
