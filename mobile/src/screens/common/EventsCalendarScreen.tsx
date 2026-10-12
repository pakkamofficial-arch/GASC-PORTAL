import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Header, Card, Badge, Button, Input, SectionHeader, EmptyState } from '../../components';

const EVENT_TYPES = [
  'ALL',
  'EXAM',
  'HOLIDAY',
  'SEMINAR',
  'CULTURAL',
  'DEADLINE',
  'MEETING',
  'ANNOUNCEMENT',
];

export const EventsCalendarScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'FACULTY';

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');

  // Creation Modal
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [eventType, setEventType] = useState<string>('SEMINAR');
  const [startDate, setStartDate] = useState<string>(''); // YYYY-MM-DD
  const [endDate, setEndDate] = useState<string>('');
  const [venue, setVenue] = useState<string>('');
  const [organizer, setOrganizer] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchEvents = useCallback(async () => {
    try {
      const endpoint =
        selectedTypeFilter === 'ALL' ? '/events' : `/events?type=${selectedTypeFilter}`;
      const res = await api.get(endpoint);
      if (res.success && res.data) {
        setEvents(res.data.events || []);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load college calendar events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedTypeFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const handleCreateEvent = async () => {
    if (!title.trim() || !startDate.trim()) {
      Alert.alert('Required', 'Please enter event title and start date (YYYY-MM-DD)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/events', {
        title: title.trim(),
        description: description.trim() || undefined,
        type: eventType,
        startDate: startDate.trim(),
        endDate: endDate.trim() || startDate.trim(),
        venue: venue.trim() || undefined,
        organizer: organizer.trim() || 'GASC Administration',
        targetAudience: 'ALL',
        isPublished: true,
      });

      if (res.success) {
        Alert.alert('Published', 'Calendar event published successfully.');
        setModalVisible(false);
        setTitle('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setVenue('');
        setOrganizer('');
        fetchEvents();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to publish event');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'EXAM':
      case 'DEADLINE':
        return 'error';
      case 'HOLIDAY':
        return 'success';
      case 'SEMINAR':
      case 'CULTURAL':
        return 'info';
      default:
        return 'neutral';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading college academic calendar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="College Calendar & Events"
        subtitle="Examinations, seminars, holidays and official notices"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          isPrivileged ? (
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Add new event"
              style={{ padding: 4 }}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isPrivileged && (
          <Button
            title="Publish Academic Event"
            onPress={() => setModalVisible(true)}
            icon={<Ionicons name="calendar-outline" size={18} color="#FFFFFF" />}
            style={styles.addEventBtn}
          />
        )}

        {/* Filter Horizontal Scroll */}
        <SectionHeader title="Filter Academic Events" subtitle="Filter by type of engagement" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {EVENT_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.filterPill,
                selectedTypeFilter === t && styles.filterPillActive,
              ]}
              onPress={() => setSelectedTypeFilter(t)}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedTypeFilter === t && styles.filterPillTextActive,
                ]}
              >
                {t === 'ALL' ? 'All Events' : t}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SectionHeader
          title={`Scheduled Events (${events.length})`}
          subtitle="Synchronized across institutional timetable and mobile alerts"
        />

        {events.length === 0 ? (
          <EmptyState
            title="No Events Scheduled"
            message="No upcoming events found for this filter in the academic calendar."
            icon="calendar-outline"
          />
        ) : (
          events.map((evt) => (
            <Card key={evt._id} style={styles.eventCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{evt.title}</Text>
                  <Text style={styles.eventDate}>
                    {new Date(evt.startDate).toLocaleDateString()}
                    {evt.endDate && evt.endDate !== evt.startDate
                      ? ` - ${new Date(evt.endDate).toLocaleDateString()}`
                      : ''}
                  </Text>
                </View>
                <Badge label={evt.type} type={getTypeVariant(evt.type)} />
              </View>

              {evt.description ? (
                <Text style={styles.eventDescription}>{evt.description}</Text>
              ) : null}

              <View style={styles.metaRow}>
                {evt.venue ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={14} color={theme.colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.metaText}>{evt.venue}</Text>
                  </View>
                ) : null}

                {evt.organizer ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.metaText}>{evt.organizer}</Text>
                  </View>
                ) : null}
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Event Creation Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Publish Academic Event</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} accessibilityRole="button">
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              <Input
                label="Event Title"
                placeholder="e.g. End Semester Theory Examinations"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.inputLabel}>Event Type:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {['EXAM', 'HOLIDAY', 'SEMINAR', 'CULTURAL', 'DEADLINE', 'MEETING', 'ANNOUNCEMENT'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.choiceChip,
                      eventType === t && styles.choiceChipActive,
                    ]}
                    onPress={() => setEventType(t)}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.choiceChipText, eventType === t && styles.choiceChipTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Input
                label="Start Date (YYYY-MM-DD)"
                placeholder="e.g. 2026-05-02"
                value={startDate}
                onChangeText={setStartDate}
                leftIcon="calendar-outline"
              />

              <Input
                label="End Date (YYYY-MM-DD, Optional)"
                placeholder="e.g. 2026-05-25"
                value={endDate}
                onChangeText={setEndDate}
                leftIcon="calendar-outline"
              />

              <Input
                label="Venue / Location"
                placeholder="e.g. Main Exam Halls 1-6"
                value={venue}
                onChangeText={setVenue}
                leftIcon="location-outline"
              />

              <Input
                label="Organizer / Department"
                placeholder="e.g. Examination Cell"
                value={organizer}
                onChangeText={setOrganizer}
                leftIcon="person-outline"
              />

              <Input
                label="Description & Circular Details"
                placeholder="Provide event notes or schedule summary..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                style={{ height: 75, textAlignVertical: 'top' }}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1, marginRight: theme.spacing.sm }}
              />
              <Button
                title="Publish Event"
                onPress={handleCreateEvent}
                loading={submitting}
                style={{ flex: 1.5 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  addEventBtn: {
    marginBottom: theme.spacing.base,
  },
  filterScroll: {
    marginBottom: theme.spacing.base,
  },
  filterPill: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterPillText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
  },
  filterPillTextActive: {
    color: theme.colors.textWhite,
  },
  eventCard: {
    padding: theme.spacing.base,
    marginBottom: theme.spacing.base,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  eventTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primaryDark,
  },
  eventDate: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
    marginTop: 2,
  },
  eventDescription: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeights.normal,
    marginBottom: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.base,
    marginTop: 2,
  },
  metaText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: theme.spacing.base,
  },
  modalCard: {
    padding: theme.spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.base,
  },
  modalTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.primaryDark,
  },
  inputLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginBottom: 6,
  },
  typeScroll: {
    marginBottom: theme.spacing.base,
  },
  choiceChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
  },
  choiceChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  choiceChipText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
  },
  choiceChipTextActive: {
    color: theme.colors.textWhite,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.base,
  },
});
