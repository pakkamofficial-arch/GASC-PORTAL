import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header, Card, Badge, Button, Input, SectionHeader, EmptyState } from '../../components';
import { api } from '../../services/api';

export const StudentAssignmentsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (assignmentId: string) => {
    if (!submissionText.trim()) {
      Alert.alert('Response Required', 'Please enter your assignment response or solution text.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/assignments/${assignmentId}/submit`, {
        textContent: submissionText.trim(),
      });

      if (res.success) {
        Alert.alert('Assignment Submitted', 'Your submission has been recorded and submitted to faculty for evaluation.');
        setSubmissionText('');
        setSelectedAssignment(null);
        fetchAssignments();
      }
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Class Assignments"
        subtitle="Coursework, Tasks & Continuous Assessments"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SectionHeader
          title="Assigned Coursework"
          subtitle="Assignments issued by subject faculty"
          icon="clipboard-outline"
        />

        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 24 }} />
        ) : assignments.length === 0 ? (
          <EmptyState
            icon="clipboard-outline"
            title="No Pending Assignments"
            description="You have no active coursework assignments due at this time."
          />
        ) : (
          assignments.map((item, idx) => {
            const isDuePassed = new Date(item.dueDate) < new Date();
            const mySubmission = item.submissions && item.submissions.length > 0 ? item.submissions[0] : null;
            const isSubmitted = Boolean(mySubmission);
            const isEvaluated = mySubmission?.status === 'EVALUATED';
            const isExpanded = selectedAssignment?._id === item._id;

            return (
              <Card key={item._id || idx} style={styles.assignmentCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.assignmentTitle}>{item.title}</Text>
                    <Text style={styles.subMeta}>
                      Subject: {item.subjectId?.title || 'Subject'} ({item.subjectId?.code || 'CS'})
                    </Text>
                    <Text style={styles.facultyMeta}>
                      Faculty: {item.facultyId?.fullName || 'Assigned Instructor'}
                    </Text>
                  </View>
                  <Badge
                    label={
                      isEvaluated
                        ? 'EVALUATED'
                        : isSubmitted
                        ? 'SUBMITTED'
                        : isDuePassed
                        ? 'OVERDUE'
                        : 'PENDING'
                    }
                    type={isEvaluated || isSubmitted ? 'success' : isDuePassed ? 'error' : 'warning'}
                  />
                </View>

                <Text style={styles.description}>{item.description}</Text>

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={13} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.detailText}>
                      Due: {new Date(item.dueDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="ribbon-outline" size={13} color={theme.colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.detailText}>Max Marks: {item.maxMarks}</Text>
                  </View>
                </View>

                {/* Evaluated Marks Banner */}
                {isEvaluated && (
                  <View style={styles.evaluatedBox}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} style={{ marginRight: 6 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.evaluatedScore}>
                        Marks Awarded: {mySubmission.marksAwarded} / {item.maxMarks}
                      </Text>
                      {mySubmission.feedback ? (
                        <Text style={styles.evaluatedFeedback}>
                          Faculty Feedback: {mySubmission.feedback}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )}

                {/* Submission Form Toggle */}
                {!isSubmitted && (
                  <View style={{ marginTop: 10 }}>
                    {isExpanded ? (
                      <View style={styles.submissionBox}>
                        <Input
                          label="Your Solution / Response Text"
                          placeholder="Type your assignment answers or research summary..."
                          value={submissionText}
                          onChangeText={setSubmissionText}
                          multiline
                          numberOfLines={4}
                        />
                        <View style={styles.actionBtnRow}>
                          <Button
                            title="Submit Response"
                            onPress={() => handleSubmit(item._id)}
                            loading={submitting}
                            icon={<Ionicons name="send-outline" size={16} color="#FFFFFF" />}
                            style={{ flex: 1, marginRight: 6 }}
                          />
                          <Button
                            title="Cancel"
                            onPress={() => setSelectedAssignment(null)}
                            variant="outline"
                            style={{ width: 80 }}
                          />
                        </View>
                      </View>
                    ) : (
                      <Button
                        title="Submit Assignment"
                        onPress={() => {
                          setSelectedAssignment(item);
                          setSubmissionText('');
                        }}
                        variant="primary"
                        size="sm"
                        icon={<Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />}
                      />
                    )}
                  </View>
                )}
              </Card>
            );
          })
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
  assignmentCard: {
    padding: 16,
    marginVertical: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingBottom: 8,
    marginBottom: 8,
  },
  assignmentTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
  },
  subMeta: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  facultyMeta: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 11,
    color: theme.colors.primary,
    marginTop: 1,
  },
  description: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
    lineHeight: 18,
    marginVertical: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 8,
    borderRadius: theme.borderRadius.sm,
    marginVertical: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  evaluatedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.successBg,
    padding: 10,
    borderRadius: theme.borderRadius.sm,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  evaluatedScore: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 12,
    color: theme.colors.success,
  },
  evaluatedFeedback: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.text,
    marginTop: 2,
  },
  submissionBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
});
