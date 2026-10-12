import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header, Card, Button, Input, Badge, SectionHeader } from '../../components';
import { api } from '../../services/api';

type Tab = 'ASSISTANT' | 'NOTES' | 'QUIZ' | 'CAREER';

export const AIStudyCentreScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<Tab>('ASSISTANT');
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState<'BILATERAL' | 'ENGLISH' | 'TAMIL'>('BILATERAL');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Assistant Query
  const handleAskAssistant = async () => {
    if (!query.trim()) {
      Alert.alert('Please enter a question', 'Type any syllabus topic or academic concept you would like explained.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/ai/assistant', {
        prompt: query.trim(),
        language,
        level: 'EXAM_PREP',
      });

      if (res.success && res.data) {
        setResult(res.data);
      }
    } catch (err: any) {
      Alert.alert('Study Assistant', err.message || 'Unable to connect to AI study service');
    } finally {
      setLoading(false);
    }
  };

  // Notes Generator
  const handleGenerateNotes = async () => {
    if (!query.trim()) {
      Alert.alert('Enter Topic', 'Specify the syllabus topic to generate revision notes.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/ai/notes', {
        topic: query.trim(),
        subjectTitle: 'Computer Science & Allied Sciences',
      });

      if (res.success && res.data) {
        setResult(res.data);
      }
    } catch (err: any) {
      Alert.alert('Notes Generator', err.message || 'Unable to generate notes');
    } finally {
      setLoading(false);
    }
  };

  // Practice Quiz Generator
  const handleGenerateQuiz = async () => {
    if (!query.trim()) {
      Alert.alert('Enter Topic', 'Specify the topic to generate practice MCQs.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/ai/quiz', {
        topic: query.trim(),
      });

      if (res.success && res.data) {
        setResult(res.data);
      }
    } catch (err: any) {
      Alert.alert('Quiz Generator', err.message || 'Unable to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  // Career Guidance
  const handleCareerGuidance = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/ai/career', {
        degree: query.trim() || 'B.Sc Computer Science',
        interests: 'Public Service & Software Industry',
      });

      if (res.success && res.data) {
        setResult(res.data);
      }
    } catch (err: any) {
      Alert.alert('Career Assistant', err.message || 'Unable to fetch roadmap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="AI Study Centre"
        subtitle="Curated Academic Revision Companion"
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* Mode Selector Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ASSISTANT' && styles.tabActive]}
          onPress={() => {
            setActiveTab('ASSISTANT');
            setResult(null);
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'ASSISTANT' }}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={14}
            color={activeTab === 'ASSISTANT' ? theme.colors.primary : theme.colors.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, activeTab === 'ASSISTANT' && styles.tabTextActive]}>
            Assistant
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'NOTES' && styles.tabActive]}
          onPress={() => {
            setActiveTab('NOTES');
            setResult(null);
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'NOTES' }}
        >
          <Ionicons
            name="document-text-outline"
            size={14}
            color={activeTab === 'NOTES' ? theme.colors.primary : theme.colors.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, activeTab === 'NOTES' && styles.tabTextActive]}>
            Notes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'QUIZ' && styles.tabActive]}
          onPress={() => {
            setActiveTab('QUIZ');
            setResult(null);
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'QUIZ' }}
        >
          <Ionicons
            name="school-outline"
            size={14}
            color={activeTab === 'QUIZ' ? theme.colors.primary : theme.colors.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, activeTab === 'QUIZ' && styles.tabTextActive]}>
            Quiz Gen
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'CAREER' && styles.tabActive]}
          onPress={() => {
            setActiveTab('CAREER');
            setResult(null);
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'CAREER' }}
        >
          <Ionicons
            name="compass-outline"
            size={14}
            color={activeTab === 'CAREER' ? theme.colors.primary : theme.colors.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, activeTab === 'CAREER' && styles.tabTextActive]}>
            Career
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Institutional Safeguard Banner */}
        <View style={styles.disclaimerBox}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.disclaimerText}>
            AI Study Centre is designed strictly for revision and conceptual assistance. Generated explanations do not alter official college records or exam schedules.
          </Text>
        </View>

        {/* Tab-specific Controls */}
        {activeTab === 'ASSISTANT' && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Academic Concept Assistant</Text>
            <Text style={styles.sectionSubtitle}>
              Ask explanations with university examples in Tamil & English
            </Text>

            <View style={styles.langRow}>
              {(['BILATERAL', 'ENGLISH', 'TAMIL'] as const).map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.langChip, language === l && styles.langChipActive]}
                  onPress={() => setLanguage(l)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.langChipText, language === l && styles.langChipTextActive]}>
                    {l === 'BILATERAL' ? 'English + Tamil' : l === 'TAMIL' ? 'தமிழ்' : 'English'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Enter Concept / Topic"
              placeholder="e.g. Normalization in DBMS, Stack vs Queue, CPU Scheduling"
              value={query}
              onChangeText={setQuery}
              multiline
              numberOfLines={3}
            />

            <Button
              title="Explain Concept"
              onPress={handleAskAssistant}
              loading={loading}
              icon={<Ionicons name="sparkles-outline" size={16} color="#FFFFFF" />}
              style={{ marginTop: 8 }}
            />
          </Card>
        )}

        {activeTab === 'NOTES' && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>AI Revision Notes Generator</Text>
            <Text style={styles.sectionSubtitle}>
              Structured 2-mark definitions and 16-mark essay outlines
            </Text>

            <Input
              label="Subject Syllabus Topic"
              placeholder="e.g. Binary Search Trees, Relational Algebra, Software Testing"
              value={query}
              onChangeText={setQuery}
            />

            <Button
              title="Generate Revision Notes"
              onPress={handleGenerateNotes}
              loading={loading}
              icon={<Ionicons name="document-text-outline" size={16} color="#FFFFFF" />}
              style={{ marginTop: 8 }}
            />
          </Card>
        )}

        {activeTab === 'QUIZ' && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Practice MCQ Generator</Text>
            <Text style={styles.sectionSubtitle}>
              Generate interactive 5-question mock test with explanations
            </Text>

            <Input
              label="Quiz Subject / Topic"
              placeholder="e.g. Data Structures, SQL Queries, Operating System Deadlocks"
              value={query}
              onChangeText={setQuery}
            />

            <Button
              title="Generate Practice Test"
              onPress={handleGenerateQuiz}
              loading={loading}
              icon={<Ionicons name="school-outline" size={16} color="#FFFFFF" />}
              style={{ marginTop: 8 }}
            />
          </Card>
        )}

        {activeTab === 'CAREER' && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Tamil Nadu Collegiate Career Guide</Text>
            <Text style={styles.sectionSubtitle}>
              Placement roadmaps, TNPSC Group services, and IT career options
            </Text>

            <Input
              label="Degree / Major"
              placeholder="e.g. B.Sc Computer Science, B.Sc Mathematics, B.Com"
              value={query}
              onChangeText={setQuery}
            />

            <Button
              title="Generate Career Roadmap"
              onPress={handleCareerGuidance}
              loading={loading}
              icon={<Ionicons name="compass-outline" size={16} color="#FFFFFF" />}
              style={{ marginTop: 8 }}
            />
          </Card>
        )}

        {/* Results Display */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Synthesizing institutional study aid...</Text>
          </View>
        )}

        {result && (
          <Card style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="sparkles" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.resultTitle}>AI Generated Response</Text>
              </View>
              <Badge label={result.provider || 'STUDY ENGINE'} type="info" />
            </View>

            {result.explanation ? (
              <Text style={styles.bodyText}>{result.explanation}</Text>
            ) : null}

            {result.content ? (
              <Text style={styles.bodyText}>{result.content}</Text>
            ) : null}

            {result.roadmap ? (
              <Text style={styles.bodyText}>{result.roadmap}</Text>
            ) : null}

            {result.questions && Array.isArray(result.questions) ? (
              <View style={{ marginTop: 10 }}>
                {result.questions.map((q: any, qIdx: number) => (
                  <View key={qIdx} style={styles.questionBox}>
                    <Text style={styles.questionText}>
                      Q{qIdx + 1}. {q.question}
                    </Text>
                    {q.options?.map((opt: string, oIdx: number) => (
                      <View key={oIdx} style={styles.optionRow}>
                        <Text style={styles.optionLetter}>
                          {String.fromCharCode(65 + oIdx)}.
                        </Text>
                        <Text style={styles.optionText}>{opt}</Text>
                      </View>
                    ))}
                    {q.answer ? (
                      <View style={styles.answerBox}>
                        <Text style={styles.answerText}>Answer: {q.answer}</Text>
                        {q.explanation ? (
                          <Text style={styles.answerExpl}>Explanation: {q.explanation}</Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
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
    paddingVertical: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
  },
  tabActive: {
    backgroundColor: theme.colors.tint,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  tabText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    fontFamily: theme.typography.fonts.bold,
    color: theme.colors.primary,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: 36,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
  },
  disclaimerText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    flex: 1,
  },
  card: {
    padding: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
  },
  sectionSubtitle: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
    marginBottom: 10,
  },
  langRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  langChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginRight: 6,
  },
  langChipActive: {
    backgroundColor: theme.colors.tint,
    borderColor: theme.colors.primary,
  },
  langChipText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  langChipTextActive: {
    fontFamily: theme.typography.fonts.semibold,
    color: theme.colors.primary,
  },
  loadingBox: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  resultCard: {
    padding: 16,
    marginTop: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingBottom: 8,
    marginBottom: 10,
  },
  resultTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  bodyText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    lineHeight: 22,
  },
  questionBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 12,
    borderRadius: theme.borderRadius.sm,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  questionText: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 6,
  },
  optionRow: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  optionLetter: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 12,
    color: theme.colors.primary,
    marginRight: 6,
  },
  optionText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 12,
    color: theme.colors.text,
    flex: 1,
  },
  answerBox: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  answerText: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: 12,
    color: theme.colors.success,
  },
  answerExpl: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
