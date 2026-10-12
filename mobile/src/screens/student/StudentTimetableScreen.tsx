import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header, Card, SectionHeader, EmptyState } from '../../components';
import { api } from '../../services/api';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export const StudentTimetableScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [selectedDay, setSelectedDay] = useState('MONDAY');
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTimetable = async () => {
    try {
      const res = await api.get('/timetable');
      if (res.success && res.data) {
        setSlots(res.data.slots || []);
      }
    } catch (err) {
      console.log('Error fetching timetable:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTimetable();
  };

  const filteredSlots = slots
    .filter((s) => s.dayOfWeek === selectedDay)
    .sort((a, b) => a.periodNo - b.periodNo);

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Lecture Timetable"
        subtitle="Weekly Academic Schedule"
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* Weekday Switcher */}
      <View style={styles.daySelector}>
        {DAYS.map((day) => {
          const isSelected = selectedDay === day;
          return (
            <TouchableOpacity
              key={day}
              style={[styles.dayTab, isSelected && styles.dayTabActive]}
              onPress={() => setSelectedDay(day)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>
                {day.substring(0, 3)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SectionHeader
          title={`${selectedDay} Schedule`}
          subtitle="Official departmental timetable"
          icon="calendar-outline"
        />

        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 24 }} />
        ) : filteredSlots.length === 0 ? (
          <EmptyState
            icon="calendar-clear-outline"
            title={`No Lectures on ${selectedDay}`}
            description="There are no scheduled lecture sessions configured for this day."
          />
        ) : (
          filteredSlots.map((slot, idx) => (
            <Card key={slot._id || idx} style={styles.slotCard}>
              <View style={styles.periodCol}>
                <View style={styles.periodBadgeBox}>
                  <Text style={styles.periodBadge}>P{slot.periodNo}</Text>
                </View>
                <Text style={styles.timeText}>{slot.startTime}</Text>
                <Text style={styles.timeTextEnd}>{slot.endTime}</Text>
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.subjectTitle}>{slot.subjectId?.title || 'Subject'}</Text>
                <Text style={styles.subCode}>Code: {slot.subjectId?.code || 'SUB'}</Text>
                <View style={styles.facultyRow}>
                  <Ionicons name="person-outline" size={13} color={theme.colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.facultyText}>
                    {slot.facultyId?.fullName || 'Assigned Faculty'}
                  </Text>
                </View>
                <View style={styles.venueRow}>
                  <Ionicons name="location-outline" size={13} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={styles.roomText}>Room: {slot.roomNo || 'Main Block'}</Text>
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
  daySelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  dayTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  dayTabActive: {
    backgroundColor: theme.colors.tint,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  dayText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  dayTextActive: {
    fontFamily: theme.typography.fonts.bold,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: 32,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginVertical: 4,
  },
  periodCol: {
    width: 64,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: theme.colors.divider,
    paddingRight: 10,
    marginRight: 12,
  },
  periodBadgeBox: {
    backgroundColor: theme.colors.tint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  periodBadge: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 12,
    color: theme.colors.primary,
  },
  timeText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 11,
    color: theme.colors.text,
  },
  timeTextEnd: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  infoCol: {
    flex: 1,
  },
  subjectTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  subCode: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  facultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  facultyText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  roomText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});
