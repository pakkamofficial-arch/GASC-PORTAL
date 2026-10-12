import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header, Card, Badge, SectionHeader, EmptyState } from '../../components';
import { api } from '../../services/api';

export const StudentMarksScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMarks = async () => {
    try {
      const res = await api.get('/students/marks');
      if (res.success && res.data) {
        setResults(res.data.results || []);
      }
    } catch (err) {
      console.log('Error fetching marks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMarks();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMarks();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Examinations & Marks"
        subtitle="Published Continuous Internal Assessment (CIA)"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* University Regulation Banner */}
        <Card style={styles.infoCard} variant="outlined">
          <View style={styles.infoHeaderRow}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.infoTitle}>Evaluation & Passing Regulations</Text>
          </View>
          <Text style={styles.infoText}>
            Continuous Internal Assessment (CIA) carries 25 Marks (Tests, Seminars & Assignments). University Semester Theory Examination carries 75 Marks. Minimum passing mark is 40% in theory and aggregate.
          </Text>
        </Card>

        <SectionHeader
          title="Published Assessment Ledger"
          subtitle="Officially approved marks by Head of Department"
          icon="ribbon-outline"
        />

        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 24 }} />
        ) : results.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No Results Published Yet"
            description="Continuous internal assessment results will appear here once officially submitted by faculty and approved by the Principal's office."
          />
        ) : (
          results.map((item, idx) => (
            <Card key={item.assessmentId || idx} style={styles.markCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.subjectTitle}>{item.subject?.title || 'Subject'}</Text>
                  <Text style={styles.subCode}>
                    Code: {item.subject?.code} • {item.title}
                  </Text>
                </View>
                <Badge
                  label={item.passed ? 'PASSED' : 'RE-APPEAR'}
                  type={item.passed ? 'success' : 'error'}
                />
              </View>

              <View style={styles.scoreRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Marks Obtained</Text>
                  <Text style={styles.statValue}>
                    {item.isAbsent ? 'Absent' : item.marksObtained}
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Maximum Marks</Text>
                  <Text style={styles.statValue}>{item.maxMarks}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Grade</Text>
                  <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                    {item.grade || '—'}
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Category</Text>
                  <Text style={styles.statCategory}>
                    {item.category?.replace(/_/g, ' ') || 'CIA'}
                  </Text>
                </View>
              </View>
            </Card>
          ))
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
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: '#FAFCFA',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    marginBottom: 6,
    padding: 14,
  },
  infoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
  },
  infoText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  markCard: {
    padding: 14,
    marginVertical: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingBottom: 8,
  },
  subjectTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
  },
  subCode: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 3,
  },
  statValue: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
  },
  statCategory: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});
