import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header, Card, Badge, SectionHeader, Button } from '../../components';
import { DashboardSkeleton } from '../../components/skeleton';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { StudentDashboardData } from '../../types';

export const StudentDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      setError(null);
      const res = await api.get('/students/dashboard');
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Could not load student records.');
      }
    } catch (err: any) {
      console.log('Error fetching student dashboard:', err);
      setError(err.message || 'Network error fetching student records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Student Portal" subtitle="GASC Kuthalam" />
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Student Portal" subtitle="GASC Kuthalam" />
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.error} />
          <Text style={[styles.loadingText, { color: theme.colors.error, marginVertical: 12 }]}>{error}</Text>
          <Button title="Retry Connection" onPress={() => { setLoading(true); fetchDashboard(); }} variant="primary" />
        </View>
      </SafeAreaView>
    );
  }

  const student = data?.student;
  const attendance = data?.attendance;
  const todayTimetable = data?.todayTimetable || [];
  const recentMarks = data?.recentMarks || [];
  const fee = data?.fee;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Student Dashboard"
        subtitle={`Welcome, ${student?.fullName || 'Student'}`}
        rightAction={
          <TouchableOpacity
            onPress={logout}
            style={styles.logoutBtn}
            accessibilityRole="button"
            accessibilityLabel="Sign out of student portal"
          >
            <Ionicons name="log-out-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Student Academic Identification Header */}
        <Card style={styles.profileCard} variant="default">
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {student?.fullName ? student.fullName.substring(0, 2).toUpperCase() : 'ST'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.studentName}>{student?.fullName}</Text>
              <Text style={styles.regNo}>Register No: {student?.registerNo}</Text>
              <Text style={styles.deptText}>
                {student?.courseId?.name || 'B.Sc Computer Science'} • Semester {student?.currentSemester || 4} ({student?.section || 'A'})
              </Text>
              <View style={styles.academicBadgeRow}>
                <Badge label={student?.academicYear || '2023-2026'} type="info" />
                <View style={{ marginLeft: 6 }}>
                  <Badge label="ANNAMALAI UNIV" type="neutral" />
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* Primary Academic Action Grid */}
        <SectionHeader title="Academic Services & Portals" />
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('StudentIDCard')}
            accessibilityRole="button"
          >
            <View style={styles.actionIconBox}>
              <Ionicons name="card-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.actionTitle}>Digital ID</Text>
            <Text style={styles.actionSubtitle}>QR Verified</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('StudentBonafide')}
            accessibilityRole="button"
          >
            <View style={styles.actionIconBox}>
              <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.actionTitle}>Bonafide</Text>
            <Text style={styles.actionSubtitle}>Certificates</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('StudentFees')}
            accessibilityRole="button"
          >
            <View style={styles.actionIconBox}>
              <Ionicons name="wallet-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.actionTitle}>Fees & Pay</Text>
            <Text style={styles.actionSubtitle}>
              {fee?.balance ? `₹${fee.balance} due` : 'Settled'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('AIChat')}
            accessibilityRole="button"
          >
            <View style={styles.actionIconBox}>
              <Ionicons name="sparkles-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.actionTitle}>AI Assistant</Text>
            <Text style={styles.actionSubtitle}>College Q&A</Text>
          </TouchableOpacity>
        </View>

        {/* Secondary Services (Assignments, Notes, Notices, Chat) */}
        <View style={styles.actionGridSecondary}>
          <TouchableOpacity
            style={styles.subActionChip}
            onPress={() => navigation.navigate('ChatList')}
            accessibilityRole="button"
          >
            <Ionicons name="chatbubbles-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.subActionText}>Campus Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.subActionChip}
            onPress={() => navigation.navigate('StudentAssignments')}
            accessibilityRole="button"
          >
            <Ionicons name="clipboard-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.subActionText}>Assignments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.subActionChip}
            onPress={() => navigation.navigate('StudentMaterials')}
            accessibilityRole="button"
          >
            <Ionicons name="library-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.subActionText}>Study Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.subActionChip}
            onPress={() => navigation.navigate('Notices')}
            accessibilityRole="button"
          >
            <Ionicons name="notifications-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.subActionText}>Circulars</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.subActionChip}
            onPress={() => navigation.navigate('StudentComplaints')}
            accessibilityRole="button"
          >
            <Ionicons name="shield-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.subActionText}>Grievances</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.subActionChip}
            onPress={() => navigation.navigate('EventsCalendar')}
            accessibilityRole="button"
          >
            <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.subActionText}>Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.subActionChip}
            onPress={() => navigation.navigate('AboutCollege')}
            accessibilityRole="button"
            accessibilityLabel="View College Profile and Campus Info"
          >
            <Ionicons name="business-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.subActionText}>About GASC</Text>
          </TouchableOpacity>
        </View>

        {/* Attendance Summary Widget */}
        <SectionHeader
          title="Attendance Standing"
          subtitle="Annamalai University (75% Minimum Requirement)"
          actionText="Full Register"
          onActionPress={() => navigation.navigate('StudentAttendance')}
          icon="time-outline"
        />

        <Card style={styles.widgetCard}>
          <View style={styles.attendanceRow}>
            <View style={styles.attPercentBox}>
              <Text style={styles.attPercentText}>{attendance?.overallPercentage || 0}%</Text>
              <Text style={styles.attPercentLabel}>Aggregate</Text>
            </View>
            <View style={styles.attStatsBox}>
              <Text style={styles.statLine}>
                Classes Attended: <Text style={styles.boldText}>{attendance?.attendedClasses || 0}</Text>
              </Text>
              <Text style={styles.statLine}>
                Classes Conducted: <Text style={styles.boldText}>{attendance?.totalClassesHeld || 0}</Text>
              </Text>
              <View style={styles.badgeWrap}>
                {attendance?.lowAttendanceWarning ? (
                  <Badge label="LOW ATTENDANCE WARNING (< 75%)" type="warning" />
                ) : (
                  <Badge label="ELIGIBLE FOR UNIVERSITY EXAMS" type="success" />
                )}
              </View>
            </View>
          </View>
        </Card>

        {/* Today's Timetable */}
        <SectionHeader
          title="Today's Lecture Schedule"
          subtitle="Daily Period Timetable"
          actionText="Weekly Schedule"
          onActionPress={() => navigation.navigate('StudentTimetable')}
          icon="calendar-outline"
        />

        <Card style={styles.widgetCard}>
          {todayTimetable.length === 0 ? (
            <View style={styles.emptyTimetable}>
              <Ionicons name="calendar-clear-outline" size={24} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No lectures scheduled for today.</Text>
            </View>
          ) : (
            todayTimetable.map((slot, idx) => (
              <View
                key={slot._id || idx}
                style={[
                  styles.timetableRow,
                  idx < todayTimetable.length - 1 && styles.rowDivider,
                ]}
              >
                <View style={styles.periodCol}>
                  <Text style={styles.periodNumber}>P{slot.periodNo}</Text>
                  <Text style={styles.periodTime}>{slot.startTime}</Text>
                </View>
                <View style={styles.slotDetails}>
                  <Text style={styles.slotSubject}>{slot.subjectId?.title || 'Subject'}</Text>
                  <Text style={styles.slotFaculty}>
                    {slot.facultyId?.fullName || 'Faculty'} • Room {slot.roomNo || 'Main Block'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Recently Published Marks */}
        <SectionHeader
          title="Continuous Internal Assessments"
          subtitle="Published Academic Marks"
          actionText="All Marks"
          onActionPress={() => navigation.navigate('StudentMarks')}
          icon="ribbon-outline"
        />

        <Card style={styles.widgetCard}>
          {recentMarks.length === 0 ? (
            <View style={styles.emptyTimetable}>
              <Ionicons name="document-text-outline" size={24} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No recently published assessment marks.</Text>
            </View>
          ) : (
            recentMarks.map((m, idx) => (
              <View
                key={idx}
                style={[
                  styles.markRow,
                  idx < recentMarks.length - 1 && styles.rowDivider,
                ]}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.markSubject}>{m.subjectTitle}</Text>
                  <Text style={styles.markCategory}>{m.assessmentTitle}</Text>
                </View>
                <View style={styles.markScoreCol}>
                  <Text style={styles.markScore}>
                    {m.marksObtained} / {m.maxMarks}
                  </Text>
                  <Badge label={`Grade ${m.grade}`} type={m.grade === 'RA' ? 'error' : 'success'} />
                </View>
              </View>
            ))
          )}
        </Card>

        {/* College Announcements */}
        <SectionHeader
          title="College Circulars & Notices"
          actionText="All Notices"
          onActionPress={() => navigation.navigate('Notices')}
          icon="megaphone-outline"
        />

        <Card style={styles.widgetCard}>
          {data?.announcements?.length === 0 ? (
            <Text style={styles.emptyText}>No active notices published.</Text>
          ) : (
            data?.announcements?.slice(0, 3).map((notice, idx) => (
              <View
                key={notice._id || idx}
                style={[
                  styles.noticeRow,
                  idx < (data.announcements.length - 1) && styles.rowDivider,
                ]}
              >
                <View style={styles.noticeHeader}>
                  <Text style={styles.noticeTitle}>{notice.title}</Text>
                  <Badge label={notice.priority} type={notice.priority === 'URGENT' ? 'error' : 'neutral'} />
                </View>
                <Text style={styles.noticeContent} numberOfLines={2}>
                  {notice.content}
                </Text>
                <Text style={styles.noticeDate}>
                  Published: {new Date(notice.publishedAt).toLocaleDateString('en-IN')}
                </Text>
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
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: 36,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: theme.borderRadius.sm,
  },
  logoutText: {
    fontFamily: theme.typography.fonts.semibold,
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
  },
  profileCard: {
    padding: 14,
    marginBottom: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontFamily: theme.typography.fonts.bold,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  studentName: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.text,
  },
  regNo: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  deptText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  academicBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionItem: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  actionGridSecondary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  subActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: '48.5%',
    marginVertical: 3,
  },
  subActionText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 12,
    color: theme.colors.text,
  },
  widgetCard: {
    padding: 14,
    marginVertical: 2,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attPercentBox: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.tint,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  attPercentText: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.xl,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  attPercentLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  attStatsBox: {
    flex: 1,
  },
  statLine: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: 3,
  },
  boldText: {
    fontFamily: theme.typography.fonts.semibold,
    fontWeight: '600',
    color: theme.colors.text,
  },
  badgeWrap: {
    marginTop: 6,
  },
  timetableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  periodCol: {
    width: 54,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: theme.colors.divider,
    paddingRight: 8,
    marginRight: 10,
  },
  periodNumber: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 12,
    color: theme.colors.primary,
  },
  periodTime: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  slotDetails: {
    flex: 1,
  },
  slotSubject: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  slotFaculty: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  markRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  markSubject: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  markCategory: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  markScoreCol: {
    alignItems: 'flex-end',
  },
  markScore: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginBottom: 3,
  },
  noticeRow: {
    paddingVertical: 8,
  },
  noticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  noticeTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  noticeContent: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  noticeDate: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  emptyTimetable: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
});
