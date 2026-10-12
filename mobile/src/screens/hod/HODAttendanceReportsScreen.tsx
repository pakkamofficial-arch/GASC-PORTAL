import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header, Card, Badge, SectionHeader, EmptyState } from '../../components';
import { api } from '../../services/api';

export const HODAttendanceReportsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [classReport, setClassReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState<boolean>(false);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get('/hod/classes');
      if (res.success && res.data) {
        setClasses(res.data.classes || []);
        if (res.data.classes?.length > 0) {
          setSelectedClassId(res.data.classes[0]._id);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load department classes');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClassReport = useCallback(async (classId: string) => {
    if (!classId) return;
    setReportLoading(true);
    try {
      const res = await api.get(`/attendance/reports/class/${classId}`);
      if (res.success && res.data) {
        setClassReport(res.data);
      }
    } catch (err: any) {
      console.log('Error fetching class attendance report:', err);
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    if (selectedClassId) {
      fetchClassReport(selectedClassId);
    }
  }, [selectedClassId, fetchClassReport]);

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Department Attendance Reports"
        subtitle="Class-level and roll-call analytics"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>Select Department Class:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classScroll}>
          {classes.map((cls) => (
            <TouchableOpacity
              key={cls._id}
              style={[styles.classChip, selectedClassId === cls._id && styles.classChipActive]}
              onPress={() => setSelectedClassId(cls._id)}
              accessibilityRole="button"
            >
              <Text style={[styles.classChipText, selectedClassId === cls._id && styles.classChipTextActive]}>
                {cls.courseId?.code || 'CRS'} Yr {cls.year} ({cls.section})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {reportLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 24 }} />
        ) : !classReport ? (
          <EmptyState
            title="Select a Class Group"
            message="Choose any class group above to view roll-call completion and student percentages."
            icon="bar-chart-outline"
          />
        ) : (
          <>
            {/* Class Summary Metrics */}
            <Card style={styles.summaryCard} variant="elevated">
              <View style={styles.summaryRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{classReport.totalClassesHeld || 0}</Text>
                  <Text style={styles.statLbl}>Periods Held</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{classReport.totalStudentsEnrolled || 0}</Text>
                  <Text style={styles.statLbl}>Students</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, { color: theme.colors.primary }]}>
                    {classReport.students?.filter((s: any) => !s.isShortage).length || 0}
                  </Text>
                  <Text style={styles.statLbl}>Eligible (≥75%)</Text>
                </View>
              </View>
            </Card>

            <SectionHeader
              title={`Student Roster Roll-Call (${classReport.students?.length || 0})`}
              subtitle="Cumulative percentage calculation and shortage flags"
            />

            {classReport.students?.length === 0 ? (
              <EmptyState title="No Students Found" message="No enrolled students in this class." icon="people-outline" />
            ) : (
              classReport.students?.map((st: any) => (
                <Card key={st.studentId} style={styles.stCard} variant="outlined">
                  <View style={styles.stRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stName}>{st.fullName}</Text>
                      <Text style={styles.stReg}>Reg: {st.registerNo}</Text>
                      <Text style={styles.stMeta}>
                        Attended: {st.attended} / {st.total} instruction periods
                      </Text>
                    </View>
                    <Badge
                      label={`${st.percentage}%`}
                      type={st.isShortage ? 'error' : 'success'}
                    />
                  </View>
                </Card>
              ))
            )}
          </>
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
  sectionLabel: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  classScroll: {
    marginBottom: 12,
  },
  classChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginRight: 6,
  },
  classChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  classChipText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.text,
  },
  classChipTextActive: {
    color: '#FFFFFF',
  },
  summaryCard: {
    padding: 14,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNum: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 18,
    color: theme.colors.text,
  },
  statLbl: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.divider,
  },
  stCard: {
    padding: 12,
    marginBottom: 6,
  },
  stRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stName: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 13,
    color: theme.colors.text,
  },
  stReg: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: theme.colors.primary,
    marginTop: 2,
  },
  stMeta: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
