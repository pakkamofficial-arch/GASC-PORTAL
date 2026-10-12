import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { StaffRosterSkeleton } from '../../components/skeleton';
import { api } from '../../services/api';

export const AdminStudentsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  // Modal States
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState<boolean>(false);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);

  // Promotion Modal States
  const [promoteModalVisible, setPromoteModalVisible] = useState<boolean>(false);
  const [promotingStudent, setPromotingStudent] = useState<any | null>(null);
  const [promoYear, setPromoYear] = useState<string>('2');
  const [promoSemester, setPromoSemester] = useState<string>('3');
  const [promoAcademicYear, setPromoAcademicYear] = useState<string>('2025-2026');
  const [promoSection, setPromoSection] = useState<string>('A');
  const [promoRemarks, setPromoRemarks] = useState<string>('Regular academic progression');
  const [promoting, setPromoting] = useState<boolean>(false);

  // Bulk Import Modal States
  const [importModalVisible, setImportModalVisible] = useState<boolean>(false);
  const [importDataText, setImportDataText] = useState<string>('');
  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await api.get(`/admin/students?search=${encodeURIComponent(search)}`);
      if (res.success && res.data) {
        setStudents(res.data.students || []);
      }
    } catch (err) {
      console.log('Error fetching students:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudents();
  };

  const handleToggleStatus = async (student: any) => {
    const currentStatus = student.userId?.status || 'ACTIVE';
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    try {
      const res = await api.patch(`/admin/users/${student.userId?._id}/status`, {
        status: nextStatus,
      });

      if (res.success) {
        Alert.alert('Status Updated', `Account status for ${student.fullName} changed to ${nextStatus}.`);
        fetchStudents();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update account status.');
    }
  };

  const handleOpenDetails = async (student: any) => {
    setSelectedStudent(student);
    setDetailsModalVisible(true);
    setDetailsLoading(true);
    try {
      const res = await api.get(`/students/${student._id}`);
      if (res.success && res.data) {
        setStudentDetails(res.data);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load student details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleOpenPromote = (student: any) => {
    setPromotingStudent(student);
    const currYear = student.year || Math.ceil((student.currentSemester || 1) / 2);
    const nextYear = currYear < 3 ? currYear + 1 : 3;
    const nextSem = (student.currentSemester || 1) + 2;
    setPromoYear(String(nextYear));
    setPromoSemester(String(nextSem > 6 ? 6 : nextSem));
    setPromoSection(student.section || 'A');
    setPromoAcademicYear('2025-2026');
    setPromoRemarks('Regular academic progression to Year ' + nextYear);
    setPromoteModalVisible(true);
  };

  const handleExecutePromotion = async () => {
    if (!promotingStudent) return;
    setPromoting(true);
    try {
      const res = await api.post(`/students/${promotingStudent._id}/promote`, {
        targetAcademicYear: promoAcademicYear.trim(),
        targetYear: parseInt(promoYear, 10),
        targetSemester: parseInt(promoSemester, 10),
        targetSection: promoSection.trim().toUpperCase(),
        remarks: promoRemarks.trim(),
      });

      if (res.success) {
        Alert.alert('Student Promoted', res.message || 'Academic promotion recorded successfully.');
        setPromoteModalVisible(false);
        fetchStudents();
      }
    } catch (err: any) {
      Alert.alert('Promotion Error', err.message || 'Failed to record student promotion.');
    } finally {
      setPromoting(false);
    }
  };

  const handleLoadSampleImport = () => {
    const samplePayload = [
      {
        registerNo: '24UCS091',
        rollNumber: '24CS91',
        fullName: 'Karthikeyan S',
        departmentCode: 'CS',
        courseCode: 'CS01',
        year: 1,
        semester: 1,
        section: 'A',
        academicYear: '2024-2025',
        phone: '9840123491',
        guardianName: 'Selvaraj V',
        guardianPhone: '9840123490',
        address: '42 South Street, Kuthalam',
      },
      {
        registerNo: '24UCS092',
        rollNumber: '24CS92',
        fullName: 'Meenakshi R',
        departmentCode: 'CS',
        courseCode: 'CS01',
        year: 1,
        semester: 1,
        section: 'A',
        academicYear: '2024-2025',
        phone: '9840123492',
        guardianName: 'Ramasamy T',
        guardianPhone: '9840123493',
        address: '15 Gandhi Road, Mayiladuthurai',
      },
    ];
    setImportDataText(JSON.stringify(samplePayload, null, 2));
  };

  const handleExecuteImport = async () => {
    if (!importDataText.trim()) {
      Alert.alert('Empty Input', 'Please paste JSON student rows or load the sample template.');
      return;
    }

    let parsedStudents: any[] = [];
    try {
      parsedStudents = JSON.parse(importDataText.trim());
      if (!Array.isArray(parsedStudents)) {
        Alert.alert('Invalid Format', 'Input must be a JSON array of student objects.');
        return;
      }
    } catch (e: any) {
      Alert.alert('JSON Parse Error', 'Please verify that your input is a valid JSON array: ' + e.message);
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const res = await api.post('/admin/students/import', { students: parsedStudents });
      if (res.data) {
        setImportResult(res.data);
        if (res.data.createdCount > 0) {
          fetchStudents();
        }
      }
    } catch (err: any) {
      Alert.alert('Import Failed', err.message || 'Error executing bulk import.');
    } finally {
      setImporting(false);
    }
  };

  const filteredStudents = students.filter((st) => {
    if (statusFilter === 'ALL') return true;
    const currentStatus = st.userId?.status || 'ACTIVE';
    return currentStatus === statusFilter;
  });

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Student Directory"
        subtitle="Enrolment, Promotion & Bulk Ledger"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {/* Quick Action Bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('StudentAdmission')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Register single student"
          >
            <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>New Admission</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#1565C0' }]}
            onPress={() => {
              setImportResult(null);
              setImportModalVisible(true);
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Bulk student import"
          >
            <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Bulk Import</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <Input
          label="Search by Register No, Roll No, or Name"
          placeholder="e.g. 24UCS001, 24CS01, or Anandhan"
          value={search}
          onChangeText={setSearch}
          leftIcon="search-outline"
        />

        {/* Status Filter Chips */}
        <View style={styles.filterRow}>
          {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, statusFilter === filter && styles.filterChipTextActive]}>
                {filter === 'ALL' ? 'All Students' : filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section Header */}
        <View style={styles.rosterHeader}>
          <Text style={styles.sectionTitle}>Enrolled Students ({filteredStudents.length})</Text>
        </View>

        {loading ? (
          <StaffRosterSkeleton count={5} />
        ) : filteredStudents.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No students match the current filters or search query.</Text>
          </Card>
        ) : (
          filteredStudents.map((st) => {
            const status = st.userId?.status || 'ACTIVE';
            return (
              <Card key={st._id} style={styles.studentCard} elevated>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameBadgeRow}>
                      <Text style={styles.stName}>{st.fullName}</Text>
                      <Badge label={status} type={status === 'ACTIVE' ? 'success' : 'error'} />
                    </View>
                    <Text style={styles.stReg}>
                      Reg No: <Text style={styles.bold}>{st.registerNo}</Text>
                      {st.rollNumber ? ` • Roll: ${st.rollNumber}` : ''}
                    </Text>
                    <Text style={styles.stDept}>
                      {st.courseId?.name || st.courseId?.code || 'Degree'} • Year {st.year || Math.ceil((st.currentSemester || 1) / 2)} (Sem {st.currentSemester})
                    </Text>
                    <Text style={styles.stClassMeta}>
                      Section {st.section || 'A'} • Batch {st.batchId?.name || st.batchId?.batchName || st.academicYear || '2024-2027'}
                    </Text>
                  </View>
                </View>

                {/* Card Action Buttons */}
                <View style={styles.cardFooterActions}>
                  <TouchableOpacity
                    style={styles.detailBtn}
                    onPress={() => handleOpenDetails(st)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="eye-outline" size={14} color="#1565C0" />
                    <Text style={styles.detailBtnText}>Details & Attendance</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.promoteBtn}
                    onPress={() => handleOpenPromote(st)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="trending-up-outline" size={14} color="#176B3A" />
                    <Text style={styles.promoteBtnText}>Promote</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.statusBtn, status === 'ACTIVE' ? styles.statusBtnSuspend : styles.statusBtnActivate]}
                    onPress={() => handleToggleStatus(st)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={status === 'ACTIVE' ? 'lock-closed-outline' : 'checkmark-circle-outline'}
                      size={13}
                      color={status === 'ACTIVE' ? '#C62828' : '#2E7D32'}
                    />
                    <Text style={[styles.statusBtnText, { color: status === 'ACTIVE' ? '#C62828' : '#2E7D32' }]}>
                      {status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* 1. Student Details & Attendance Modal */}
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Student Profile & History</Text>
                <Text style={styles.modalSubtitle}>{selectedStudent?.fullName} ({selectedStudent?.registerNo})</Text>
              </View>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {detailsLoading ? (
                <View style={styles.modalCenter}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Loading complete profile & attendance records...</Text>
                </View>
              ) : (
                <>
                  {/* Attendance Performance Card */}
                  <View style={styles.attOverviewBox}>
                    <Text style={styles.attBoxTitle}>Attendance Performance</Text>
                    <View style={styles.attMetricsRow}>
                      <View style={styles.attMetricItem}>
                        <Text style={styles.attMetricVal}>
                          {studentDetails?.attendance?.totalSessions || 0}
                        </Text>
                        <Text style={styles.attMetricLabel}>Total Periods</Text>
                      </View>
                      <View style={styles.attMetricItem}>
                        <Text style={[styles.attMetricVal, { color: '#2E7D32' }]}>
                          {studentDetails?.attendance?.attended || 0}
                        </Text>
                        <Text style={styles.attMetricLabel}>Attended</Text>
                      </View>
                      <View style={styles.attMetricItem}>
                        <Text style={[styles.attMetricVal, { color: '#C62828' }]}>
                          {studentDetails?.attendance?.absent || 0}
                        </Text>
                        <Text style={styles.attMetricLabel}>Absent</Text>
                      </View>
                      <View style={styles.attMetricItem}>
                        <Text
                          style={[
                            styles.attMetricVal,
                            {
                              color:
                                (studentDetails?.attendance?.percentage || 0) < 75 ? '#C62828' : '#176B3A',
                            },
                          ]}
                        >
                          {studentDetails?.attendance?.percentage != null
                            ? `${studentDetails.attendance.percentage}%`
                            : '100%'}
                        </Text>
                        <Text style={styles.attMetricLabel}>Overall %</Text>
                      </View>
                    </View>
                    {(studentDetails?.attendance?.percentage || 100) < 75 && (
                      <View style={styles.shortageAlert}>
                        <Ionicons name="warning-outline" size={16} color="#C62828" style={{ marginRight: 6 }} />
                        <Text style={styles.shortageAlertText}>
                          Below mandatory 75% attendance criterion. Condonation / Parent Notification required.
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Academic Profile Details */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Institutional Enrolment</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Department:</Text>
                      <Text style={styles.detailVal}>{studentDetails?.student?.departmentId?.name || '-'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Degree Programme:</Text>
                      <Text style={styles.detailVal}>{studentDetails?.student?.courseId?.name || '-'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Batch:</Text>
                      <Text style={styles.detailVal}>{studentDetails?.student?.batchId?.name || studentDetails?.student?.batchId?.batchName || studentDetails?.student?.academicYear || '-'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Current Class:</Text>
                      <Text style={styles.detailVal}>{studentDetails?.student?.classId?.name || `Year ${studentDetails?.student?.year || 1} Sec ${studentDetails?.student?.section || 'A'}`}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Roll Number:</Text>
                      <Text style={styles.detailVal}>{studentDetails?.student?.rollNumber || studentDetails?.student?.registerNo || '-'}</Text>
                    </View>
                  </View>

                  {/* Contact & Guardian */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Contact & Guardian Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Guardian Name:</Text>
                      <Text style={styles.detailVal}>{studentDetails?.student?.guardianName || '-'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Guardian Phone:</Text>
                      <Text style={styles.detailVal}>{studentDetails?.student?.guardianPhone || '-'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Student Phone:</Text>
                      <Text style={styles.detailVal}>{studentDetails?.student?.phone || '-'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Address:</Text>
                      <Text style={styles.detailVal}>{studentDetails?.student?.address || '-'}</Text>
                    </View>
                  </View>

                  {/* Academic History Timeline */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Academic History & Promotions</Text>
                    {!studentDetails?.academicHistory || studentDetails.academicHistory.length === 0 ? (
                      <Text style={styles.emptyTimelineText}>No prior promotion records logged yet.</Text>
                    ) : (
                      studentDetails.academicHistory.map((hist: any, idx: number) => (
                        <View key={hist._id || idx} style={styles.historyItem}>
                          <View style={styles.historyDot} />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <View style={styles.historyHeader}>
                              <Text style={styles.historyTitle}>
                                Year {hist.year} • Semester {hist.semester} ({hist.academicYear})
                              </Text>
                              <Badge
                                label={hist.status}
                                type={hist.status === 'CURRENT' ? 'success' : 'neutral'}
                              />
                            </View>
                            <Text style={styles.historyMeta}>
                              Section {hist.section} • Class: {hist.classId?.name || 'Assigned Class'}
                            </Text>
                            {hist.remarks && (
                              <Text style={styles.historyRemarks}>Note: {hist.remarks}</Text>
                            )}
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* 2. Promotion Modal */}
      <Modal
        visible={promoteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPromoteModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Controlled Academic Promotion</Text>
                <Text style={styles.modalSubtitle}>
                  {promotingStudent?.fullName} ({promotingStudent?.registerNo})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPromoteModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.promoCurrentCard}>
                <Text style={styles.promoCurrentTitle}>Current Academic Position</Text>
                <Text style={styles.promoCurrentText}>
                  Year {promotingStudent?.year || 1} • Semester {promotingStudent?.currentSemester || 1} • Section {promotingStudent?.section || 'A'} ({promotingStudent?.academicYear || '2024-2025'})
                </Text>
              </View>

              <Text style={styles.fieldHeading}>Target Promotion Parameters</Text>

              <View style={styles.promoRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Input
                    label="Target Year (1, 2, or 3) *"
                    value={promoYear}
                    onChangeText={setPromoYear}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Target Semester (1-6) *"
                    value={promoSemester}
                    onChangeText={setPromoSemester}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.promoRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Input
                    label="Target Academic Year *"
                    value={promoAcademicYear}
                    onChangeText={setPromoAcademicYear}
                    placeholder="2025-2026"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Target Section *"
                    value={promoSection}
                    onChangeText={setPromoSection}
                    placeholder="A"
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <Input
                label="Promotion Remarks / Order Reference"
                value={promoRemarks}
                onChangeText={setPromoRemarks}
                placeholder="e.g. Regular promotion based on Odd semester exams"
              />

              <Button
                title={promoting ? 'Processing Promotion...' : 'Confirm & Promote Student'}
                variant="primary"
                loading={promoting}
                onPress={handleExecutePromotion}
                style={{ marginTop: 12 }}
              />
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* 3. Bulk Import Modal */}
      <Modal
        visible={importModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setImportModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Bulk Student Import</Text>
                <Text style={styles.modalSubtitle}>JSON payload ingestion with error reporting</Text>
              </View>
              <TouchableOpacity onPress={() => setImportModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.importInstructions}>
                <Ionicons name="document-text-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.importInstructionsText}>
                  Supply an array of student objects. Fields supported: registerNo, rollNumber, fullName, departmentCode, courseCode, year, semester, section, academicYear, phone, guardianName, guardianPhone, address.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.sampleFillBtn}
                onPress={handleLoadSampleImport}
                activeOpacity={0.8}
              >
                <Ionicons name="flash-outline" size={14} color={theme.colors.primary} />
                <Text style={styles.sampleFillText}>Load 2 Verified Sample Records</Text>
              </TouchableOpacity>

              <Text style={styles.fieldHeading}>Paste JSON Student Array:</Text>
              <TextInput
                style={styles.jsonInput}
                multiline
                numberOfLines={8}
                value={importDataText}
                onChangeText={setImportDataText}
                placeholder='[&#10;  {&#10;    "registerNo": "24UCS091",&#10;    "rollNumber": "24CS91",&#10;    "fullName": "Karthikeyan S",&#10;    "departmentCode": "CS",&#10;    "courseCode": "CS01",&#10;    "year": 1,&#10;    "semester": 1,&#10;    "section": "A",&#10;    "academicYear": "2024-2025"&#10;  }&#10;]'
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Button
                title={importing ? 'Validating & Importing...' : 'Validate & Import Records'}
                variant="primary"
                loading={importing}
                onPress={handleExecuteImport}
                style={{ marginTop: 12 }}
              />

              {/* Import Results Banner & Error Ledger */}
              {importResult && (
                <View style={styles.importResultBox}>
                  <Text style={styles.resultSummaryTitle}>Import Outcome Summary</Text>
                  <View style={styles.resultStatsRow}>
                    <View style={styles.resultStat}>
                      <Text style={styles.resultStatVal}>{importResult.totalRows || 0}</Text>
                      <Text style={styles.resultStatLabel}>Total Rows</Text>
                    </View>
                    <View style={styles.resultStat}>
                      <Text style={[styles.resultStatVal, { color: '#2E7D32' }]}>{importResult.createdCount || 0}</Text>
                      <Text style={styles.resultStatLabel}>Created</Text>
                    </View>
                    <View style={styles.resultStat}>
                      <Text style={[styles.resultStatVal, { color: '#C62828' }]}>{importResult.errorCount || 0}</Text>
                      <Text style={styles.resultStatLabel}>Failed/Skipped</Text>
                    </View>
                  </View>

                  {importResult.errors && importResult.errors.length > 0 && (
                    <View style={styles.errorListContainer}>
                      <Text style={styles.errorListTitle}>Row-by-Row Error Log:</Text>
                      {importResult.errors.map((errItem: any, idx: number) => (
                        <View key={idx} style={styles.errorCard}>
                          <Text style={styles.errorRowLabel}>
                            Row #{errItem.row}: <Text style={{ fontWeight: '700' }}>{errItem.registerNo || 'Unknown'}</Text>
                          </Text>
                          <Text style={styles.errorReason}>{errItem.error}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
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
    paddingBottom: 40,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: 4,
    elevation: 2,
  },
  actionBtnText: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 13,
    color: '#FFFFFF',
    marginLeft: 6,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#EAEAEA',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: theme.typography.families.primaryBold,
    color: theme.colors.text,
  },
  loadingBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: theme.typography.families.primary,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  studentCard: {
    padding: 14,
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stName: {
    fontSize: 15,
    fontFamily: theme.typography.families.primaryBold,
    color: theme.colors.text,
  },
  stReg: {
    fontSize: 12,
    fontFamily: theme.typography.families.primary,
    color: theme.colors.primary,
    marginTop: 2,
  },
  stDept: {
    fontSize: 12,
    fontFamily: theme.typography.families.primaryMedium,
    color: theme.colors.text,
    marginTop: 2,
  },
  stClassMeta: {
    fontSize: 11,
    fontFamily: theme.typography.families.primary,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  bold: {
    fontWeight: '700',
  },
  cardFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: '#E3F2FD',
  },
  detailBtnText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: '#1565C0',
    marginLeft: 4,
  },
  promoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: '#E8F5E9',
  },
  promoteBtnText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: '#176B3A',
    marginLeft: 4,
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
  },
  statusBtnSuspend: {
    backgroundColor: '#FFEBEE',
  },
  statusBtnActivate: {
    backgroundColor: '#E8F5E9',
  },
  statusBtnText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    marginLeft: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  modalTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 16,
    color: theme.colors.text,
  },
  modalSubtitle: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  modalScroll: {
    padding: 16,
  },
  modalCenter: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attOverviewBox: {
    backgroundColor: '#F1F8F1',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: theme.borderRadius.md,
    padding: 14,
    marginBottom: 16,
  },
  attBoxTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 14,
    color: theme.colors.primaryDark,
    marginBottom: 10,
  },
  attMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  attMetricItem: {
    alignItems: 'center',
  },
  attMetricVal: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 18,
    color: theme.colors.text,
  },
  attMetricLabel: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  shortageAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: theme.borderRadius.sm,
    padding: 8,
    marginTop: 10,
  },
  shortageAlertText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: '#C62828',
    flex: 1,
  },
  detailSection: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: 14,
  },
  detailSectionTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailKey: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  detailVal: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 12,
    color: theme.colors.text,
    textAlign: 'right',
    maxWidth: '65%',
  },
  emptyTimelineText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.textSecondary,
    paddingVertical: 8,
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 12,
    color: theme.colors.text,
  },
  historyMeta: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  historyRemarks: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: '#616161',
    fontStyle: 'italic',
    marginTop: 2,
  },
  promoCurrentCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: 14,
  },
  promoCurrentTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 12,
    color: theme.colors.primaryDark,
  },
  promoCurrentText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 4,
  },
  fieldHeading: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 8,
  },
  promoRow: {
    flexDirection: 'row',
  },
  importInstructions: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginBottom: 10,
  },
  importInstructionsText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: '#2E7D32',
    flex: 1,
    lineHeight: 16,
  },
  sampleFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2F1',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 10,
  },
  sampleFillText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.primary,
    marginLeft: 4,
  },
  jsonInput: {
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    fontFamily: 'monospace',
    fontSize: 11,
    color: theme.colors.text,
    backgroundColor: '#FAFAFA',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  importResultBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  resultSummaryTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 8,
  },
  resultStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  resultStat: {
    alignItems: 'center',
  },
  resultStatVal: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 16,
    color: theme.colors.text,
  },
  resultStatLabel: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  errorListContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: 8,
  },
  errorListTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 12,
    color: '#C62828',
    marginBottom: 6,
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 6,
  },
  errorRowLabel: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: '#B71C1C',
  },
  errorReason: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: '#C62828',
    marginTop: 2,
  },
});
