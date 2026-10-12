import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header, Card, Badge, StatCard, SectionHeader, EmptyState } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const HODDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/hod/dashboard');
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.log('Error fetching HOD dashboard:', err);
      Alert.alert('HOD Portal', err.message || 'Unable to retrieve department metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="HOD Portal" subtitle="Government Arts & Science College" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading department supervisor dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dept = data?.department;
  const stats = data?.stats || {};
  const todayTimetable = data?.todayTimetable || [];
  const shortageStudents = data?.shortageStudents || [];
  const subjectSummary = data?.subjectWiseSummary || [];
  const facultySummary = data?.facultyCompletionSummary || [];

  const quickActions = [
    {
      id: 'faculty_assignments',
      title: 'Timetable & Staff',
      sub: 'Assign Periods & Subjects',
      icon: 'calendar-outline' as const,
      color: theme.colors.primary,
      screen: 'HODFacultyAssignments',
    },
    {
      id: 'shortages',
      title: 'Attendance Shortages',
      sub: `${stats.shortageStudentsCount || 0} students < 75%`,
      icon: 'alert-circle-outline' as const,
      color: '#C88308',
      screen: 'HODShortages',
    },
    {
      id: 'reports',
      title: 'Department Reports',
      sub: 'Attendance & Analytics',
      icon: 'bar-chart-outline' as const,
      color: '#1565C0',
      screen: 'HODAttendanceReports',
    },
    {
      id: 'admissions',
      title: 'Add Student Record',
      sub: 'Enrolment & Onboarding',
      icon: 'person-add-outline' as const,
      color: '#2E7D32',
      screen: 'StudentAdmission',
    },
    {
      id: 'circulars',
      title: 'Notices & Circulars',
      sub: 'Broadcast Announcements',
      icon: 'megaphone-outline' as const,
      color: '#4E342E',
      screen: 'Notices',
    },
    {
      id: 'events',
      title: 'Academic Calendar',
      sub: 'Exams & Holidays',
      icon: 'calendar-number-outline' as const,
      color: '#00838F',
      screen: 'EventsCalendar',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="HOD Academic Desk"
        subtitle={dept?.name || 'Department Administration'}
        rightAction={
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} accessibilityLabel="Log out">
            <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {/* Department Banner */}
        <Card style={styles.deptCard} variant="elevated">
          <View style={styles.deptRow}>
            <View style={styles.deptIconBadge}>
              <Ionicons name="school" size={24} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.deptCodeRow}>
                <Text style={styles.deptCodeText}>Dept Code: {dept?.code || 'DEPT'}</Text>
                <Badge label="HEAD OF DEPARTMENT" type="success" size="small" />
              </View>
              <Text style={styles.deptNameText}>{dept?.name || 'Academic Department'}</Text>
              <Text style={styles.hodNameText}>
                HOD: {dept?.headOfDepartment || dept?.hodFacultyId?.fullName || user?.identifier}
              </Text>
            </View>
          </View>
        </Card>

        {/* Core Department Stats */}
        <View style={styles.statsRow}>
          <StatCard
            title="Enrolled Students"
            value={String(stats.totalStudents || 0)}
            subtitle="Department roster"
            icon="people-outline"
            style={{ flex: 1, marginRight: 6 }}
          />
          <StatCard
            title="Teaching Faculty"
            value={String(stats.totalFaculty || 0)}
            subtitle="Permanent & guest"
            icon="briefcase-outline"
            style={{ flex: 1, marginLeft: 6 }}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title="Today's Periods"
            value={`${stats.todayCompletedSessionsCount || 0}/${stats.todayScheduledPeriodsCount || 0}`}
            subtitle={stats.pendingSessionsCount > 0 ? `${stats.pendingSessionsCount} periods pending` : 'All completed'}
            icon="time-outline"
            style={{ flex: 1, marginRight: 6 }}
          />
          <StatCard
            title="Shortage Alerts"
            value={String(stats.shortageStudentsCount || 0)}
            subtitle="Students < 75%"
            icon="warning-outline"
            style={{ flex: 1, marginLeft: 6 }}
          />
        </View>

        {/* HOD Quick Workflows */}
        <SectionHeader title="Supervisory Modules" subtitle="Department allocation and attendance monitoring" />
        <View style={styles.actionGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionTile}
              onPress={() => navigation.navigate(action.screen)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={action.title}
            >
              <View style={[styles.actionIconBox, { backgroundColor: `${action.color}15` }]}>
                <Ionicons name={action.icon} size={22} color={action.color} />
              </View>
              <Text style={styles.actionTitle} numberOfLines={1}>{action.title}</Text>
              <Text style={styles.actionSub} numberOfLines={1}>{action.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's Department Lectures */}
        <SectionHeader
          title="Today's Timetable Roster"
          subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
        />
        <Card style={styles.scheduleCard} variant="outlined">
          {todayTimetable.length === 0 ? (
            <EmptyState
              title="No Lectures Scheduled Today"
              message="No timetable periods are scheduled for this department today."
              icon="calendar-outline"
            />
          ) : (
            todayTimetable.map((slot: any, idx: number) => (
              <View
                key={slot._id || idx}
                style={[styles.slotRow, idx === todayTimetable.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={styles.periodCol}>
                  <Text style={styles.periodBadge}>Period {slot.periodNo}</Text>
                  <Text style={styles.periodTime}>{slot.startTime || '09:30 AM'}</Text>
                </View>
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <Text style={styles.subjectText}>{slot.subjectId?.title || 'Subject'}</Text>
                  <Text style={styles.slotFaculty}>
                    Faculty: {slot.facultyId?.fullName || 'Assigned Staff'} • Sem {slot.semester} (Sec {slot.section || 'A'})
                  </Text>
                  <Text style={styles.slotRoom}>Room: {slot.roomNo || 'Main Block'}</Text>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Attendance Shortage Watchlist */}
        <SectionHeader
          title="Attendance Shortage Watchlist"
          subtitle="Students below 75% institutional requirement"
          actionText="View All ›"
          onAction={() => navigation.navigate('HODShortages')}
        />
        <Card style={styles.shortageCard} variant="outlined">
          {shortageStudents.length === 0 ? (
            <EmptyState
              title="No Attendance Shortages"
              message="All students in this department currently meet or exceed the 75% attendance threshold."
              icon="checkmark-circle-outline"
            />
          ) : (
            shortageStudents.slice(0, 5).map((st: any, idx: number) => (
              <View
                key={st.studentId || idx}
                style={[styles.shortageRow, idx === Math.min(shortageStudents.length, 5) - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.stName}>{st.fullName}</Text>
                  <Text style={styles.stMeta}>
                    Reg: {st.registerNo} • Year {st.year} (Sec {st.section})
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Badge label={`${st.percentage}%`} type="error" />
                  <Text style={styles.stClasses}>{st.attended}/{st.total} periods</Text>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Subject-Wise Attendance Summary */}
        <SectionHeader title="Course Subject Overview" subtitle="Delivery and cumulative roll call" />
        <Card style={styles.subjectCard} variant="outlined">
          {subjectSummary.length === 0 ? (
            <EmptyState
              title="No Subjects Configured"
              message="Subjects assigned to this department will display attendance statistics here."
              icon="book-outline"
            />
          ) : (
            subjectSummary.map((sub: any, idx: number) => (
              <View
                key={sub.subjectId || idx}
                style={[styles.subjectRow, idx === subjectSummary.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectTitle}>{sub.title}</Text>
                  <Text style={styles.subjectMeta}>
                    Code: {sub.code} • Sem {sub.semester} • {sub.sessionsCount} sessions held
                  </Text>
                </View>
                <Badge
                  label={`${sub.attendancePercentage}%`}
                  type={sub.attendancePercentage >= 75 ? 'success' : 'warning'}
                />
              </View>
            ))
          )}
        </Card>

        {/* Faculty Completion Ledger */}
        <SectionHeader title="Staff Attendance Log Completion" subtitle="Faculty sessions recorded" />
        <Card style={styles.facultyCard} variant="outlined">
          {facultySummary.length === 0 ? (
            <EmptyState title="No Faculty Listed" message="Faculty roster will appear here." icon="person-outline" />
          ) : (
            facultySummary.map((fac: any, idx: number) => (
              <View
                key={fac.facultyId || idx}
                style={[styles.facultyRow, idx === facultySummary.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.facultyName}>{fac.fullName}</Text>
                  <Text style={styles.facultyMeta}>Emp ID: {fac.employeeId}</Text>
                </View>
                <Text style={styles.sessionCountText}>{fac.sessionsLogged} sessions logged</Text>
              </View>
            ))
          )}
        </Card>
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
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: theme.typography.families.primary,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  logoutText: {
    color: '#FFFFFF',
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
  },
  deptCard: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    padding: 14,
  },
  deptRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deptIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.tint,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deptCodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  deptCodeText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: theme.colors.primary,
  },
  deptNameText: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  hodNameText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 12,
  },
  actionTile: {
    width: '31.3%',
    marginHorizontal: '1%',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    alignItems: 'center',
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionTitle: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: theme.colors.text,
    textAlign: 'center',
  },
  actionSub: {
    fontFamily: theme.typography.families.primary,
    fontSize: 9,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  scheduleCard: {
    padding: 12,
    marginBottom: 12,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  periodCol: {
    width: 68,
    alignItems: 'center',
  },
  periodBadge: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 12,
    color: theme.colors.primary,
  },
  periodTime: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  subjectText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 13,
    color: theme.colors.text,
  },
  slotFaculty: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  slotRoom: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  shortageCard: {
    padding: 12,
    marginBottom: 12,
  },
  shortageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  stName: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 13,
    color: theme.colors.text,
  },
  stMeta: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  stClasses: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  subjectCard: {
    padding: 12,
    marginBottom: 12,
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  subjectTitle: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 13,
    color: theme.colors.text,
  },
  subjectMeta: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  facultyCard: {
    padding: 12,
    marginBottom: 12,
  },
  facultyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  facultyName: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 13,
    color: theme.colors.text,
  },
  facultyMeta: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sessionCountText: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 12,
    color: theme.colors.primary,
  },
});
