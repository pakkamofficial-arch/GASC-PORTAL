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
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { StatCard } from '../../components/StatCard';
import { SectionHeader } from '../../components/SectionHeader';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { DashboardSkeleton } from '../../components/skeleton';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const FacultyDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      setError(null);
      const res = await api.get('/faculty/dashboard');
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Could not load faculty dashboard.');
      }
    } catch (err: any) {
      console.log('Error fetching faculty dashboard:', err);
      setError(err.message || 'Network error fetching faculty dashboard.');
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
        <Header title="Faculty Portal" subtitle="GASC Kuthalam" />
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Faculty Portal" subtitle="GASC Kuthalam" />
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.error} />
          <Text style={[styles.loadingText, { color: theme.colors.error, marginVertical: 12 }]}>{error}</Text>
          <Button title="Retry Connection" onPress={() => { setLoading(true); fetchDashboard(); }} variant="primary" />
        </View>
      </SafeAreaView>
    );
  }

  const faculty = data?.faculty;
  const todayClasses = data?.todayClasses || [];
  const recentSessions = data?.recentSessions || [];
  const assignedCount = faculty?.assignedClasses?.length || 0;

  const quickActions = [
    {
      id: 'attendance',
      title: 'Take Attendance',
      sub: '5-Period Log',
      icon: 'checkbox-outline' as const,
      color: theme.colors.primary,
      screen: 'FacultyAttendance',
    },
    {
      id: 'marks',
      title: 'Enter Marks',
      sub: 'CIA & Seminars',
      icon: 'ribbon-outline' as const,
      color: '#1565C0',
      screen: 'FacultyMarks',
    },
    {
      id: 'assignments',
      title: 'Assignments',
      sub: 'Manage Tasks',
      icon: 'document-text-outline' as const,
      color: '#7B1FA2',
      screen: 'FacultyAssignments',
    },
    {
      id: 'materials',
      title: 'Study Materials',
      sub: 'Upload Notes',
      icon: 'folder-open-outline' as const,
      color: '#E65100',
      screen: 'FacultyMaterials',
    },
    {
      id: 'leave',
      title: 'Staff Leave',
      sub: 'Apply & Track',
      icon: 'calendar-number-outline' as const,
      color: '#00838F',
      screen: 'FacultyLeave',
    },
    {
      id: 'admission',
      title: 'Student Admission',
      sub: 'New Admission Form',
      icon: 'person-add-outline' as const,
      color: '#2E7D32',
      screen: 'StudentAdmission',
    },
    {
      id: 'chat',
      title: 'Faculty Chat',
      sub: 'E2EE Class & Dept',
      icon: 'chatbubbles-outline' as const,
      color: '#00796B',
      screen: 'ChatList',
    },
    {
      id: 'events',
      title: 'Academic Calendar',
      sub: 'Exams & Events',
      icon: 'calendar-outline' as const,
      color: '#1565C0',
      screen: 'EventsCalendar',
    },
    {
      id: 'ai-assistant',
      title: 'AI Assistant',
      sub: 'College Q&A',
      icon: 'sparkles-outline' as const,
      color: '#7B1FA2',
      screen: 'AIChat',
    },
    {
      id: 'notices',
      title: 'Circulars',
      sub: 'Dept Notices',
      icon: 'megaphone-outline' as const,
      color: '#4E342E',
      screen: 'Notices',
    },
    {
      id: 'about-college',
      title: 'About College',
      sub: 'Campus Profile',
      icon: 'business-outline' as const,
      color: theme.colors.primaryDark,
      screen: 'AboutCollege',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Faculty Portal"
        subtitle={faculty?.fullName ? `Prof. ${faculty.fullName}` : 'Faculty Member'}
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
        {/* Profile Card */}
        <Card style={styles.profileCard} variant="elevated">
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {faculty?.fullName ? faculty.fullName.substring(0, 2).toUpperCase() : 'FC'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.nameText}>{faculty?.fullName || 'Faculty Member'}</Text>
                <Badge label="ACTIVE" type="success" />
              </View>
              <Text style={styles.designationText}>
                {faculty?.designation || 'Assistant Professor'} • {faculty?.qualification || 'M.Sc., M.Phil., Ph.D.'}
              </Text>
              <Text style={styles.empIdText}>
                Emp ID: {faculty?.employeeId || 'FAC-000'} • {faculty?.departmentId?.name || 'Academic Dept'}
              </Text>
            </View>
          </View>
        </Card>

        {/* HOD Supervisory Hub Quick Banner */}
        {(faculty?.isHod || user?.isHod) && (
          <TouchableOpacity
            style={styles.hodBanner}
            onPress={() => navigation.navigate('HODDashboard')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Open HOD Departmental Workspace"
          >
            <View style={styles.hodBannerLeft}>
              <View style={styles.hodIconBadge}>
                <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.hodBannerTitle}>HOD Departmental Workspace</Text>
                <Text style={styles.hodBannerSubtitle}>Timetable allocations, faculty ledger & shortage watch</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#176B3A" />
          </TouchableOpacity>
        )}

        {/* Academic Stats */}
        <View style={styles.statsRow}>
          <StatCard
            title="Assigned Classes"
            value={String(assignedCount)}
            subtitle="Current semester"
            icon="book-outline"
            style={{ flex: 1, marginRight: 6 }}
          />
          <StatCard
            title="Today's Lectures"
            value={String(todayClasses.length)}
            subtitle="Scheduled periods"
            icon="time-outline"
            style={{ flex: 1, marginHorizontal: 3 }}
          />
          <StatCard
            title="Sessions Recorded"
            value={String(recentSessions.length)}
            subtitle="Recent batches"
            icon="checkmark-done-outline"
            style={{ flex: 1, marginLeft: 6 }}
          />
        </View>

        {/* Quick Action Grid */}
        <SectionHeader title="Faculty Workflows" subtitle="Academic administration and course delivery" />
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
              <View style={[styles.actionIconWrapper, { backgroundColor: `${action.color}15` }]}>
                <Ionicons name={action.icon} size={22} color={action.color} />
              </View>
              <Text style={styles.actionTitle} numberOfLines={1}>{action.title}</Text>
              <Text style={styles.actionSub} numberOfLines={1}>{action.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's Lectures */}
        <SectionHeader
          title="Today's Timetable"
          subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
        />
        <Card style={styles.scheduleCard} variant="outlined">
          {todayClasses.length === 0 ? (
            <EmptyState
              title="No Lectures Scheduled Today"
              message="You have no designated class periods on the institutional schedule for today."
              icon="calendar-outline"
            />
          ) : (
            todayClasses.map((c: any, idx: number) => (
              <View key={c._id || idx} style={[styles.slotRow, idx === todayClasses.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.periodCol}>
                  <Text style={styles.periodBadge}>Period {c.periodNo}</Text>
                  <Text style={styles.periodTime}>{c.startTime || '09:30 AM'}</Text>
                </View>
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <Text style={styles.subjectText}>{c.subjectId?.title || 'Subject Course'}</Text>
                  <Text style={styles.slotMeta}>
                    {c.departmentId?.code || 'DEPT'} • Sem {c.semester} (Sec {c.section || 'A'}) • Room: {c.roomNo || 'Main Block'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.takeAttQuickBtn}
                  onPress={() => navigation.navigate('FacultyAttendance')}
                  accessibilityLabel="Log attendance for period"
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </Card>

        {/* Assigned Subject Portfolio */}
        <SectionHeader title="Authorized Subject Portfolio" subtitle="Official department allocations" />
        <Card style={styles.portfolioCard} variant="outlined">
          {faculty?.assignedClasses && faculty.assignedClasses.length > 0 ? (
            faculty.assignedClasses.map((ac: any, idx: number) => (
              <View
                key={idx}
                style={[styles.assignedRow, idx === faculty.assignedClasses.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.assignedTitle}>{ac.subjectId?.title || 'Core Subject'}</Text>
                  <Text style={styles.assignedCode}>
                    Code: {ac.subjectId?.code || 'SUB-101'} • {ac.departmentId?.name || 'Department'}
                  </Text>
                </View>
                <Badge label={`Sem ${ac.semester} - Sec ${ac.section || 'A'}`} type="info" />
              </View>
            ))
          ) : (
            <EmptyState
              title="No Subjects Allocated"
              message="Contact Head of Department to configure your teaching allocations."
              icon="school-outline"
            />
          )}
        </Card>

        {/* Recent Attendance Sessions */}
        <SectionHeader
          title="Recent Attendance Logs"
          subtitle="Latest classroom sessions submitted"
          actionText="View All"
          onAction={() => navigation.navigate('FacultyAttendance')}
        />
        <Card style={styles.sessionsCard} variant="outlined">
          {recentSessions.length === 0 ? (
            <EmptyState
              title="No Recorded Sessions"
              message="Attendance sessions logged via mobile will appear here with audit timestamps."
              icon="time-outline"
            />
          ) : (
            recentSessions.map((s: any, idx: number) => (
              <View
                key={s._id || idx}
                style={[styles.sessionRow, idx === recentSessions.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionSubject}>{s.subjectId?.title || 'Subject Lecture'}</Text>
                  <Text style={styles.sessionMeta}>
                    {new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • Period {s.period}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.sessionCount}>
                    {s.presentCount}/{s.totalStudents} Present
                  </Text>
                  <Badge label="LOCKED" type="success" size="small" />
                </View>
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
  profileCard: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    padding: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
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
  avatarText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 18,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  nameText: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text,
  },
  designationText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  empIdText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
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
    padding: 12,
    alignItems: 'center',
  },
  actionIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.text,
    textAlign: 'center',
  },
  actionSub: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
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
  slotMeta: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  takeAttQuickBtn: {
    padding: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.tint,
  },
  portfolioCard: {
    padding: 12,
    marginBottom: 12,
  },
  assignedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  assignedTitle: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 13,
    color: theme.colors.text,
  },
  assignedCode: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sessionsCard: {
    padding: 12,
    marginBottom: 12,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  sessionSubject: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 13,
    color: theme.colors.text,
  },
  sessionMeta: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sessionCount: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 12,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  hodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#A5D6A7',
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#176B3A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  hodBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hodIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hodBannerTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 15,
    color: theme.colors.primaryDark,
  },
  hodBannerSubtitle: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
