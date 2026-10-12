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
} from 'react-native';
import { theme } from '../../theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const FacultyAttendanceScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { profile } = useAuth();
  const [selectedClassIdx, setSelectedClassIdx] = useState(0);
  const [period, setPeriod] = useState(1);
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceState, setAttendanceState] = useState<{ [studentId: string]: string }>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Correction state
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [selectedSessionForReview, setSelectedSessionForReview] = useState<any>(null);
  const [sessionRecords, setSessionRecords] = useState<any[]>([]);
  const [correctionReason, setCorrectionReason] = useState('');
  const [activeTab, setActiveTab] = useState<'ENTRY' | 'HISTORY'>('ENTRY');

  const assignedClasses = profile?.assignedClasses || [];
  const currentAssignedClass = assignedClasses[selectedClassIdx];

  const fetchStudents = async () => {
    if (!currentAssignedClass) return;
    setLoadingStudents(true);
    try {
      const deptId = currentAssignedClass.departmentId._id || currentAssignedClass.departmentId;
      const res = await api.get(
        `/attendance/students?departmentId=${deptId}&semester=${currentAssignedClass.semester}&section=${currentAssignedClass.section}`
      );
      if (res.success && res.data) {
        const studentList = res.data.students || [];
        setStudents(studentList);

        // Default all to PRESENT
        const initialStatus: { [id: string]: string } = {};
        studentList.forEach((s: any) => {
          initialStatus[s._id] = 'PRESENT';
        });
        setAttendanceState(initialStatus);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/attendance/history');
      if (res.success && res.data) {
        setHistorySessions(res.data.sessions || []);
      }
    } catch (err) {
      console.log('Error fetching attendance history:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'ENTRY') {
      fetchStudents();
    } else {
      fetchHistory();
    }
  }, [selectedClassIdx, activeTab]);

  const toggleStudentStatus = (studentId: string) => {
    setAttendanceState((prev) => {
      const current = prev[studentId] || 'PRESENT';
      let next = 'ABSENT';
      if (current === 'PRESENT') next = 'ABSENT';
      else if (current === 'ABSENT') next = 'OD';
      else next = 'PRESENT';
      return { ...prev, [studentId]: next };
    });
  };

  const handleSaveAttendance = async () => {
    if (!currentAssignedClass) return;

    setSubmitting(true);
    try {
      const deptId = currentAssignedClass.departmentId._id || currentAssignedClass.departmentId;
      const subId = currentAssignedClass.subjectId._id || currentAssignedClass.subjectId;

      const records = students.map((s) => ({
        studentId: s._id,
        status: attendanceState[s._id] || 'PRESENT',
      }));

      const res = await api.post('/attendance/sessions', {
        academicYear: '2023-2026',
        semester: currentAssignedClass.semester,
        departmentId: deptId,
        section: currentAssignedClass.section,
        subjectId: subId,
        date: dateStr,
        period: Number(period),
        records,
      });

      if (res.success) {
        Alert.alert(
          'Attendance Recorded',
          `Session finalized successfully for Period ${period} (${dateStr}).`
        );
        setActiveTab('HISTORY');
      }
    } catch (err: any) {
      Alert.alert('Attendance Error', err.message || 'Failed to record attendance');
    } finally {
      setSubmitting(false);
    }
  };

  // Inspect specific session records for correction
  const handleOpenSessionRecords = async (session: any) => {
    try {
      const res = await api.get(`/attendance/sessions/${session._id}`);
      if (res.success && res.data) {
        setSelectedSessionForReview(res.data.session);
        setSessionRecords(res.data.records);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // Correct record
  const handleCorrectRecord = async (record: any, newStatus: string) => {
    if (!correctionReason.trim()) {
      Alert.alert('Reason Required', 'Please enter a valid justification reason for correcting finalized attendance.');
      return;
    }

    try {
      const res = await api.put(`/attendance/records/${record._id}`, {
        status: newStatus,
        reasonForChange: correctionReason.trim(),
      });

      if (res.success) {
        Alert.alert('Record Corrected', 'Attendance status updated and audit log recorded.');
        setCorrectionReason('');
        handleOpenSessionRecords(selectedSessionForReview);
        fetchHistory();
      }
    } catch (err: any) {
      Alert.alert('Correction Failed', err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Attendance Register"
        subtitle="Daily Roll Call & Audit Records"
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* Tabs: Entry vs History */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ENTRY' && styles.tabItemActive]}
          onPress={() => {
            setActiveTab('ENTRY');
            setSelectedSessionForReview(null);
          }}
        >
          <Text style={[styles.tabText, activeTab === 'ENTRY' && styles.tabTextActive]}>
            Mark Roll Call
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'HISTORY' && styles.tabItemActive]}
          onPress={() => setActiveTab('HISTORY')}
        >
          <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.tabTextActive]}>
            History & Corrections
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'ENTRY' ? (
          <>
            {/* Class Portfolio Selector */}
            <Card style={styles.selectorCard}>
              <Text style={styles.cardHeading}>Select Class & Subject:</Text>
              {assignedClasses.length === 0 ? (
                <Text style={styles.emptyText}>No classes assigned to your faculty profile.</Text>
              ) : (
                assignedClasses.map((ac: any, idx: number) => {
                  const isSelected = selectedClassIdx === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.classChip, isSelected && styles.classChipSelected]}
                      onPress={() => setSelectedClassIdx(idx)}
                    >
                      <Text
                        style={[styles.classChipText, isSelected && styles.classChipTextSelected]}
                      >
                        {ac.subjectId?.title} (Sem {ac.semester} - Sec {ac.section})
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}

              {/* Period and Date Selector */}
              <View style={styles.metaRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Period (1 to 6):</Text>
                  <View style={styles.periodRow}>
                    {[1, 2, 3, 4, 5].map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[styles.pChip, period === p && styles.pChipActive]}
                        onPress={() => setPeriod(p)}
                      >
                        <Text style={[styles.pChipText, period === p && styles.pChipTextActive]}>
                          P{p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ width: 130 }}>
                  <Input
                    label="Date"
                    value={dateStr}
                    onChangeText={setDateStr}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>
            </Card>

            {/* Enrolled Students Roll Call */}
            <View style={styles.listHeaderRow}>
              <Text style={styles.sectionTitle}>
                Enrolled Students ({students.length})
              </Text>
              <Text style={styles.tapHint}>Tap status to toggle (P / A / OD)</Text>
            </View>

            {loadingStudents ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 20 }} />
            ) : students.length === 0 ? (
              <Card>
                <Text style={styles.emptyText}>No enrolled students found for selected class.</Text>
              </Card>
            ) : (
              students.map((student) => {
                const status = attendanceState[student._id] || 'PRESENT';
                return (
                  <Card key={student._id} style={styles.studentRowCard}>
                    <View style={styles.studentRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentName}>{student.fullName}</Text>
                        <Text style={styles.regNo}>{student.registerNo}</Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => toggleStudentStatus(student._id)}
                        style={[
                          styles.statusToggleBtn,
                          status === 'PRESENT' && styles.statusPresent,
                          status === 'ABSENT' && styles.statusAbsent,
                          status === 'OD' && styles.statusOD,
                        ]}
                      >
                        <Text style={styles.statusToggleText}>{status}</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                );
              })
            )}

            {students.length > 0 && (
              <Button
                title="Save & Finalize Attendance Session"
                onPress={handleSaveAttendance}
                loading={submitting}
                style={{ marginTop: 16 }}
              />
            )}
          </>
        ) : (
          /* History & Correction Tab */
          <>
            {selectedSessionForReview ? (
              <Card style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewTitle}>
                    {selectedSessionForReview.subjectId?.title} (Period {selectedSessionForReview.period})
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedSessionForReview(null)}>
                    <Text style={styles.closeReview}>‹ Back</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.reviewMeta}>
                  Date: {new Date(selectedSessionForReview.date).toLocaleDateString('en-IN')} • Present: {selectedSessionForReview.presentCount}/{selectedSessionForReview.totalStudents}
                </Text>

                <Input
                  label="Correction Justification Reason:"
                  placeholder="e.g. Medical leave certificate submitted by student"
                  value={correctionReason}
                  onChangeText={setCorrectionReason}
                />

                <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Student Records</Text>
                {sessionRecords.map((rec) => (
                  <View key={rec._id} style={styles.recItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{rec.studentId?.fullName}</Text>
                      <Text style={styles.regNo}>{rec.studentId?.registerNo}</Text>
                      {rec.reasonForChange ? (
                        <Text style={styles.correctionText}>
                          Reason: {rec.reasonForChange}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.correctionBtns}>
                      <Badge label={rec.status} type={rec.status === 'PRESENT' ? 'success' : 'error'} />
                      <TouchableOpacity
                        style={styles.changeBtn}
                        onPress={() =>
                          handleCorrectRecord(
                            rec,
                            rec.status === 'PRESENT' ? 'ABSENT' : 'PRESENT'
                          )
                        }
                      >
                        <Text style={styles.changeBtnText}>
                          Switch to {rec.status === 'PRESENT' ? 'ABSENT' : 'PRESENT'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </Card>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Recorded Attendance Sessions</Text>
                {historySessions.length === 0 ? (
                  <Card>
                    <Text style={styles.emptyText}>No recorded sessions found.</Text>
                  </Card>
                ) : (
                  historySessions.map((session) => (
                    <Card key={session._id} style={styles.historyItemCard}>
                      <View style={styles.sessionRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sessionSubTitle}>
                            {session.subjectId?.title}
                          </Text>
                          <Text style={styles.sessionMetaText}>
                            {new Date(session.date).toLocaleDateString('en-IN')} • Period {session.period} • Class {session.departmentId?.code} Sem {session.semester}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.attNumbers}>
                            {session.presentCount} / {session.totalStudents} Present
                          </Text>
                          <TouchableOpacity
                            style={styles.reviewBtn}
                            onPress={() => handleOpenSessionRecords(session)}
                          >
                            <Text style={styles.reviewBtnText}>Review / Correct ›</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Card>
                  ))
                )}
              </>
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
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
    marginHorizontal: 4,
  },
  tabItemActive: {
    backgroundColor: theme.colors.tint,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: 30,
  },
  selectorCard: {
    padding: 14,
    marginBottom: 12,
  },
  cardHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  classChip: {
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginVertical: 3,
    backgroundColor: '#FAFCFA',
  },
  classChipSelected: {
    backgroundColor: theme.colors.tint,
    borderColor: theme.colors.primary,
  },
  classChipText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  classChipTextSelected: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  periodRow: {
    flexDirection: 'row',
  },
  pChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    marginRight: 4,
    backgroundColor: '#FFFFFF',
  },
  pChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
  },
  pChipTextActive: {
    color: '#FFFFFF',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  tapHint: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  studentRowCard: {
    padding: 10,
    marginVertical: 3,
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  regNo: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  statusToggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
  },
  statusPresent: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  statusAbsent: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  statusOD: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  statusToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
  historyItemCard: {
    padding: 12,
    marginVertical: 4,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionSubTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sessionMetaText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  attNumbers: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  reviewBtn: {
    marginTop: 4,
  },
  reviewBtnText: {
    fontSize: 11,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  reviewCard: {
    padding: 14,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  closeReview: {
    fontSize: 13,
    color: theme.colors.secondary,
    fontWeight: '700',
  },
  reviewMeta: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 10,
    marginTop: 2,
  },
  recItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  correctionBtns: {
    alignItems: 'flex-end',
  },
  changeBtn: {
    marginTop: 4,
  },
  changeBtnText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  correctionText: {
    fontSize: 10,
    fontStyle: 'italic',
    color: theme.colors.warning,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
