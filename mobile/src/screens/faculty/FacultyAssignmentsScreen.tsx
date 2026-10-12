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
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const FacultyAssignmentsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create Assignment State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClassIdx, setSelectedClassIdx] = useState(0);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [maxMarks, setMaxMarks] = useState('10');
  const [creating, setCreating] = useState(false);

  // Submissions Modal State
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [evaluatingSubmission, setEvaluatingSubmission] = useState<any>(null);
  const [marksAwarded, setMarksAwarded] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submittingGrade, setSubmittingGrade] = useState(false);

  const assignedClasses = profile?.assignedClasses || [];
  const currentAssignedClass = assignedClasses[selectedClassIdx];

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/assignments');
      if (res.success && res.data) {
        setAssignments(res.data.assignments || []);
      }
    } catch (err) {
      console.log('Error fetching assignments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignments();
  };

  const handleCreateAssignment = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Please enter assignment title.');
      return;
    }
    if (!currentAssignedClass) {
      Alert.alert('Error', 'No subject/class allocated.');
      return;
    }
    const marksNum = Number(maxMarks);
    if (isNaN(marksNum) || marksNum <= 0) {
      Alert.alert('Validation', 'Maximum marks must be a positive number.');
      return;
    }

    setCreating(true);
    try {
      const deptId = currentAssignedClass.departmentId._id || currentAssignedClass.departmentId;
      const subId = currentAssignedClass.subjectId._id || currentAssignedClass.subjectId;

      const payload = {
        title: title.trim(),
        description: description.trim(),
        departmentId: deptId,
        semester: Number(currentAssignedClass.semester),
        subjectId: subId,
        section: currentAssignedClass.section || 'A',
        dueDate: new Date(dueDate).toISOString(),
        maxMarks: marksNum,
      };

      const res = await api.post('/assignments', payload);
      if (res.success) {
        Alert.alert('Success', 'Assignment coursework published successfully.');
        setTitle('');
        setDescription('');
        setActiveTab('LIST');
        fetchAssignments();
      } else {
        Alert.alert('Failed', res.message || 'Could not publish assignment.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create assignment.');
    } finally {
      setCreating(false);
    }
  };

  const openSubmissions = async (assignment: any) => {
    setSelectedAssignment(assignment);
    setLoadingSubmissions(true);
    setSubmissions([]);
    try {
      const res = await api.get(`/assignments/${assignment._id}/submissions`);
      if (res.success && res.data) {
        setSubmissions(res.data.submissions || []);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load student submissions.');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleGradeSubmission = async () => {
    if (!evaluatingSubmission) return;
    const marks = Number(marksAwarded);
    if (isNaN(marks) || marks < 0 || marks > (selectedAssignment?.maxMarks || 100)) {
      Alert.alert('Validation', `Marks must be between 0 and ${selectedAssignment?.maxMarks || 100}.`);
      return;
    }

    setSubmittingGrade(true);
    try {
      const res = await api.post(`/assignments/submissions/${evaluatingSubmission._id}/grade`, {
        marksAwarded: marks,
        feedback: feedback.trim(),
      });

      if (res.success) {
        Alert.alert('Success', 'Submission graded and feedback saved.');
        setEvaluatingSubmission(null);
        setMarksAwarded('');
        setFeedback('');
        // Refresh submissions
        if (selectedAssignment) {
          openSubmissions(selectedAssignment);
        }
      } else {
        Alert.alert('Error', res.message || 'Could not evaluate submission.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to evaluate submission.');
    } finally {
      setSubmittingGrade(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Coursework Assignments"
        subtitle="Government Arts & Science College, Kuthalam"
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* Segmented Tab Selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'LIST' && styles.tabItemActive]}
          onPress={() => setActiveTab('LIST')}
        >
          <Ionicons
            name="list-outline"
            size={16}
            color={activeTab === 'LIST' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'LIST' && styles.tabTextActive]}>
            Active Tasks ({assignments.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'CREATE' && styles.tabItemActive]}
          onPress={() => setActiveTab('CREATE')}
        >
          <Ionicons
            name="add-circle-outline"
            size={16}
            color={activeTab === 'CREATE' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'CREATE' && styles.tabTextActive]}>
            New Assignment
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {activeTab === 'LIST' ? (
          loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading assigned coursework...</Text>
            </View>
          ) : assignments.length === 0 ? (
            <EmptyState
              title="No Coursework Published"
              message="Create coursework assignments with deadlines and maximum marks for your classes."
              icon="document-text-outline"
              actionLabel="Create Assignment"
              onAction={() => setActiveTab('CREATE')}
            />
          ) : (
            assignments.map((item: any) => {
              const due = new Date(item.dueDate);
              const isPast = due < new Date();
              return (
                <Card key={item._id} style={styles.assignmentCard} variant="outlined">
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.assignmentTitle}>{item.title}</Text>
                      <Text style={styles.subjectMeta}>
                        {item.subjectId?.title || 'Subject'} • Sem {item.semester} ({item.section || 'A'})
                      </Text>
                    </View>
                    <Badge label={isPast ? 'CLOSED' : 'OPEN'} type={isPast ? 'error' : 'success'} />
                  </View>

                  {item.description ? (
                    <Text style={styles.descriptionText} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}

                  <View style={styles.metaRow}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>Due Date</Text>
                      <Text style={styles.metaValue}>
                        {due.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>Max Marks</Text>
                      <Text style={styles.metaValue}>{item.maxMarks} pts</Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>Academic Term</Text>
                      <Text style={styles.metaValue}>2024-2025</Text>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <Button
                      title="Review Submissions"
                      variant="primary"
                      size="small"
                      icon="people-outline"
                      onPress={() => openSubmissions(item)}
                    />
                  </View>
                </Card>
              );
            })
          )
        ) : (
          /* CREATE TAB */
          <Card style={styles.formCard} variant="outlined">
            <Text style={styles.formTitle}>Publish New Assignment</Text>
            <Text style={styles.formSubtitle}>
              Coursework will be visible to all enrolled students in the selected class.
            </Text>

            {/* Class Selector */}
            <Text style={styles.fieldLabel}>Select Teaching Allocation *</Text>
            {assignedClasses.length === 0 ? (
              <Text style={styles.warningText}>No classes assigned to your faculty profile.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classScroll}>
                {assignedClasses.map((ac: any, idx: number) => {
                  const isSelected = selectedClassIdx === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.classChip, isSelected && styles.classChipSelected]}
                      onPress={() => setSelectedClassIdx(idx)}
                    >
                      <Text style={[styles.classChipTitle, isSelected && styles.classChipTitleSelected]}>
                        {ac.subjectId?.title || 'Subject'}
                      </Text>
                      <Text style={[styles.classChipSub, isSelected && styles.classChipSubSelected]}>
                        Sem {ac.semester} ({ac.section}) • {ac.departmentId?.code}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <Input
              label="Assignment Title *"
              placeholder="e.g. Unit 2 Case Study Analysis"
              value={title}
              onChangeText={setTitle}
            />

            <Input
              label="Instructions & Description"
              placeholder="Detail assignment guidelines, submission requirements, and references..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <View style={styles.rowInputs}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Input
                  label="Due Date (YYYY-MM-DD) *"
                  placeholder="2024-11-30"
                  value={dueDate}
                  onChangeText={setDueDate}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Input
                  label="Max Marks *"
                  placeholder="10"
                  value={maxMarks}
                  onChangeText={setMaxMarks}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Button
              title="Publish Coursework"
              variant="primary"
              loading={creating}
              onPress={handleCreateAssignment}
              style={{ marginTop: 12 }}
            />
          </Card>
        )}
      </ScrollView>

      {/* SUBMISSIONS MODAL */}
      <Modal
        visible={!!selectedAssignment}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedAssignment(null)}
      >
        <SafeAreaView style={styles.container}>
          <Header
            title="Student Submissions"
            subtitle={selectedAssignment?.title || 'Assignment'}
            showBack
            onBack={() => {
              setSelectedAssignment(null);
              setEvaluatingSubmission(null);
            }}
          />

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {loadingSubmissions ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Fetching student submissions...</Text>
              </View>
            ) : submissions.length === 0 ? (
              <EmptyState
                title="No Submissions Yet"
                message="Enrolled students have not submitted solutions for this coursework task yet."
                icon="document-outline"
              />
            ) : (
              submissions.map((sub: any) => {
                const student = sub.studentId;
                const isEvaluated = sub.status === 'EVALUATED';
                return (
                  <Card key={sub._id} style={styles.submissionCard} variant="outlined">
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentName}>{student?.fullName || 'Student'}</Text>
                        <Text style={styles.studentMeta}>
                          Reg: {student?.registerNumber || 'N/A'} • Roll: {student?.rollNumber || 'N/A'}
                        </Text>
                      </View>
                      <Badge
                        label={sub.status}
                        type={isEvaluated ? 'success' : sub.status === 'LATE' ? 'warning' : 'info'}
                      />
                    </View>

                    {sub.textContent ? (
                      <View style={styles.solutionBox}>
                        <Text style={styles.solutionLabel}>Submitted Solution:</Text>
                        <Text style={styles.solutionText}>{sub.textContent}</Text>
                      </View>
                    ) : null}

                    <View style={styles.submissionScoreRow}>
                      <Text style={styles.submittedDate}>
                        Submitted: {new Date(sub.submissionDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </Text>
                      {isEvaluated && (
                        <Text style={styles.evaluatedMarks}>
                          Marks: {sub.marksAwarded} / {selectedAssignment?.maxMarks}
                        </Text>
                      )}
                    </View>

                    {sub.feedback ? (
                      <Text style={styles.feedbackText}>Remark: "{sub.feedback}"</Text>
                    ) : null}

                    <Button
                      title={isEvaluated ? 'Update Evaluation' : 'Grade Submission'}
                      variant={isEvaluated ? 'outline' : 'primary'}
                      size="small"
                      icon="create-outline"
                      onPress={() => {
                        setEvaluatingSubmission(sub);
                        setMarksAwarded(sub.marksAwarded !== undefined ? String(sub.marksAwarded) : '');
                        setFeedback(sub.feedback || '');
                      }}
                      style={{ marginTop: 8 }}
                    />
                  </Card>
                );
              })
            )}

            {/* Inline Grading Drawer/Card */}
            {evaluatingSubmission && (
              <Card style={styles.gradingCard} variant="elevated">
                <View style={styles.gradingHeader}>
                  <Text style={styles.gradingTitle}>
                    Evaluating: {evaluatingSubmission.studentId?.fullName}
                  </Text>
                  <TouchableOpacity onPress={() => setEvaluatingSubmission(null)}>
                    <Ionicons name="close-circle" size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Input
                  label={`Marks Awarded (Max ${selectedAssignment?.maxMarks}) *`}
                  placeholder="e.g. 9"
                  value={marksAwarded}
                  onChangeText={setMarksAwarded}
                  keyboardType="numeric"
                />

                <Input
                  label="Faculty Feedback & Assessment Remarks"
                  placeholder="e.g. Well articulated methodology, accurate problem solving."
                  value={feedback}
                  onChangeText={setFeedback}
                  multiline
                  numberOfLines={2}
                />

                <View style={styles.gradeBtnRow}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setEvaluatingSubmission(null)}
                    style={{ flex: 1, marginRight: 6 }}
                  />
                  <Button
                    title="Save Marks"
                    variant="primary"
                    loading={submittingGrade}
                    onPress={handleGradeSubmission}
                    style={{ flex: 1, marginLeft: 6 }}
                  />
                </View>
              </Card>
            )}
          </ScrollView>
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
  },
  assignmentCard: {
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  assignmentTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  subjectMeta: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  descriptionText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18,
    marginVertical: 6,
  },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.tint,
    borderRadius: theme.borderRadius.sm,
    padding: 8,
    marginVertical: 8,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  metaValue: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 2,
  },
  cardActions: {
    marginTop: 6,
  },
  formCard: {
    padding: 14,
  },
  formTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 2,
  },
  formSubtitle: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  fieldLabel: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 6,
  },
  classScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  classChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  classChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.tint,
  },
  classChipTitle: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.text,
  },
  classChipTitleSelected: {
    color: theme.colors.primary,
    fontFamily: theme.typography.families.primaryBold,
  },
  classChipSub: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  classChipSubSelected: {
    color: theme.colors.primary,
  },
  warningText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.warning,
    marginBottom: 10,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  submissionCard: {
    padding: 14,
    marginBottom: 10,
  },
  studentName: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  studentMeta: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  solutionBox: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: 8,
  },
  solutionLabel: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  solutionText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  submissionScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  submittedDate: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  evaluatedMarks: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 13,
    color: theme.colors.primary,
  },
  feedbackText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  gradingCard: {
    padding: 14,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  gradingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  gradingTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  gradeBtnRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
});
