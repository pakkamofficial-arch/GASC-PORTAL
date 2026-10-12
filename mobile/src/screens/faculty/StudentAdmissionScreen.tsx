import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { api } from '../../services/api';
import { Header, Card, Button, Input, SectionHeader } from '../../components';

export const StudentAdmissionScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  // Admission Form Fields
  const [registerNo, setRegisterNo] = useState<string>('');
  const [rollNumber, setRollNumber] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [dob, setDob] = useState<string>(''); // YYYY-MM-DD
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [section, setSection] = useState<string>('A');
  const [academicYear, setAcademicYear] = useState<string>('2024-2025');
  const [admissionDate, setAdmissionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [guardianName, setGuardianName] = useState<string>('');
  const [guardianPhone, setGuardianPhone] = useState<string>('');
  const [guardianRelationship, setGuardianRelationship] = useState<string>('Father');
  const [address, setAddress] = useState<string>('');
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [community, setCommunity] = useState<string>('BC');
  const [bloodGroup, setBloodGroup] = useState<string>('O+');

  // Previous Education Details
  const [schoolName, setSchoolName] = useState<string>('');
  const [tenthMarks, setTenthMarks] = useState<string>('');
  const [twelfthMarks, setTwelfthMarks] = useState<string>('');
  const [tcNumber, setTcNumber] = useState<string>('');

  const fetchHierarchy = useCallback(async () => {
    try {
      const [res, batchesRes] = await Promise.all([
        api.get('/academic/structure-overview'),
        api.get('/academic/batches'),
      ]);

      let courseList: any[] = [];
      let classList: any[] = [];
      if (res.success && res.data) {
        courseList = Array.isArray(res.data.courses) ? res.data.courses : [];
        classList = Array.isArray(res.data.classes) ? res.data.classes : [];
        setCourses(courseList);
        setClasses(classList);
        if (courseList.length > 0) {
          setSelectedCourseId(courseList[0].courseId || courseList[0]._id);
        }
      }

      let batchList: any[] = [];
      if (batchesRes && batchesRes.success && batchesRes.data) {
        if (Array.isArray(batchesRes.data.batches)) {
          batchList = batchesRes.data.batches;
        } else if (Array.isArray(batchesRes.data)) {
          batchList = batchesRes.data;
        }
      }
      if (batchList.length === 0 && res && res.success && res.data && Array.isArray(res.data.batches)) {
        batchList = res.data.batches;
      }

      setBatches(batchList);
      if (batchList.length > 0) {
        setSelectedBatchId(batchList[0]._id);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  // When selected course changes, auto-select first matching batch if available
  useEffect(() => {
    if (selectedCourseId && Array.isArray(batches) && batches.length > 0) {
      const match = batches.find((b) => {
        const bCourseId = typeof b.courseId === 'object' ? b.courseId?._id : b.courseId;
        return String(bCourseId) === String(selectedCourseId);
      });
      if (match) {
        setSelectedBatchId(match._id);
      }
    }
  }, [selectedCourseId, batches]);

  const handleRegisterStudent = async () => {
    if (!registerNo.trim() || !fullName.trim() || !dob.trim()) {
      Alert.alert('Required Fields', 'Please fill Register Number, Full Name, and Date of Birth (YYYY-MM-DD).');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) {
      Alert.alert('Invalid Date', 'Date of birth must be formatted as YYYY-MM-DD (e.g. 2006-08-12).');
      return;
    }

    // Determine corresponding classId
    const matchedClass = Array.isArray(classes)
      ? classes.find(
          (c) =>
            String(c.courseId?._id || c.courseId) === String(selectedCourseId) &&
            c.year === selectedYear
        )
      : null;

    const selectedCourseObj = Array.isArray(courses)
      ? courses.find((c) => (c.courseId || c._id) === selectedCourseId)
      : null;

    const deptId =
      selectedCourseObj?.departmentId?._id ||
      selectedCourseObj?.departmentId ||
      matchedClass?.departmentId?._id ||
      matchedClass?.departmentId;

    setSubmitting(true);
    try {
      const res = await api.post('/admin/students', {
        registerNo: registerNo.trim().toUpperCase(),
        rollNumber: rollNumber.trim().toUpperCase() || registerNo.trim().toUpperCase(),
        fullName: fullName.trim(),
        dob: dob.trim(),
        gender,
        departmentId: deptId,
        courseId: selectedCourseId,
        batchId: selectedBatchId || undefined,
        classId: matchedClass?._id,
        year: selectedYear,
        currentSemester: selectedYear * 2 - 1,
        section: section.trim().toUpperCase(),
        academicYear,
        admissionDate,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        guardianName: guardianName.trim(),
        guardianPhone: guardianPhone.trim(),
        guardianRelationship: guardianRelationship.trim(),
        address: address.trim(),
        emergencyContact: emergencyContact.trim() || undefined,
        bloodGroup: bloodGroup.trim() || undefined,
        community: community.trim() || undefined,
        previousEducation: {
          schoolName: schoolName.trim() || undefined,
          tenthMarks: tenthMarks ? Number(tenthMarks) : undefined,
          twelfthMarks: twelfthMarks ? Number(twelfthMarks) : undefined,
          tcNumber: tcNumber.trim() || undefined,
        },
      });

      if (res.success) {
        Alert.alert(
          'Student Record Created',
          `Official record for ${fullName} (${registerNo}) created successfully.\n\nAccount is set in unactivated state for first-time verified onboarding.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Failed to create student admission record.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading admission structure...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Student Admission Entry"
        subtitle="Create official institutional record & onboarding factor"
        showBack
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Security Information Box */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.infoText}>
              The Date of Birth entered here acts as the verification factor for the student's first-time login. A private password will be set by the student upon initial activation.
            </Text>
          </View>

          {/* Section 1: Academic & Course Allocation */}
          <Card style={styles.formCard}>
            <SectionHeader title="1. Course & Class Allocation" subtitle="Academic enrollment details" />

            <Text style={styles.fieldLabel}>Select Programme / Course:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
              {Array.isArray(courses) &&
                courses.map((c) => {
                  const cId = c.courseId || c._id;
                  const isSelected = selectedCourseId === cId;
                  return (
                    <TouchableOpacity
                      key={cId}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setSelectedCourseId(cId)}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {c.name || c.code}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <Text style={styles.fieldLabel}>Year Level:</Text>
            <View style={styles.yearRow}>
              {[1, 2, 3].map((yr) => (
                <TouchableOpacity
                  key={yr}
                  style={[styles.yearChip, selectedYear === yr && styles.yearChipActive]}
                  onPress={() => setSelectedYear(yr)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.yearChipText, selectedYear === yr && styles.yearChipTextActive]}>
                    {yr === 1 ? '1st Year' : yr === 2 ? '2nd Year' : '3rd Year'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Input
                  label="Section"
                  value={section}
                  onChangeText={setSection}
                  placeholder="A"
                  autoCapitalize="characters"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Academic Year"
                  value={academicYear}
                  onChangeText={setAcademicYear}
                  placeholder="2024-2025"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Academic Batch:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
              {Array.isArray(batches) && batches.length > 0 ? (
                batches.map((b) => {
                  const isSelected = selectedBatchId === b._id;
                  const batchDisplayName =
                    b.name ||
                    b.batchName ||
                    (b.admissionYear && b.graduationYear
                      ? `${b.admissionYear}-${b.graduationYear}`
                      : 'Academic Batch');
                  return (
                    <TouchableOpacity
                      key={b._id}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setSelectedBatchId(b._id)}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {batchDisplayName}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={[styles.chip, styles.chipActive]}>
                  <Text style={[styles.chipText, styles.chipTextActive]}>
                    {academicYear} (Default)
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Live Class Grouping Summary Card */}
            {(() => {
              const selectedCourseObj = Array.isArray(courses)
                ? courses.find((c) => (c.courseId || c._id) === selectedCourseId)
                : null;
              const selectedBatchObj = Array.isArray(batches)
                ? batches.find((b) => b._id === selectedBatchId)
                : null;
              const matchedClass = Array.isArray(classes)
                ? classes.find(
                    (c) =>
                      String(c.courseId?._id || c.courseId) === String(selectedCourseId) &&
                      c.year === selectedYear
                  )
                : null;
              const batchDisplayName =
                selectedBatchObj?.name ||
                selectedBatchObj?.batchName ||
                (selectedBatchObj?.admissionYear && selectedBatchObj?.graduationYear
                  ? `${selectedBatchObj.admissionYear}-${selectedBatchObj.graduationYear}`
                  : academicYear);
              return (
                <View style={styles.groupingCard}>
                  <View style={styles.groupingHeader}>
                    <Ionicons name="layers-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.groupingTitle}>Automatic Class Allocation Preview</Text>
                  </View>
                  <Text style={styles.groupingDetails}>
                    {selectedCourseObj?.name || 'Selected Programme'} • Year {selectedYear} (Semester {selectedYear * 2 - 1}) • Section {section}
                  </Text>
                  <Text style={styles.groupingMeta}>
                    Batch: {batchDisplayName} • Target Class: {matchedClass ? matchedClass.name : `${selectedCourseObj?.code || 'CRS'}-Y${selectedYear}-${section}`}
                  </Text>
                </View>
              );
            })()}
          </Card>

          {/* Section 2: Student Personal Profile */}
          <Card style={styles.formCard}>
            <SectionHeader title="2. Personal & Identity Details" subtitle="Official student identification" />

            <Input
              label="College Register Number *"
              placeholder="e.g. 24UCS045"
              value={registerNo}
              onChangeText={setRegisterNo}
              autoCapitalize="characters"
              leftIcon="id-card-outline"
            />

            <Input
              label="Student Roll Number (Institutional)"
              placeholder="e.g. 24CS45 (Leave empty to use Register No)"
              value={rollNumber}
              onChangeText={setRollNumber}
              autoCapitalize="characters"
              leftIcon="pricetag-outline"
            />

            <Input
              label="Student Full Name *"
              placeholder="e.g. Anandhan S"
              value={fullName}
              onChangeText={setFullName}
              leftIcon="person-outline"
            />

            <Input
              label="Date of Birth (YYYY-MM-DD) *"
              placeholder="e.g. 2006-08-12"
              value={dob}
              onChangeText={setDob}
              leftIcon="calendar-outline"
            />

            <Text style={styles.fieldLabel}>Gender:</Text>
            <View style={styles.yearRow}>
              {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.yearChip, gender === g && styles.yearChipActive]}
                  onPress={() => setGender(g)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.yearChipText, gender === g && styles.yearChipTextActive]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Input
                  label="Community Category"
                  placeholder="BC / MBC / SC / ST"
                  value={community}
                  onChangeText={setCommunity}
                  autoCapitalize="characters"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Blood Group"
                  placeholder="O+ / B+ / A+"
                  value={bloodGroup}
                  onChangeText={setBloodGroup}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <Input
              label="Student Contact Phone"
              placeholder="10-digit mobile number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon="call-outline"
            />

            <Input
              label="Student Email Address"
              placeholder="e.g. anandhan.s@student.gasckuthalam.edu.in"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
            />
          </Card>

          {/* Section 3: Parent/Guardian & Address */}
          <Card style={styles.formCard}>
            <SectionHeader title="3. Guardian & Residential Details" subtitle="Emergency contact and home address" />

            <Input
              label="Parent / Guardian Name *"
              placeholder="e.g. Senthil Kumar P"
              value={guardianName}
              onChangeText={setGuardianName}
              leftIcon="people-outline"
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Input
                  label="Guardian Phone *"
                  placeholder="10-digit number"
                  value={guardianPhone}
                  onChangeText={setGuardianPhone}
                  keyboardType="phone-pad"
                  leftIcon="call-outline"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Relationship"
                  placeholder="Father / Mother"
                  value={guardianRelationship}
                  onChangeText={setGuardianRelationship}
                />
              </View>
            </View>

            <Input
              label="Residential Permanent Address *"
              placeholder="Door No, Street, Village, Taluk, District - Pincode"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              style={{ height: 75, textAlignVertical: 'top' }}
              leftIcon="home-outline"
            />

            <Input
              label="Emergency Contact Phone"
              placeholder="Alternate phone number"
              value={emergencyContact}
              onChangeText={setEmergencyContact}
              keyboardType="phone-pad"
              leftIcon="alert-circle-outline"
            />
          </Card>

          {/* Section 4: Previous Education Details */}
          <Card style={styles.formCard}>
            <SectionHeader title="4. Previous Qualifying Education" subtitle="HSC / 12th Standard and Transfer Certificate" />

            <Input
              label="Qualifying School Name"
              placeholder="e.g. Govt Higher Secondary School, Kuthalam"
              value={schoolName}
              onChangeText={setSchoolName}
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Input
                  label="10th Marks Total"
                  placeholder="e.g. 420"
                  value={tenthMarks}
                  onChangeText={setTenthMarks}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="12th Marks Total"
                  placeholder="e.g. 512"
                  value={twelfthMarks}
                  onChangeText={setTwelfthMarks}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Input
              label="Previous School TC Number"
              placeholder="e.g. TC-2024-0891"
              value={tcNumber}
              onChangeText={setTcNumber}
              autoCapitalize="characters"
            />
          </Card>

          <Button
            title="Register Student Record"
            onPress={handleRegisterStudent}
            loading={submitting}
            icon={<Ionicons name="person-add" size={18} color="#FFFFFF" />}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.tint,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.base,
  },
  infoText: {
    flex: 1,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
    lineHeight: theme.typography.lineHeights.normal,
  },
  formCard: {
    padding: theme.spacing.base,
    marginBottom: theme.spacing.base,
  },
  fieldLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginBottom: 6,
  },
  selectorScroll: {
    marginBottom: theme.spacing.md,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
  },
  chipTextActive: {
    color: theme.colors.textWhite,
  },
  yearRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  yearChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginRight: 6,
  },
  yearChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  yearChipText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
  },
  yearChipTextActive: {
    color: theme.colors.textWhite,
  },
  twoCol: {
    flexDirection: 'row',
  },
  submitBtn: {
    marginTop: theme.spacing.sm,
  },
  groupingCard: {
    backgroundColor: '#F1F8F1',
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginTop: 10,
  },
  groupingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupingTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 12,
    color: theme.colors.primaryDark,
    marginLeft: 6,
  },
  groupingDetails: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 2,
  },
  groupingMeta: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
