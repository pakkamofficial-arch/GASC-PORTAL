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
import { StatCard } from '../../components/StatCard';
import { SectionHeader } from '../../components/SectionHeader';
import { EmptyState } from '../../components/EmptyState';
import { api } from '../../services/api';

type ReportTab = 'NAAC' | 'DEPTS' | 'PERFORMANCE';

export const AdminReportsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('NAAC');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [naacData, setNaacData] = useState<any>(null);
  const [deptSummary, setDeptSummary] = useState<any[]>([]);
  const [perfData, setPerfData] = useState<any[]>([]);

  const fetchReports = async () => {
    try {
      const [resNaac, resDept, resPerf] = await Promise.all([
        api.get('/reports/naac-indicators'),
        api.get('/reports/department-summary'),
        api.get('/reports/academic-performance'),
      ]);

      if (resNaac.success && resNaac.data) setNaacData(resNaac.data);
      if (resDept.success && resDept.data) setDeptSummary(resDept.data.reports || []);
      if (resPerf.success && resPerf.data) setPerfData(resPerf.data.report || []);
    } catch (err) {
      console.log('Error fetching reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const handleExportPDF = () => {
    Alert.alert(
      'Export PDF Report',
      'The comprehensive institutional analytics PDF is generated securely from local database records using PDFKit.\n\nEndpoint: /api/v1/reports/export/pdf\nAuthorized Role: Principal / Administrator',
      [{ text: 'OK' }]
    );
  };

  const handleExportCSV = () => {
    Alert.alert(
      'Export CSV Data',
      'Department enrollment & pass metrics CSV spreadsheet ready for NAAC SSR portal upload.\n\nEndpoint: /api/v1/reports/export/csv',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Institutional & NAAC Reports"
        subtitle="Government Arts & Science College, Kuthalam"
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* Segmented Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'NAAC' && styles.tabItemActive]}
          onPress={() => setActiveTab('NAAC')}
        >
          <Ionicons
            name="ribbon-outline"
            size={16}
            color={activeTab === 'NAAC' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'NAAC' && styles.tabTextActive]}>NAAC SSR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'DEPTS' && styles.tabItemActive]}
          onPress={() => setActiveTab('DEPTS')}
        >
          <Ionicons
            name="business-outline"
            size={16}
            color={activeTab === 'DEPTS' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'DEPTS' && styles.tabTextActive]}>Departments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'PERFORMANCE' && styles.tabItemActive]}
          onPress={() => setActiveTab('PERFORMANCE')}
        >
          <Ionicons
            name="analytics-outline"
            size={16}
            color={activeTab === 'PERFORMANCE' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'PERFORMANCE' && styles.tabTextActive]}>Results</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {/* Export Banner */}
        <Card style={styles.exportCard} variant="elevated">
          <View style={styles.exportRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.exportTitle}>Official Institutional Extracts</Text>
              <Text style={styles.exportDesc}>Accredited reports with college stamp & Principal signature</Text>
            </View>
            <View style={styles.exportButtons}>
              <Button
                title="PDF"
                variant="outline"
                size="small"
                icon="document-text-outline"
                onPress={handleExportPDF}
                style={{ marginRight: 6 }}
              />
              <Button
                title="CSV"
                variant="primary"
                size="small"
                icon="download-outline"
                onPress={handleExportCSV}
              />
            </View>
          </View>
        </Card>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Compiling institutional reports from live database...</Text>
          </View>
        ) : activeTab === 'NAAC' ? (
          /* NAAC SSR TAB */
          <>
            <SectionHeader
              title="Criterion II: Teaching-Learning & Evaluation"
              subtitle="Accreditation indicators per NAAC manual"
            />

            <View style={styles.statsRow}>
              <StatCard
                title="Student-Teacher Ratio"
                value={`${naacData?.studentTeacherRatio || 0} : 1`}
                subtitle="Full-time faculty basis"
                icon="people-outline"
                style={{ flex: 1, marginRight: 6 }}
              />
              <StatCard
                title="Total Enrolment"
                value={String(naacData?.totalStudents || 0)}
                subtitle="UG & PG programmes"
                icon="school-outline"
                style={{ flex: 1, marginLeft: 6 }}
              />
            </View>

            <View style={styles.statsRow}>
              <StatCard
                title="Academic Departments"
                value={String(naacData?.totalDepartments || 0)}
                subtitle="Tamil, English, CS, Math, Com"
                icon="business-outline"
                style={{ flex: 1, marginRight: 6 }}
              />
              <StatCard
                title="Sanctioned Faculty"
                value={String(naacData?.totalFaculty || 0)}
                subtitle="Teaching staff roster"
                icon="person-outline"
                style={{ flex: 1, marginLeft: 6 }}
              />
            </View>

            <SectionHeader
              title="Criterion V: Student Support & Progression"
              subtitle="Govt of Tamil Nadu welfare & scholarships"
            />

            <Card style={styles.welfareCard} variant="outlined">
              <View style={styles.welfareRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.welfareTitle}>Govt Concession Beneficiaries</Text>
                  <Text style={styles.welfareSub}>
                    SC/ST, BC/MBC scholarship & fee waivers disbursed
                  </Text>
                </View>
                <Text style={styles.welfareCount}>
                  {naacData?.totalBeneficiaries || 0} Students
                </Text>
              </View>

              <View style={styles.disbursedBox}>
                <Text style={styles.disbursedLabel}>Total Financial Relief Sanctioned:</Text>
                <Text style={styles.disbursedVal}>
                  ₹{(naacData?.totalConcessionDisbursed || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            </Card>

            <SectionHeader title="Criterion I: Curricular Aspects" subtitle="Programmes and affiliations" />
            <Card style={styles.affilCard} variant="outlined">
              <Text style={styles.affilText}>
                Affiliated Institution: <Text style={styles.bold}>Annamalai University, Annamalai Nagar</Text>
              </Text>
              <Text style={styles.affilText}>
                AISHE Code: <Text style={styles.bold}>C-43289</Text> • Mayiladuthurai District, Tamil Nadu
              </Text>
              <Text style={styles.affilText}>
                Programmes: <Text style={styles.bold}>B.A. (Tamil, English), B.Sc. (Comp Sci, Maths), B.Com.</Text>
              </Text>
            </Card>
          </>
        ) : activeTab === 'DEPTS' ? (
          /* DEPARTMENTS TAB */
          <>
            <SectionHeader
              title="Department Academic Strength"
              subtitle="Enrollment and faculty allocation"
            />
            {deptSummary.length === 0 ? (
              <EmptyState
                title="No Department Records"
                message="No academic department data found in database."
                icon="business-outline"
              />
            ) : (
              deptSummary.map((dept: any) => {
                const ratio = dept.facultyCount > 0 ? (dept.studentCount / dept.facultyCount).toFixed(1) : 'N/A';
                return (
                  <Card key={dept.departmentId} style={styles.deptCard} variant="outlined">
                    <View style={styles.deptHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.deptName}>{dept.name}</Text>
                        <Text style={styles.deptCode}>Code: {dept.code}</Text>
                      </View>
                      <Badge label={`${dept.studentCount} Students`} type="primary" />
                    </View>

                    <View style={styles.deptMetricsRow}>
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Teaching Staff</Text>
                        <Text style={styles.metricVal}>{dept.facultyCount}</Text>
                      </View>
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Enrolled Students</Text>
                        <Text style={styles.metricVal}>{dept.studentCount}</Text>
                      </View>
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Student-Teacher Ratio</Text>
                        <Text style={styles.metricVal}>{ratio} : 1</Text>
                      </View>
                    </View>
                  </Card>
                );
              })
            )}
          </>
        ) : (
          /* ACADEMIC PERFORMANCE RESULTS TAB */
          <>
            <SectionHeader
              title="CIA & Internal Assessment Pass Rates"
              subtitle="Published academic evaluation records"
            />
            {perfData.length === 0 ? (
              <EmptyState
                title="No Published Assessments"
                message="Published assessment results will appear here with pass percentages and score averages."
                icon="analytics-outline"
              />
            ) : (
              perfData.map((item: any) => (
                <Card key={item.assessmentId} style={styles.perfCard} variant="outlined">
                  <View style={styles.perfHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.perfTitle}>{item.title}</Text>
                      <Text style={styles.perfSubject}>
                        {item.subject} • {item.department}
                      </Text>
                    </View>
                    <Badge
                      label={`${item.passPercentage}% Pass`}
                      type={item.passPercentage >= 75 ? 'success' : item.passPercentage >= 50 ? 'warning' : 'error'}
                    />
                  </View>

                  <View style={styles.perfMetricsRow}>
                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel}>Enrolled</Text>
                      <Text style={styles.metricVal}>{item.totalEnrolled}</Text>
                    </View>
                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel}>Passed</Text>
                      <Text style={[styles.metricVal, { color: theme.colors.success }]}>
                        {item.passCount}
                      </Text>
                    </View>
                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel}>Failed</Text>
                      <Text style={[styles.metricVal, { color: theme.colors.error }]}>
                        {item.failCount}
                      </Text>
                    </View>
                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel}>Avg Score</Text>
                      <Text style={styles.metricVal}>
                        {item.averageMark} / {item.maxMarks}
                      </Text>
                    </View>
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
  centerBox: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontFamily: theme.typography.families.primary,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  exportCard: {
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  exportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exportTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 13,
    color: theme.colors.text,
  },
  exportDesc: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  exportButtons: {
    flexDirection: 'row',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  welfareCard: {
    padding: 14,
    marginBottom: 12,
  },
  welfareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  welfareTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 13,
    color: theme.colors.text,
  },
  welfareSub: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  welfareCount: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 14,
    color: theme.colors.primary,
  },
  disbursedBox: {
    backgroundColor: theme.colors.tint,
    padding: 10,
    borderRadius: theme.borderRadius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disbursedLabel: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: theme.colors.text,
  },
  disbursedVal: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 14,
    color: theme.colors.primary,
  },
  affilCard: {
    padding: 14,
    marginBottom: 12,
  },
  affilText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  bold: {
    fontFamily: theme.typography.families.primaryBold,
  },
  deptCard: {
    padding: 14,
    marginBottom: 10,
  },
  deptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deptName: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  deptCode: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  deptMetricsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.tint,
    borderRadius: theme.borderRadius.sm,
    padding: 8,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  metricVal: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 13,
    color: theme.colors.text,
    marginTop: 2,
  },
  perfCard: {
    padding: 14,
    marginBottom: 10,
  },
  perfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  perfTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  perfSubject: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  perfMetricsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.tint,
    borderRadius: theme.borderRadius.sm,
    padding: 8,
  },
});
