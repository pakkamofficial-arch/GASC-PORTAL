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
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { EmptyState } from '../../components/EmptyState';
import { MaterialsSkeleton } from '../../components/skeleton';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

type Priority = 'NORMAL' | 'HIGH' | 'URGENT';

export const NoticesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [submitting, setSubmitting] = useState(false);

  const fetchNotices = async () => {
    try {
      setError(null);
      const res = await api.get('/notices');
      if (res.success && res.data) {
        setNotices(res.data.notices || []);
      } else {
        setError(res.message || 'Unable to load college circulars.');
      }
    } catch (err: any) {
      console.log('Error fetching notices:', err);
      setError(err.message || 'Network error fetching college circulars.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotices();
  };

  const handlePostNotice = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Required Fields', 'Please enter title and content for the announcement.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/notices', {
        title: title.trim(),
        content: content.trim(),
        priority,
        targetRole: 'ALL',
      });

      if (res.success) {
        Alert.alert('Published', 'Institutional notice published successfully.');
        setTitle('');
        setContent('');
        setShowCreate(false);
        fetchNotices();
      } else {
        Alert.alert('Error', res.message || 'Failed to publish notice.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to publish notice.');
    } finally {
      setSubmitting(false);
    }
  };

  const isStaff = user?.role === 'ADMIN' || user?.role === 'FACULTY';

  const priorityOptions: { value: Priority; label: string; color: string }[] = [
    { value: 'NORMAL', label: 'General Notice', color: theme.colors.primary },
    { value: 'HIGH', label: 'Important', color: '#E65100' },
    { value: 'URGENT', label: 'Urgent / Exam', color: theme.colors.error },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Official Circulars"
        subtitle="Government Arts & Science College, Kuthalam"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {isStaff && (
          <View style={styles.composeRow}>
            <Button
              title={showCreate ? 'Close Composer' : '+ Compose Institutional Circular'}
              variant={showCreate ? 'outline' : 'primary'}
              icon={showCreate ? 'close-outline' : 'megaphone-outline'}
              onPress={() => setShowCreate(!showCreate)}
            />
          </View>
        )}

        {showCreate && isStaff && (
          <Card style={styles.postCard} variant="outlined">
            <Text style={styles.cardHeading}>Compose Institutional Announcement</Text>
            <Text style={styles.cardSub}>
              This circular will be broadcast to all enrolled students and faculty members.
            </Text>

            <Input
              label="Circular Title *"
              placeholder="e.g. End Semester Exam Fee & Hall Ticket Schedule"
              value={title}
              onChangeText={setTitle}
            />

            <Input
              label="Announcement Content *"
              placeholder="Provide detailed instructions, regulatory circular references, deadlines, and requirements..."
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.priorityLabel}>Urgency / Broadcast Level</Text>
            <View style={styles.priorityRow}>
              {priorityOptions.map((opt) => {
                const isSelected = priority === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.priorityChip,
                      isSelected && { borderColor: opt.color, backgroundColor: `${opt.color}15` },
                    ]}
                    onPress={() => setPriority(opt.value)}
                  >
                    <Text
                      style={[
                        styles.priorityChipText,
                        isSelected && { color: opt.color, fontFamily: theme.typography.families.primaryBold },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              title="Broadcast Circular"
              variant="primary"
              icon="send-outline"
              onPress={handlePostNotice}
              loading={submitting}
              style={{ marginTop: 12 }}
            />
          </Card>
        )}

        <View style={styles.countRow}>
          <Text style={styles.countText}>Official Circulars & Orders ({notices.length})</Text>
        </View>

        {loading ? (
          <MaterialsSkeleton count={3} />
        ) : error && notices.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="cloud-offline-outline" size={44} color={theme.colors.error} />
            <Text style={[styles.loadingText, { color: theme.colors.error, marginVertical: 10 }]}>{error}</Text>
            <Button title="Retry Notices" onPress={() => { setLoading(true); fetchNotices(); }} variant="outline" />
          </View>
        ) : notices.length === 0 ? (
          <EmptyState
            title="No Circulars Published"
            message="Institutional notifications, examination schedules, and holidays will appear here."
            icon="megaphone-outline"
          />
        ) : (
          notices.map((n) => {
            const isUrgent = n.priority === 'URGENT';
            const isHigh = n.priority === 'HIGH';
            return (
              <Card
                key={n._id}
                style={[styles.noticeCard, isUrgent && styles.urgentNoticeCard]}
                variant={isUrgent ? 'elevated' : 'outlined'}
              >
                <View style={styles.noticeHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.noticeTitle}>{n.title}</Text>
                    <Text style={styles.authorText}>
                      Principal's Office • Ref: GASC/NOT/{n._id ? n._id.substring(n._id.length - 4).toUpperCase() : '001'}
                    </Text>
                  </View>
                  <Badge
                    label={n.priority}
                    type={isUrgent ? 'error' : isHigh ? 'warning' : 'info'}
                    size="small"
                  />
                </View>

                <Text style={styles.noticeBody}>{n.content}</Text>

                <View style={styles.noticeFooter}>
                  <View style={styles.footerItem}>
                    <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.dateText}>
                      Published: {new Date(n.publishedAt || n.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.footerItem}>
                    <Ionicons name="shield-checkmark-outline" size={12} color={theme.colors.primary} />
                    <Text style={styles.verifiedText}>Official Notification</Text>
                  </View>
                </View>
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
  composeRow: {
    marginBottom: 12,
  },
  postCard: {
    padding: 16,
    marginBottom: 16,
  },
  cardHeading: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 15,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  cardSub: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  priorityLabel: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.text,
    marginBottom: 6,
  },
  priorityRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginHorizontal: 3,
    backgroundColor: '#FFFFFF',
  },
  priorityChipText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  countRow: {
    marginVertical: 8,
  },
  countText: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 13,
    color: theme.colors.text,
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
  noticeCard: {
    padding: 14,
    marginBottom: 10,
  },
  urgentNoticeCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
  },
  noticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noticeTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  authorText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.primary,
    marginTop: 2,
  },
  noticeBody: {
    fontFamily: theme.typography.families.primary,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 19,
    marginBottom: 10,
  },
  noticeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: 8,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  verifiedText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 10,
    color: theme.colors.primary,
  },
});
