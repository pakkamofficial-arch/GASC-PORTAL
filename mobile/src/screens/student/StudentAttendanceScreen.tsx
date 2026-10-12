import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header, Card, Badge, SectionHeader, EmptyState, Button } from '../../components';
import { AttendanceSkeleton } from '../../components/skeleton';
import { api } from '../../services/api';

export const StudentAttendanceScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAttendance = async () => {
    try {
      setError(null);
      const res = await api.get('/students/attendance');
      if (res.success && res.data) {
        setHistory(res.data.history || []);
      } else {
        setError(res.message || 'Unable to retrieve attendance logs.');
      }
    } catch (err: any) {
      console.log('Error fetching student attendance:', err);
      setError(err.message || 'Network error fetching attendance ledger.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendance();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Attendance Records"
        subtitle="Verified Institutional Roll Call Register"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Attendance Regulation Notice */}
        <Card style={styles.policyCard} variant="outlined">
          <View style={styles.policyHeaderRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.secondary} style={{ marginRight: 6 }} />
            <Text style={styles.policyTitle}>Annamalai University Regulations</Text>
          </View>
          <Text style={styles.policyText}>
            • Minimum 75% attendance is required to appear for semester university examinations without condonation.
          </Text>
          <Text style={styles.policyText}>
            • Institutional Formula: Percentage = (Eligible Attended Classes / Eligible Classes Held) × 100.
          </Text>
        </Card>

        <SectionHeader
          title="Daily Period Session History"
          subtitle="Chronological roll call audit ledger"
          icon="time-outline"
        />

        {loading ? (
          <AttendanceSkeleton count={5} />
        ) : error && history.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 24 }}>
            <Ionicons name="cloud-offline-outline" size={42} color={theme.colors.error} />
            <Text style={{ color: theme.colors.error, marginVertical: 8, textAlign: 'center' }}>{error}</Text>
            <Button title="Retry Attendance" onPress={() => { setLoading(true); fetchAttendance(); }} variant="outline" />
          </View>
        ) : history.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No Attendance Sessions Recorded"
            description="Daily period roll calls marked by your subject faculty will be displayed here in real time."
          />
        ) : (
          history.map((item, idx) => (
            <Card key={item.sessionId || idx} style={styles.historyCard}>
              <View style={styles.historyRow}>
                <View style={styles.leftCol}>
                  <Text style={styles.subjectTitle}>{item.subject || 'Subject'}</Text>
                  <Text style={styles.sessionMeta}>
                    {new Date(item.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    • Period {item.period}
                  </Text>
                  <Text style={styles.facultyName}>
                    Faculty: {item.faculty || 'Assigned Staff'}
                  </Text>
                  {item.reasonForChange ? (
                    <View style={styles.correctionRow}>
                      <Ionicons name="create-outline" size={13} color={theme.colors.warning} style={{ marginRight: 4 }} />
                      <Text style={styles.correctionNote}>
                        Correction: {item.reasonForChange}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Badge
                  label={item.status}
                  type={
                    item.status === 'PRESENT'
                      ? 'success'
                      : item.status === 'OD' || item.status === 'EXCUSED'
                      ? 'warning'
                      : 'error'
                  }
                />
              </View>
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
    paddingBottom: 32,
  },
  policyCard: {
    backgroundColor: '#FAFCFA',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
    marginBottom: 8,
    padding: 14,
  },
  policyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  policyTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
  },
  policyText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  historyCard: {
    padding: 14,
    marginVertical: 4,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftCol: {
    flex: 1,
    marginRight: 10,
  },
  subjectTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
  },
  sessionMeta: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  facultyName: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
    marginTop: 2,
  },
  correctionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.xs,
    alignSelf: 'flex-start',
  },
  correctionNote: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.warning,
  },
});
