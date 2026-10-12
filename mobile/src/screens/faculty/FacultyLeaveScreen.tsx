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
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import { EmptyState } from '../../components/EmptyState';
import { StatCard } from '../../components/StatCard';
import { api } from '../../services/api';

type LeaveType = 'CASUAL' | 'MEDICAL' | 'EARNED' | 'SPECIAL';

export const FacultyLeaveScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'APPLY'>('HISTORY');
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [leaveType, setLeaveType] = useState<LeaveType>('CASUAL');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaveHistory = async () => {
    try {
      const res = await api.get('/faculty/leave');
      if (res.success && res.data) {
        setLeaveRequests(res.data.leaveRequests || []);
      }
    } catch (err) {
      console.log('Error fetching faculty leaves:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaveHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaveHistory();
  };

  const handleApply = async () => {
    if (!reason.trim() || reason.trim().length < 5) {
      Alert.alert('Validation', 'Please provide a reason of at least 5 characters.');
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('Validation', 'Please specify start and end dates.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      Alert.alert('Validation', 'End date cannot be prior to start date.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        leaveType,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        reason: reason.trim(),
      };

      const res = await api.post('/faculty/leave', payload);
      if (res.success) {
        Alert.alert('Success', 'Leave application submitted for Principal / HOD approval.');
        setReason('');
        setActiveTab('HISTORY');
        fetchLeaveHistory();
      } else {
        Alert.alert('Failed', res.message || 'Could not submit leave application.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit leave application.');
    } finally {
      setSubmitting(false);
    }
  };

  const leaveOptions: { type: LeaveType; label: string; maxDays: string }[] = [
    { type: 'CASUAL', label: 'Casual Leave (CL)', maxDays: '12 / year' },
    { type: 'MEDICAL', label: 'Medical Leave (ML)', maxDays: '15 / year' },
    { type: 'EARNED', label: 'Earned Leave (EL)', maxDays: '10 / year' },
    { type: 'SPECIAL', label: 'Special Casual (SCL)', maxDays: 'Official duties' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Faculty Leave Management"
        subtitle="Government Arts & Science College, Kuthalam"
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* Segmented Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'HISTORY' && styles.tabItemActive]}
          onPress={() => setActiveTab('HISTORY')}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={activeTab === 'HISTORY' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.tabTextActive]}>
            Leave History ({leaveRequests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'APPLY' && styles.tabItemActive]}
          onPress={() => setActiveTab('APPLY')}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={activeTab === 'APPLY' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'APPLY' && styles.tabTextActive]}>
            Apply for Leave
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {/* Entitlement Summary Bar */}
        <View style={styles.entitlementRow}>
          <StatCard
            title="Casual Leave"
            value="12"
            subtitle="Annual quota"
            icon="sunny-outline"
            style={{ flex: 1, marginRight: 6 }}
          />
          <StatCard
            title="Medical Leave"
            value="15"
            subtitle="Sanctioned quota"
            icon="medkit-outline"
            style={{ flex: 1, marginHorizontal: 3 }}
          />
          <StatCard
            title="Pending Requests"
            value={String(leaveRequests.filter((l) => l.status === 'PENDING').length)}
            subtitle="Under review"
            icon="hourglass-outline"
            style={{ flex: 1, marginLeft: 6 }}
          />
        </View>

        {activeTab === 'HISTORY' ? (
          loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Fetching staff leave records...</Text>
            </View>
          ) : leaveRequests.length === 0 ? (
            <EmptyState
              title="No Leave Records Found"
              message="You haven't submitted any leave requests for the current academic session."
              icon="calendar-outline"
              actionLabel="Apply for Leave"
              onAction={() => setActiveTab('APPLY')}
            />
          ) : (
            leaveRequests.map((item: any) => {
              const start = new Date(item.startDate);
              const end = new Date(item.endDate);
              const status = item.status || 'PENDING';
              return (
                <Card key={item._id} style={styles.leaveCard} variant="outlined">
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.leaveTypeTitle}>{item.leaveType} LEAVE</Text>
                      <Text style={styles.dateDuration}>
                        {start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} -{' '}
                        {end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    <Badge
                      label={status}
                      type={status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'error' : 'warning'}
                    />
                  </View>

                  <Text style={styles.reasonText}>Reason: {item.reason}</Text>

                  {item.adminRemarks ? (
                    <View style={styles.adminRemarkBox}>
                      <Text style={styles.remarkLabel}>Principal / Admin Remarks:</Text>
                      <Text style={styles.remarkText}>{item.adminRemarks}</Text>
                    </View>
                  ) : null}

                  <View style={styles.appliedMeta}>
                    <Text style={styles.appliedText}>
                      Applied on: {new Date(item.createdAt).toLocaleDateString('en-IN')}
                    </Text>
                  </View>
                </Card>
              );
            })
          )
        ) : (
          /* APPLY TAB */
          <Card style={styles.formCard} variant="outlined">
            <Text style={styles.formTitle}>New Staff Leave Application</Text>
            <Text style={styles.formSubtitle}>
              Applications will be routed directly to the Principal's Office for formal sanction.
            </Text>

            {/* Leave Type Selector */}
            <Text style={styles.fieldLabel}>Select Leave Category *</Text>
            <View style={styles.typeSelector}>
              {leaveOptions.map((opt) => {
                const isSelected = leaveType === opt.type;
                return (
                  <TouchableOpacity
                    key={opt.type}
                    style={[styles.typeOption, isSelected && styles.typeOptionSelected]}
                    onPress={() => setLeaveType(opt.type)}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.typeSub}>{opt.maxDays}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Input
                  label="From Date (YYYY-MM-DD) *"
                  placeholder="2024-11-15"
                  value={startDate}
                  onChangeText={setStartDate}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Input
                  label="To Date (YYYY-MM-DD) *"
                  placeholder="2024-11-16"
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </View>
            </View>

            <Input
              label="Detailed Reason & Alternative Arrangement *"
              placeholder="State the official/personal reason and alternative teaching arrangement made..."
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
            />

            <Button
              title="Submit Leave Application"
              variant="primary"
              loading={submitting}
              onPress={handleApply}
              style={{ marginTop: 12 }}
            />
          </Card>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    marginHorizontal: 4,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: theme.colors.tint,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    fontFamily: theme.typography.families.primaryBold,
    color: theme.colors.primary,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: 36,
  },
  entitlementRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  centerBox: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontFamily: theme.typography.families.primary,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
  leaveCard: {
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  leaveTypeTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  dateDuration: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 2,
  },
  reasonText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
    marginVertical: 4,
  },
  adminRemarkBox: {
    backgroundColor: '#F8F9FA',
    padding: 8,
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    marginTop: 6,
  },
  remarkLabel: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  remarkText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 2,
  },
  appliedMeta: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: 6,
  },
  appliedText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  formCard: {
    padding: 14,
  },
  formTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 2,
  },
  formSubtitle: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  fieldLabel: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 8,
  },
  typeSelector: {
    marginBottom: 12,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  typeOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.tint,
  },
  typeLabel: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 13,
    color: theme.colors.text,
  },
  typeLabelSelected: {
    color: theme.colors.primary,
    fontFamily: theme.typography.families.primaryBold,
  },
  typeSub: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  rowInputs: {
    flexDirection: 'row',
  },
});
