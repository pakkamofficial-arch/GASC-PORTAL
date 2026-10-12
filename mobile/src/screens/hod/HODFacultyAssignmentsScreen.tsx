import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header, Card, Badge, Button, Input, SectionHeader, EmptyState } from '../../components';
import { api } from '../../services/api';

export const HODFacultyAssignmentsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('MONDAY');

  // Assign Modal state
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<number>(4);
  const [selectedSection, setSelectedSection] = useState<string>('A');
  const [periodNo, setPeriodNo] = useState<number>(1);
  const [startTime, setStartTime] = useState<string>('09:30');
  const [endTime, setEndTime] = useState<string>('10:30');
  const [roomNo, setRoomNo] = useState<string>('Block-A Room 201');

  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;

  const loadData = useCallback(async () => {
    try {
      const [classRes, facRes, ttRes] = await Promise.all([
        api.get('/hod/classes'),
        api.get('/hod/faculty'),
        api.get(`/hod/timetable?dayOfWeek=${selectedDay}`),
      ]);

      if (classRes.success && classRes.data) {
        setClasses(classRes.data.classes || []);
      }
      if (facRes.success && facRes.data) {
        setFacultyList(facRes.data.faculty || []);
        if (facRes.data.faculty?.length > 0 && !selectedFacultyId) {
          setSelectedFacultyId(facRes.data.faculty[0]._id);
        }
      }
      if (ttRes.success && ttRes.data) {
        setTimetableSlots(ttRes.data.slots || []);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load faculty allocations');
    } finally {
      setLoading(false);
    }
  }, [selectedDay]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssignSlot = async () => {
    if (!selectedFacultyId || !selectedSubjectId || !periodNo) {
      Alert.alert('Required Fields', 'Please select a faculty member, subject, and period number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/hod/timetable/assign', {
        academicYear: '2024-2025',
        semester: selectedSemester,
        section: selectedSection,
        dayOfWeek: selectedDay,
        periodNo,
        startTime,
        endTime,
        subjectId: selectedSubjectId,
        facultyId: selectedFacultyId,
        roomNo,
      });

      if (res.success) {
        Alert.alert('Assignment Saved', 'Timetable period successfully assigned with clash validation verified.');
        setModalVisible(false);
        loadData();
      }
    } catch (err: any) {
      Alert.alert('Assignment Conflict', err.message || 'Clash detected: faculty or class already booked.');
    } finally {
      setSubmitting(false);
    }
  };

  // Extract all subjects from classes
  const availableSubjects: any[] = [];
  classes.forEach((c) => {
    c.subjectAssignments?.forEach((sa: any) => {
      if (sa.subjectId && !availableSubjects.some((s) => s._id === sa.subjectId._id)) {
        availableSubjects.push(sa.subjectId);
      }
    });
  });

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Faculty & Timetable Allocation"
        subtitle="Schedule lecture periods and detect timetable conflicts"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              if (availableSubjects.length > 0) setSelectedSubjectId(availableSubjects[0]._id);
              setModalVisible(true);
            }}
            accessibilityLabel="Assign period"
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Assign</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Day of Week Selector */}
        <Text style={styles.sectionLabel}>Select Timetable Day:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
          {days.map((day) => (
            <TouchableOpacity
              key={day}
              style={[styles.dayChip, selectedDay === day && styles.dayChipActive]}
              onPress={() => setSelectedDay(day)}
              accessibilityRole="button"
            >
              <Text style={[styles.dayChipText, selectedDay === day && styles.dayChipTextActive]}>
                {day.slice(0, 3)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Timetable Period Allocation List */}
        <SectionHeader
          title={`${selectedDay} Schedule (${timetableSlots.length} Periods)`}
          subtitle="Assigned faculty, subject lectures, and lecture rooms"
        />

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 24 }} />
        ) : timetableSlots.length === 0 ? (
          <EmptyState
            title="No Timetable Periods Configured"
            message={`No lecture slots have been assigned for ${selectedDay}. Tap '+ Assign' to allocate teaching duty.`}
            icon="calendar-outline"
          />
        ) : (
          timetableSlots.map((slot) => (
            <Card key={slot._id} style={styles.slotCard} variant="outlined">
              <View style={styles.slotRow}>
                <View style={styles.periodCol}>
                  <Text style={styles.periodBadge}>P{slot.periodNo}</Text>
                  <Text style={styles.periodTime}>{slot.startTime}</Text>
                </View>
                <View style={{ flex: 1, paddingLeft: 10 }}>
                  <Text style={styles.slotSubject}>{slot.subjectId?.title || 'Subject'}</Text>
                  <Text style={styles.slotFaculty}>
                    Faculty: <Text style={styles.bold}>{slot.facultyId?.fullName || 'Assigned Staff'}</Text>
                  </Text>
                  <Text style={styles.slotMeta}>
                    Sem {slot.semester} (Sec {slot.section}) • {slot.roomNo}
                  </Text>
                </View>
                <Badge label="VERIFIED" type="success" size="small" />
              </View>
            </Card>
          ))
        )}

        {/* Department Classes Roster Summary */}
        <SectionHeader title="Department Class Roster" subtitle="Enrolment and assigned in-charge staff" />
        {classes.map((cls) => (
          <Card key={cls._id} style={styles.classCard} variant="outlined">
            <View style={styles.classRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.classTitle}>
                  {cls.courseId?.name} • Year {cls.year} (Sec {cls.section})
                </Text>
                <Text style={styles.classMeta}>
                  In-Charge: {cls.classInCharge?.fullName || 'Vacant / Not Appointed'}
                </Text>
                <Text style={styles.classMeta}>
                  Enrolled Students: {cls.studentCount || 0} • Sem {cls.currentSemester}
                </Text>
              </View>
              <Badge
                label={cls.classInCharge ? 'ASSIGNED' : 'VACANT'}
                type={cls.classInCharge ? 'info' : 'warning'}
              />
            </View>
          </Card>
        ))}
      </ScrollView>

      {/* Assignment Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Timetable Period</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalSub}>
                Assigns a teaching period to faculty with automatic timetable clash validation.
              </Text>

              <Text style={styles.fieldLabel}>Select Teaching Faculty *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {facultyList.map((f) => (
                  <TouchableOpacity
                    key={f._id}
                    style={[styles.chip, selectedFacultyId === f._id && styles.chipActive]}
                    onPress={() => setSelectedFacultyId(f._id)}
                  >
                    <Text style={[styles.chipText, selectedFacultyId === f._id && styles.chipTextActive]}>
                      {f.fullName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Select Subject *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {availableSubjects.map((s) => (
                  <TouchableOpacity
                    key={s._id}
                    style={[styles.chip, selectedSubjectId === s._id && styles.chipActive]}
                    onPress={() => setSelectedSubjectId(s._id)}
                  >
                    <Text style={[styles.chipText, selectedSubjectId === s._id && styles.chipTextActive]}>
                      {s.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Period Number (1 to 6):</Text>
              <View style={styles.periodRow}>
                {[1, 2, 3, 4, 5, 6].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.pChip, periodNo === p && styles.pChipActive]}
                    onPress={() => {
                      setPeriodNo(p);
                      if (p === 1) { setStartTime('09:30'); setEndTime('10:30'); }
                      if (p === 2) { setStartTime('10:30'); setEndTime('11:30'); }
                      if (p === 3) { setStartTime('11:45'); setEndTime('12:45'); }
                      if (p === 4) { setStartTime('01:30'); setEndTime('02:30'); }
                      if (p === 5) { setStartTime('02:30'); setEndTime('03:30'); }
                      if (p === 6) { setStartTime('03:30'); setEndTime('04:30'); }
                    }}
                  >
                    <Text style={[styles.pChipText, periodNo === p && styles.pChipTextActive]}>P{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.twoCol}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Input label="Start Time" value={startTime} onChangeText={setStartTime} placeholder="09:30" />
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Input label="End Time" value={endTime} onChangeText={setEndTime} placeholder="10:30" />
                </View>
              </View>

              <Input label="Lecture Room" value={roomNo} onChangeText={setRoomNo} placeholder="Block-A Room 201" />

              <Button
                title="Save & Validate Clashes"
                onPress={handleAssignSlot}
                loading={submitting}
                style={{ marginTop: 12 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
  },
  sectionLabel: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  dayScroll: {
    marginBottom: 12,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginRight: 6,
  },
  dayChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayChipText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.text,
  },
  dayChipTextActive: {
    color: '#FFFFFF',
  },
  slotCard: {
    padding: 12,
    marginBottom: 8,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodCol: {
    width: 60,
    alignItems: 'center',
  },
  periodBadge: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 13,
    color: theme.colors.primary,
  },
  periodTime: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  slotSubject: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 13,
    color: theme.colors.text,
  },
  slotFaculty: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  slotMeta: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  bold: {
    fontFamily: theme.typography.families.primaryBold,
    color: theme.colors.text,
  },
  classCard: {
    padding: 12,
    marginBottom: 8,
  },
  classRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 13,
    color: theme.colors.text,
  },
  classMeta: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '85%',
    padding: theme.spacing.base,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 16,
    color: theme.colors.text,
  },
  modalSub: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  modalContent: {
    paddingBottom: 24,
  },
  fieldLabel: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.text,
    marginBottom: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: theme.colors.text,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  periodRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  pChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginRight: 4,
  },
  pChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pChipText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.text,
  },
  pChipTextActive: {
    color: '#FFFFFF',
  },
  twoCol: {
    flexDirection: 'row',
  },
});
