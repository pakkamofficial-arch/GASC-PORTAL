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
import { Header, Card, Badge, Button, SectionHeader, EmptyState } from '../../components';
import { api } from '../../services/api';

export const StudentQuizzesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active quiz attempt state
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [activeAttemptData, setActiveAttemptData] = useState<any | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [qIdx: number]: number }>({});
  const [submittingAttempt, setSubmittingAttempt] = useState(false);
  const [attemptResult, setAttemptResult] = useState<any | null>(null);

  const fetchQuizzes = async () => {
    try {
      const res = await api.get('/quizzes');
      if (res.success && res.data) {
        setQuizzes(res.data.quizzes || []);
      }
    } catch (err) {
      console.log('Error fetching quizzes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQuizzes();
  };

  const startQuiz = async (quiz: any) => {
    setLoading(true);
    try {
      const res = await api.get(`/quizzes/${quiz._id}/attempt`);
      if (res.success && res.data) {
        setActiveQuiz(quiz);
        setActiveAttemptData(res.data.quiz);
        setSelectedAnswers({});
        setAttemptResult(null);
      }
    } catch (err: any) {
      Alert.alert('Quiz Notice', err.message || 'Unable to start quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const submitQuiz = async () => {
    if (!activeQuiz || !activeAttemptData) return;

    const questions = activeAttemptData.questions || [];
    const answersArray: number[] = [];

    for (let i = 0; i < questions.length; i++) {
      if (selectedAnswers[i] === undefined) {
        Alert.alert('Incomplete Test', `Please answer Question ${i + 1} before submitting.`);
        return;
      }
      answersArray.push(selectedAnswers[i]);
    }

    setSubmittingAttempt(true);
    try {
      const res = await api.post(`/quizzes/${activeQuiz._id}/submit`, {
        selectedAnswers: answersArray,
      });

      if (res.success && res.data) {
        setAttemptResult(res.data);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit quiz attempt');
    } finally {
      setSubmittingAttempt(false);
    }
  };

  const exitQuiz = () => {
    setActiveQuiz(null);
    setActiveAttemptData(null);
    setSelectedAnswers({});
    setAttemptResult(null);
    fetchQuizzes();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={activeQuiz ? activeQuiz.title : 'Subject Quizzes'}
        subtitle={activeQuiz ? 'Active Timed Assessment' : 'Interactive Knowledge Testing'}
        showBack
        onBack={activeQuiz ? exitQuiz : () => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={!activeQuiz ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      >
        {/* Active Quiz Test Taking View */}
        {activeAttemptData ? (
          <View>
            {attemptResult ? (
              // Quiz Completed Result Scorecard
              <Card style={styles.scoreCard}>
                <View style={styles.scoreHeader}>
                  <Ionicons name="trophy" size={36} color={theme.colors.primary} />
                  <Text style={styles.scoreTitle}>Quiz Completed!</Text>
                  <Text style={styles.scorePercent}>{attemptResult.attempt?.percentage}%</Text>
                  <Text style={styles.scoreDetails}>
                    Score: {attemptResult.attempt?.score} out of {attemptResult.attempt?.totalQuestions} Correct
                  </Text>
                  <Badge
                    label={attemptResult.attempt?.percentage >= 50 ? 'PASSED' : 'REVISION RECOMMENDED'}
                    type={attemptResult.attempt?.percentage >= 50 ? 'success' : 'warning'}
                  />
                </View>

                {/* Question Review & Explanations */}
                <SectionHeader title="Question Review & Key" />
                {attemptResult.review?.map((rev: any, rIdx: number) => (
                  <View key={rIdx} style={styles.reviewItem}>
                    <View style={styles.reviewQuestionRow}>
                      <Ionicons
                        name={rev.isCorrect ? 'checkmark-circle' : 'close-circle'}
                        size={18}
                        color={rev.isCorrect ? theme.colors.success : theme.colors.error}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.reviewQuestionText}>
                        Q{rIdx + 1}. {rev.questionText}
                      </Text>
                    </View>
                    <Text style={styles.reviewAnswer}>
                      Your Choice: {rev.options[rev.selectedOption]}
                    </Text>
                    {!rev.isCorrect && (
                      <Text style={styles.reviewCorrect}>
                        Correct Answer: {rev.options[rev.correctOptionIndex]}
                      </Text>
                    )}
                    {rev.explanation ? (
                      <Text style={styles.reviewExpl}>Note: {rev.explanation}</Text>
                    ) : null}
                  </View>
                ))}

                <Button
                  title="Back to All Quizzes"
                  onPress={exitQuiz}
                  variant="primary"
                  style={{ marginTop: 16 }}
                />
              </Card>
            ) : (
              // Active Questions Form
              <View>
                <Card style={styles.quizMetaCard}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      Total Questions: {activeAttemptData.questions?.length || 0}
                    </Text>
                    <Text style={styles.metaText}>
                      Duration: {activeAttemptData.timeLimitMinutes || 15} Mins
                    </Text>
                  </View>
                </Card>

                {activeAttemptData.questions?.map((q: any, qIdx: number) => (
                  <Card key={qIdx} style={styles.questionCard}>
                    <Text style={styles.qText}>
                      Q{qIdx + 1}. {q.questionText}
                    </Text>
                    {q.options?.map((opt: string, oIdx: number) => {
                      const isChosen = selectedAnswers[qIdx] === oIdx;
                      return (
                        <TouchableOpacity
                          key={oIdx}
                          style={[styles.optRow, isChosen && styles.optRowChosen]}
                          onPress={() => handleSelectOption(qIdx, oIdx)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: isChosen }}
                        >
                          <Ionicons
                            name={isChosen ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={isChosen ? theme.colors.primary : theme.colors.textSecondary}
                            style={{ marginRight: 8 }}
                          />
                          <Text style={[styles.optText, isChosen && styles.optTextChosen]}>
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </Card>
                ))}

                <Button
                  title="Submit Practice Test"
                  onPress={submitQuiz}
                  loading={submittingAttempt}
                  icon={<Ionicons name="checkmark-done-outline" size={18} color="#FFFFFF" />}
                  style={{ marginTop: 12, marginBottom: 20 }}
                />
              </View>
            )}
          </View>
        ) : (
          // Quiz Directory View
          <View>
            <SectionHeader
              title="Available Practice Quizzes"
              subtitle="Multiple choice tests configured for your subjects"
              icon="school-outline"
            />

            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 24 }} />
            ) : quizzes.length === 0 ? (
              <EmptyState
                icon="school-outline"
                title="No Quizzes Active"
                description="Subject faculty will configure interactive quizzes for continuous revision."
              />
            ) : (
              quizzes.map((q, idx) => (
                <Card key={q._id || idx} style={styles.quizCard}>
                  <View style={styles.quizHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.quizTitle}>{q.title}</Text>
                      <Text style={styles.quizSub}>
                        {q.subjectId?.title || 'Subject'} • Sem {q.semester}
                      </Text>
                    </View>
                    <Badge label={q.isAIGenerated ? 'AI GENERATED' : 'FACULTY'} type="info" />
                  </View>

                  {q.description ? (
                    <Text style={styles.quizDesc}>{q.description}</Text>
                  ) : null}

                  <View style={styles.quizStats}>
                    <Text style={styles.qStatItem}>
                      Questions: {q.questionsCount || (q.questions ? q.questions.length : 5)}
                    </Text>
                    <Text style={styles.qStatItem}>
                      Time: {q.timeLimitMinutes || 15} Mins
                    </Text>
                  </View>

                  <Button
                    title="Start Timed Quiz"
                    onPress={() => startQuiz(q)}
                    variant="primary"
                    size="sm"
                    icon={<Ionicons name="play-outline" size={15} color="#FFFFFF" />}
                    style={{ marginTop: 10 }}
                  />
                </Card>
              ))
            )}
          </View>
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
  quizCard: {
    padding: 16,
    marginVertical: 4,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  quizTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
  },
  quizSub: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  quizDesc: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
    marginVertical: 6,
    lineHeight: 18,
  },
  quizStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 8,
    borderRadius: theme.borderRadius.sm,
    marginTop: 6,
  },
  qStatItem: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  quizMetaCard: {
    padding: 12,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: 12,
    color: theme.colors.primary,
  },
  questionCard: {
    padding: 14,
    marginVertical: 4,
  },
  qText: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginBottom: 10,
    lineHeight: 20,
  },
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    marginVertical: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optRowChosen: {
    backgroundColor: theme.colors.tint,
    borderColor: '#C8E6C9',
  },
  optText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 13,
    color: theme.colors.text,
    flex: 1,
  },
  optTextChosen: {
    fontFamily: theme.typography.fonts.semibold,
    color: theme.colors.primary,
  },
  scoreCard: {
    padding: 20,
    marginVertical: 6,
  },
  scoreHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingBottom: 16,
    marginBottom: 12,
  },
  scoreTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 18,
    color: theme.colors.text,
    marginTop: 8,
  },
  scorePercent: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 36,
    color: theme.colors.primary,
    marginVertical: 4,
  },
  scoreDetails: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  reviewItem: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 12,
    borderRadius: theme.borderRadius.sm,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reviewQuestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  reviewQuestionText: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 12,
    color: theme.colors.text,
    flex: 1,
  },
  reviewAnswer: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  reviewCorrect: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: 11,
    color: theme.colors.success,
    marginTop: 2,
  },
  reviewExpl: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 3,
    fontStyle: 'italic',
  },
});
