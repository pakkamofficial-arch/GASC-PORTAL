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
import { api } from '../../services/api';
import { Header, Card, Badge, Button, StatCard, SectionHeader, EmptyState } from '../../components';

export const AdminClassesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [overview, setOverview] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('ALL');

  // Modal State for In-Charge Assignment
  const [assignModalVisible, setAssignModalVisible] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);

  const fetchClassData = useCallback(async () => {
    try {
      const [overviewRes, facultyRes] = await Promise.all([
        api.get('/academic/structure-overview'),
        api.get('/admin/faculty'),
      ]);

      if (overviewRes.success && overviewRes.data) {
        setOverview(overviewRes.data);
        setClasses(overviewRes.data.classes || []);
      }
      if (facultyRes.success && facultyRes.data) {
        setFacultyList(facultyRes.data.faculty || []);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load class structure data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchClassData();
  }, [fetchClassData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClassData();
  };

  const handleOpenAssign = (cls: any) => {
    setSelectedClass(cls);
    setSelectedFacultyId(cls.classInCharge?._id || '');
    setAssignModalVisible(true);
  };

  const handleAssignInCharge = async () => {
    if (!selectedClass || !selectedFacultyId) {
      Alert.alert('Required', 'Please select a faculty member');
      return;
    }

    setUpdating(true);
    try {
      const res = await api.post(`/academic/classes/${selectedClass._id}/assign-incharge`, {
        facultyId: selectedFacultyId,
        reason: 'Administrative academic duty assignment',
      });

      if (res.success) {
        Alert.alert('Success', 'Class In-Charge assigned successfully.');
        setAssignModalVisible(false);
        fetchClassData();
      }
    } catch (err: any) {
      Alert.alert('Assignment Conflict', err.message || 'Failed to assign Class In-Charge');
    } finally {
      setUpdating(false);
    }
  };

  const togglePolicy = async (cls: any) => {
    const newPolicy = cls.attendancePolicy === 'PERIOD_WISE' ? 'DAILY' : 'PERIOD_WISE';
    try {
      const res = await api.patch(`/academic/classes/${cls._id}/policy`, {
        attendancePolicy: newPolicy,
      });
      if (res.success) {
        fetchClassData();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to change attendance policy');
    }
  };

  const filteredClasses = classes.filter((cls) => {
    if (selectedCourseFilter === 'ALL') return true;
    return cls.courseId?.code === selectedCourseFilter;
  });

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading academic structure & classes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="College Courses & Classes"
        subtitle="15 Year-Level Class Groups & Faculty In-Charges"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Academic Hierarchy Metric Stats */}
        <View style={styles.statsRow}>
          <StatCard
            title="Total Courses"
            value={overview?.totalCourses || 5}
            icon="school-outline"
            style={styles.statCard}
          />
          <StatCard
            title="Year Classes"
            value={overview?.totalClasses || 15}
            icon="calendar-outline"
            style={styles.statCard}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title="Total Students"
            value={overview?.totalStudents || 0}
            icon="people-outline"
            style={styles.statCard}
          />
          <StatCard
            title="Vacant In-Charge"
            value={overview?.vacantInChargeCount || 0}
            icon="alert-circle-outline"
            color={overview?.vacantInChargeCount > 0 ? theme.colors.warning : theme.colors.primary}
            style={styles.statCard}
          />
        </View>

        {/* Course Filter Pills */}
        <SectionHeader title="Filter by Course Programme" subtitle="Select to inspect 1st, 2nd, and 3rd year groups" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['ALL', 'BSC-CS', 'BA-ENG', 'BA-TAMIL', 'BSC-MATHS', 'BCOM'].map((cCode) => (
            <TouchableOpacity
              key={cCode}
              style={[
                styles.filterPill,
                selectedCourseFilter === cCode && styles.filterPillActive,
              ]}
              onPress={() => setSelectedCourseFilter(cCode)}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedCourseFilter === cCode && styles.filterPillTextActive,
                ]}
              >
                {cCode === 'ALL' ? 'All 5 Courses' : cCode}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Classes Register */}
        <SectionHeader
          title={`Academic Classes (${filteredClasses.length})`}
          subtitle="Governing year levels, faculty assignments and policy"
        />

        {filteredClasses.length === 0 ? (
          <EmptyState
            title="No Classes Found"
            message="No academic classes match the selected course filter."
            icon="school-outline"
          />
        ) : (
          filteredClasses.map((cls) => {
            const hasInCharge = !!cls.classInCharge;
            const courseTitle = cls.courseId?.name || 'Undergraduate Programme';
            const yearLabel = cls.year === 1 ? '1st Year' : cls.year === 2 ? '2nd Year' : '3rd Year';

            return (
              <Card key={cls._id} style={styles.classCard}>
                <View style={styles.classCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.courseTitle}>{courseTitle}</Text>
                    <Text style={styles.classYearBadge}>
                      {yearLabel} • Section {cls.section} (Sem {cls.currentSemester})
                    </Text>
                  </View>
                  <Badge
                    label={hasInCharge ? 'In-Charge Assigned' : 'Vacant Position'}
                    type={hasInCharge ? 'success' : 'warning'}
                  />
                </View>

                {/* Class Details Grid */}
                <View style={styles.detailsGrid}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Academic Year:</Text>
                    <Text style={styles.detailValue}>{cls.academicYear}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Enrolled Strength:</Text>
                    <Text style={styles.detailValueHighlight}>{cls.studentCount || 0} Students</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Class In-Charge:</Text>
                    <Text style={[styles.detailValue, !hasInCharge && styles.vacantText]}>
                      {hasInCharge
                        ? `${cls.classInCharge.fullName} (${cls.classInCharge.employeeId})`
                        : 'Unassigned (Action Required)'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Attendance Mode:</Text>
                    <TouchableOpacity
                      style={styles.policyBadge}
                      onPress={() => togglePolicy(cls)}
                      accessibilityRole="button"
                      accessibilityLabel="Toggle attendance policy"
                    >
                      <Ionicons
                        name={cls.attendancePolicy === 'PERIOD_WISE' ? 'time-outline' : 'calendar-outline'}
                        size={14}
                        color={theme.colors.primary}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.policyText}>
                        {cls.attendancePolicy === 'PERIOD_WISE' ? '5-Period Wise' : 'Daily Once'} (Tap to Toggle)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* In-Charge Action Button */}
                <Button
                  title={hasInCharge ? 'Change Class In-Charge' : 'Assign Class In-Charge'}
                  onPress={() => handleOpenAssign(cls)}
                  variant={hasInCharge ? 'outline' : 'primary'}
                  size="small"
                  icon={<Ionicons name="person-add-outline" size={16} color={hasInCharge ? theme.colors.primary : '#FFFFFF'} />}
                  style={styles.assignBtn}
                />
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Assignment Modal */}
      <Modal visible={assignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Class In-Charge</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)} accessibilityRole="button">
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {selectedClass && (
              <View style={styles.modalSubHeader}>
                <Text style={styles.modalSubText}>
                  {selectedClass.courseId?.name} • Year {selectedClass.year} (Section {selectedClass.section})
                </Text>
                <Text style={styles.modalSubYear}>
                  Academic Year: {selectedClass.academicYear}
                </Text>
              </View>
            )}

            <Text style={styles.selectLabel}>Select Authorized Faculty Member:</Text>
            <ScrollView style={styles.facultySelectorList}>
              {facultyList.map((fac) => {
                const isSelected = selectedFacultyId === fac._id;
                return (
                  <TouchableOpacity
                    key={fac._id}
                    style={[styles.facultyOption, isSelected && styles.facultyOptionSelected]}
                    onPress={() => setSelectedFacultyId(fac._id)}
                    accessibilityRole="button"
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.facultyName, isSelected && styles.facultyNameSelected]}>
                        {fac.fullName}
                      </Text>
                      <Text style={styles.facultyDetails}>
                        {fac.employeeId} • {fac.designation} • {fac.departmentId?.name || 'Department'}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setAssignModalVisible(false)}
                style={{ flex: 1, marginRight: theme.spacing.sm }}
              />
              <Button
                title="Confirm Assignment"
                onPress={handleAssignInCharge}
                loading={updating}
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
  statsRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
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
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  filterPillTextActive: {
    color: theme.colors.textWhite,
  },
  classCard: {
    padding: theme.spacing.base,
    marginBottom: theme.spacing.md,
  },
  classCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  courseTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primaryDark,
  },
  classYearBadge: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  detailsGrid: {
    marginBottom: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  detailValueHighlight: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
  },
  vacantText: {
    color: theme.colors.warning,
    fontFamily: theme.typography.fonts.bold,
  },
  policyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.tint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  policyText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
  },
  assignBtn: {
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: theme.spacing.base,
  },
  modalCard: {
    padding: theme.spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  modalTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.primaryDark,
  },
  modalSubHeader: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.base,
  },
  modalSubText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  modalSubYear: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  selectLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  facultySelectorList: {
    maxHeight: 220,
    marginBottom: theme.spacing.base,
  },
  facultyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  facultyOptionSelected: {
    backgroundColor: theme.colors.tint,
    borderColor: theme.colors.primary,
  },
  facultyName: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  facultyNameSelected: {
    color: theme.colors.primaryDark,
    fontFamily: theme.typography.fonts.bold,
  },
  facultyDetails: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
