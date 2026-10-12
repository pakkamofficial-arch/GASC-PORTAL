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
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const FacultyMarksScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { profile } = useAuth();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [studentsWithMarks, setStudentsWithMarks] = useState<any[]>([]);
  const [marksState, setMarksState] = useState<{ [studentId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'LIST' | 'ENTRY'>('LIST');

  // Form to create new assessment
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'INTERNAL_TEST' | 'ASSIGNMENT' | 'SEMINAR'>('INTERNAL_TEST');
  const [newMaxMarks, setNewMaxMarks] = useState('25');
  const [creating, setCreating] = useState(false);

  const fetchAssessments = async () => {
    try {
      const res = await api.get('/assessments');
      if (res.success && res.data) {
        setAssessments(res.data.assessments || []);
      }
    } catch (err) {
      console.log('Error fetching assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const openAssessmentMarks = async (assessment: any) => {
    setSelectedAssessment(assessment);
    setLoading(true);
    setActiveTab('ENTRY');
    try {
      const res = await api.get(`/assessments/${assessment._id}`);
      if (res.success && res.data) {
        const studentList = res.data.students || [];
        setStudentsWithMarks(studentList);

        const initial: { [id: string]: string } = {};
        studentList.forEach((s: any) => {
          initial[s.studentId] = s.marksObtained !== null ? String(s.marksObtained) : '';
        });
        setMarksState(initial);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMarks = async (submitForApproval: boolean) => {
    if (!selectedAssessment) return;

    // Validate marks client side before submission
    const marksPayload: any[] = [];
    for (const st of studentsWithMarks) {
      const rawVal = marksState[st.studentId];
      if (rawVal !== '' && rawVal !== undefined) {
        const num = parseFloat(rawVal);
        if (isNaN(num) || num < 0) {
          Alert.alert('Validation Error', `Marks for ${st.fullName} cannot be negative.`);
          return;
        }
        if (num > selectedAssessment.maxMarks) {
          Alert.alert(
            'Mark Exceeds Maximum',
            `Marks for ${st.fullName} (${num}) exceeds maximum allowed (${selectedAssessment.maxMarks}).`
          );
          return;
        }
        marksPayload.push({
          studentId: st.studentId,
          marksObtained: num,
          isAbsent: false,
        });
      }
    }

    setSaving(true);
    try {
      const res = await api.post(`/assessments/${selectedAssessment._id}/marks`, {
        marks: marksPayload,
        submitForApproval,
      });

      if (res.success) {
        Alert.alert(
          'Success',
          submitForApproval
            ? 'Marks submitted for Administrative / HOD approval.'
            : 'Marks draft saved successfully.'
        );
        fetchAssessments();
        setActiveTab('LIST');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAssessment = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Required', 'Please enter assessment title');
      return;
    }

    const assignedClass = profile?.assignedClasses?.[0];
    if (!assignedClass) {
      Alert.alert('Error', 'No assigned class found');
      return;
    }

    setCreating(true);
    try {
      const deptId = assignedClass.departmentId._id || assignedClass.departmentId;
      const subId = assignedClass.subjectId._id || assignedClass.subjectId;

      const res = await api.post('/assessments', {
        title: newTitle.trim(),
        category: newCategory,
        academicYear: '2023-2026',
        semester: assignedClass.semester,
        departmentId: deptId,
        subjectId: subId,
        maxMarks: Number(newMaxMarks) || 25,
        passingMarks: Math.round((Number(newMaxMarks) || 25) * 0.4),
        assessmentDate: new Date().toISOString(),
        entryDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (res.success) {
        Alert.alert('Created', 'Assessment configured successfully');
        setNewTitle('');
        fetchAssessments();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Assessment Marks Register"
        subtitle="Internal, Seminar & Assignment Marks"
        showBack
        onBack={() => {
          if (activeTab === 'ENTRY') setActiveTab('LIST');
          else navigation.goBack();
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'LIST' ? (
          <>
            {/* Create Assessment Form */}
            <Card style={styles.createCard} elevated>
              <Text style={styles.cardTitle}>Configure New Assessment</Text>
              <Input
                label="Assessment Title"
                placeholder="e.g. CIA 2 Test or Seminar Assessment"
                value={newTitle}
                onChangeText={setNewTitle}
              />
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Category:</Text>
                  <TouchableOpacity
                    style={styles.categoryChip}
                    onPress={() =>
                      setNewCategory(
                        newCategory === 'INTERNAL_TEST'
                          ? 'ASSIGNMENT'
                          : newCategory === 'ASSIGNMENT'
                          ? 'SEMINAR'
                          : 'INTERNAL_TEST'
                      )
                    }
                  >
                    <Text style={styles.categoryChipText}>{newCategory.replace('_', ' ')} (Tap to switch)</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ width: 100 }}>
                  <Input
                    label="Max Marks"
                    value={newMaxMarks}
                    onChangeText={setNewMaxMarks}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Button
                title="Create Assessment"
                onPress={handleCreateAssessment}
                loading={creating}
                style={{ marginTop: 8 }}
              />
            </Card>

            <Text style={styles.sectionTitle}>Assessments & Marks Entry</Text>
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 20 }} />
            ) : assessments.length === 0 ? (
              <Card>
                <Text style={styles.emptyText}>No assessments configured yet.</Text>
              </Card>
            ) : (
              assessments.map((a) => (
                <Card key={a._id} style={styles.assessmentItem}>
                  <View style={styles.assessmentRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aTitle}>{a.title}</Text>
                      <Text style={styles.aMeta}>
                        {a.subjectId?.title} • Max Marks: {a.maxMarks}
                      </Text>
                    </View>
                    <Badge label={a.status} type={a.status === 'PUBLISHED' ? 'success' : a.status === 'APPROVED' ? 'info' : 'warning'} />
                  </View>

                  <Button
                    title="Enter / Review Marks ›"
                    onPress={() => openAssessmentMarks(a)}
                    variant="outline"
                    style={{ marginTop: 8, height: 38 }}
                  />
                </Card>
              ))
            )}
          </>
        ) : (
          /* Marks Entry Tab */
          <>
            <Card style={styles.entryBannerCard}>
              <View style={styles.bannerHeader}>
                <Text style={styles.bannerTitle}>{selectedAssessment?.title}</Text>
                <Badge label={selectedAssessment?.status} type="info" />
              </View>
              <Text style={styles.bannerSub}>
                Subject: {selectedAssessment?.subjectId?.title} • Maximum Mark: {selectedAssessment?.maxMarks}
              </Text>
            </Card>

            <Text style={styles.sectionTitle}>Student Marks Entry</Text>
            {studentsWithMarks.map((s) => (
              <Card key={s.studentId} style={styles.studentMarkCard}>
                <View style={styles.studentMarkRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sName}>{s.fullName}</Text>
                    <Text style={styles.sReg}>{s.registerNo}</Text>
                  </View>

                  <View style={styles.markInputWrap}>
                    <Input
                      label="Marks"
                      placeholder={`Max ${selectedAssessment?.maxMarks}`}
                      value={marksState[s.studentId] || ''}
                      onChangeText={(val) =>
                        setMarksState((prev) => ({ ...prev, [s.studentId]: val }))
                      }
                      keyboardType="numeric"
                      style={styles.markInputField}
                    />
                  </View>
                </View>
              </Card>
            ))}

            <View style={styles.actionBtnRow}>
              <Button
                title="Save Draft"
                onPress={() => handleSaveMarks(false)}
                variant="outline"
                loading={saving}
                style={{ flex: 1, marginRight: 6 }}
              />
              <Button
                title="Submit for Approval"
                onPress={() => handleSaveMarks(true)}
                loading={saving}
                style={{ flex: 1, marginLeft: 6 }}
              />
            </View>
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
    paddingBottom: 30,
  },
  createCard: {
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  categoryChip: {
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.inputBg,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 10,
  },
  assessmentItem: {
    padding: 14,
    marginVertical: 4,
  },
  assessmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  aTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  aMeta: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  entryBannerCard: {
    padding: 14,
    backgroundColor: theme.colors.tint,
    borderColor: theme.colors.primary,
    marginBottom: 14,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  bannerSub: {
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 4,
  },
  studentMarkCard: {
    padding: 10,
    marginVertical: 3,
  },
  studentMarkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sReg: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  markInputWrap: {
    width: 90,
  },
  markInputField: {
    textAlign: 'center',
  },
  actionBtnRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
