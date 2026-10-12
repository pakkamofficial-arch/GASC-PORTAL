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

export const AdminDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAdminStats = async () => {
    try {
      setError(null);
      const res = await api.get('/admin/dashboard');
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Could not load administrative metrics.');
      }
    } catch (err: any) {
      console.log('Error fetching admin dashboard:', err);
      setError(err.message || 'Network error fetching administrative metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminStats();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Administration Portal" subtitle="GASC Kuthalam" />
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Administration Portal" subtitle="GASC Kuthalam" />
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.error} />
          <Text style={[styles.loadingText, { color: theme.colors.error, marginVertical: 12 }]}>{error}</Text>
          <Button title="Retry Connection" onPress={() => { setLoading(true); fetchAdminStats(); }} variant="primary" />
        </View>
      </SafeAreaView>
    );
  }

  const stats = data?.stats || {};
  const recentLogs = data?.recentAuditLogs || [];

  const workflows = [
    {
      id: 'students',
      title: 'Student Directory & Admissions',
      desc: 'Enrolment records, roll allocations, status toggle',
      icon: 'people-outline' as const,
      color: theme.colors.primary,
      screen: 'AdminStudents',
      badge: `${stats.totalStudents || 0} enrolled`,
    },
    {
      id: 'faculty',
      title: 'Faculty & Staff Roster',
      desc: 'Department rosters, subject mappings, credential reset',
      icon: 'briefcase-outline' as const,
      color: '#1565C0',
      screen: 'AdminFaculty',
      badge: `${stats.totalFaculty || 0} active`,
    },
    {
      id: 'bonafide',
      title: 'Certificate Approvals & Seal',
      desc: 'Bonafide, Conduct, and Transfer requests workflow',
      icon: 'ribbon-outline' as const,
      color: '#E65100',
      screen: 'AdminBonafide',
      badge: stats.pendingBonafide ? `${stats.pendingBonafide} pending` : 'All cleared',
      badgeType: (stats.pendingBonafide ? 'warning' : 'success') as any,
    },
    {
      id: 'classes',
      title: 'Classes & In-Charge Assignments',
      desc: '5 Courses, 15 Year Classes, In-Charge Allocation & Policies',
      icon: 'school-outline' as const,
      color: '#1B5E20',
      screen: 'AdminClasses',
      badge: '15 Classes',
    },
    {
      id: 'templates',
      title: 'Document Templates & Signatories',
      desc: 'Certificate PDF layouts, placeholders & Principal seal configuration',
      icon: 'document-text-outline' as const,
      color: '#4A148C',
      screen: 'AdminTemplates',
    },
    {
      id: 'complaints',
      title: 'Grievance Cell & Complaints',
      desc: 'Confidential student grievances, internal notes & resolution',
      icon: 'shield-outline' as const,
      color: '#B71C1C',
      screen: 'AdminComplaints',
    },
    {
      id: 'admission',
      title: 'Student Admission Entry',
      desc: 'Official admission record onboarding and verification setup',
      icon: 'person-add-outline' as const,
      color: '#00695C',
      screen: 'StudentAdmission',
    },
    {
      id: 'events',
      title: 'College Calendar & Events',
      desc: 'Examinations, academic schedules, public holidays & events',
      icon: 'calendar-outline' as const,
      color: '#0D47A1',
      screen: 'EventsCalendar',
    },
    {
      id: 'reports',
      title: 'Institutional & NAAC Reports',
      desc: 'Department summaries, pass percentages, PDF/CSV export',
      icon: 'bar-chart-outline' as const,
      color: '#00838F',
      screen: 'AdminReports',
    },
    {
      id: 'chat',
      title: 'College Encrypted Chat',
      desc: 'Secure class groups, faculty channels & executive communications',
      icon: 'chatbubbles-outline' as const,
      color: '#176B3A',
      screen: 'ChatList',
      badge: 'E2EE',
    },
    {
      id: 'security-cleanup',
      title: 'Security & Demo Data Cleanup',
      desc: 'Single Primary Admin, E2EE integrity & safe backup-first cleanup',
      icon: 'lock-closed-outline' as const,
      color: '#D32F2F',
      screen: 'AdminSecurity',
      badge: 'Security',
    },
    {
      id: 'audit',
      title: 'Audit Logs & System Security',
      desc: 'Tamper-evident logs of logins, mark alterations & records',
      icon: 'shield-checkmark-outline' as const,
      color: '#4E342E',
      screen: 'AdminAuditLogs',
    },
    {
      id: 'ai-assistant',
      title: 'AI College Assistant',
      desc: 'Institutional analytics Q&A, counts & system assistance',
      icon: 'sparkles-outline' as const,
      color: '#6A1B9A',
      screen: 'AIChat',
      badge: 'Interactive AI',
    },
    {
      id: 'notices',
      title: 'Official Circulars & Broadcasts',
      desc: 'Publish college-wide announcements and exam schedules',
      icon: 'megaphone-outline' as const,
      color: '#558B2F',
      screen: 'Notices',
    },
    {
      id: 'about-college',
      title: 'About College & Institutional Profile',
      desc: 'Campus photograph, institutional facts, departments & affiliation',
      icon: 'business-outline' as const,
      color: theme.colors.primaryDark,
      screen: 'AboutCollege',
      badge: 'Profile',
      badgeType: 'info' as any,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Admin Control Centre"
        subtitle="Principal's Office • GASC Kuthalam"
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
        {/* Institutional Overview Header */}
        <Card style={styles.institutionCard} variant="elevated">
          <View style={styles.institutionRow}>
            <View style={styles.emblemBadge}>
              <Ionicons name="business" size={24} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.collegeName}>Govt. Arts & Science College, Kuthalam</Text>
              <Text style={styles.collegeAffiliation}>Affiliated to Annamalai University • Mayiladuthurai Dt.</Text>
              <Text style={styles.adminRoleText}>Administrative Session: 2024-2025 (Odd Term)</Text>
            </View>
          </View>
        </Card>

        {/* Core Institutional Stats Grid */}
        <View style={styles.statsRow}>
          <StatCard
            title="Total Students"
            value={String(stats.totalStudents || 0)}
            subtitle="Undergraduate & PG"
            icon="school-outline"
            style={{ flex: 1, marginRight: 6 }}
          />
          <StatCard
            title="Faculty Staff"
            value={String(stats.totalFaculty || 0)}
            subtitle="Permanent & Guest"
            icon="person-outline"
            style={{ flex: 1, marginLeft: 6 }}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title="Pending Certificates"
            value={String(stats.pendingBonafide || 0)}
            subtitle="Awaiting sanction"
            icon="document-text-outline"
            style={{ flex: 1, marginRight: 6 }}
          />
          <StatCard
            title="Reconciled Fees"
            value={`₹${(stats.totalFeesCollected || 0).toLocaleString('en-IN')}`}
            subtitle="Verified transactions"
            icon="cash-outline"
            style={{ flex: 1, marginLeft: 6 }}
          />
        </View>

        {/* Administrative Modules */}
        <SectionHeader
          title="Institutional Modules"
          subtitle="Authorized Principal & administrative operations"
        />

        <View style={styles.workflowList}>
          {workflows.map((wf) => (
            <TouchableOpacity
              key={wf.id}
              style={styles.workflowTile}
              onPress={() => navigation.navigate(wf.screen)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={wf.title}
            >
              <View style={[styles.workflowIconBox, { backgroundColor: `${wf.color}15` }]}>
                <Ionicons name={wf.icon} size={22} color={wf.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.workflowTitleRow}>
                  <Text style={styles.workflowTitle}>{wf.title}</Text>
                  {wf.badge && (
                    <Badge label={wf.badge} type={wf.badgeType || 'neutral'} size="small" />
                  )}
                </View>
                <Text style={styles.workflowDesc}>{wf.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Real-Time Audit Log Summary */}
        <SectionHeader
          title="Recent Audit Activity"
          subtitle="Verifiable ledger of all system mutations"
          actionText="Full Audit ›"
          onAction={() => navigation.navigate('AdminAuditLogs')}
        />

        <Card style={styles.auditCard} variant="outlined">
          {recentLogs.length === 0 ? (
            <EmptyState
              title="No Recent Audit Records"
              message="System security events and staff operations will appear here in chronological order."
              icon="shield-checkmark-outline"
            />
          ) : (
            recentLogs.slice(0, 5).map((log: any, idx: number) => (
              <View
                key={log._id || idx}
                style={[styles.logRow, idx === Math.min(recentLogs.length, 5) - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.logAction}>{log.action.replace(/_/g, ' ')}</Text>
                  <Text style={styles.logMeta}>
                    Entity: {log.targetEntity || 'System'} • {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} • IP: {log.ipAddress || 'Internal'}
                  </Text>
                </View>
                <Badge label={log.performedBy?.role || 'SYSTEM'} type="neutral" size="small" />
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
  institutionCard: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    padding: 14,
  },
  institutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emblemBadge: {
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
  collegeName: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  collegeAffiliation: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: theme.colors.primary,
    marginTop: 2,
  },
  adminRoleText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  workflowList: {
    marginBottom: 12,
  },
  workflowTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  workflowIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workflowTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  workflowTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 13,
    color: theme.colors.text,
  },
  workflowDesc: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  auditCard: {
    padding: 12,
    marginBottom: 12,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  logAction: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.text,
  },
  logMeta: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
