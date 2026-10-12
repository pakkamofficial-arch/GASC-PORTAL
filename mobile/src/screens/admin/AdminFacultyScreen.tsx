import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { StaffRosterSkeleton, StaffDetailsSkeleton } from '../../components/skeleton';
import { api } from '../../services/api';

export const AdminFacultyScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  // Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [credentialsModalVisible, setCredentialsModalVisible] = useState(false);

  // Selected faculty for action
  const [selectedFaculty, setSelectedFaculty] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Add Staff Form Fields
  const [addFullName, setAddFullName] = useState('');
  const [addStaffId, setAddStaffId] = useState('');
  const [autoGenId, setAutoGenId] = useState(true);
  const [addDepartmentId, setAddDepartmentId] = useState('');
  const [addDesignation, setAddDesignation] = useState('Assistant Professor');
  const [addQualification, setAddQualification] = useState('');
  const [addDob, setAddDob] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [addSpecialization, setAddSpecialization] = useState('');
  const [addPasswordMode, setAddPasswordMode] = useState<'AUTO' | 'CUSTOM'>('AUTO');
  const [addCustomPassword, setAddCustomPassword] = useState('');

  // Edit Staff Form Fields
  const [editFullName, setEditFullName] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editQualification, setEditQualification] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editSpecialization, setEditSpecialization] = useState('');

  // Class Assignment Fields
  const [assignmentsList, setAssignmentsList] = useState<any[]>([]);
  const [assignDeptId, setAssignDeptId] = useState('');
  const [assignSemester, setAssignSemester] = useState(1);
  const [assignSection, setAssignSection] = useState('A');
  const [assignSubjectId, setAssignSubjectId] = useState('');

  // Newly Created Credentials to Display Once
  const [createdCredentials, setCreatedCredentials] = useState<{
    staffName: string;
    staffId: string;
    temporaryPassword: string;
  } | null>(null);
  const [showPasswordText, setShowPasswordText] = useState(false);

  const fetchFaculty = async () => {
    try {
      setError(null);
      const res = await api.get('/admin/faculty');
      if (res.success && res.data) {
        setFacultyList(res.data.faculty || []);
      } else {
        setError(res.message || 'Failed to load faculty roster.');
      }
    } catch (err: any) {
      console.log('Error fetching faculty:', err);
      setError(err.message || 'Network error fetching faculty directory.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAcademicStructure = async () => {
    try {
      const res = await api.get('/admin/structure');
      if (res.success && res.data) {
        setDepartments(res.data.departments || []);
        setSubjects(res.data.subjects || []);
        if (res.data.departments && res.data.departments.length > 0) {
          setAddDepartmentId(res.data.departments[0]._id);
          setAssignDeptId(res.data.departments[0]._id);
        }
      }
    } catch (err) {
      console.log('Error fetching structure:', err);
    }
  };

  useEffect(() => {
    fetchFaculty();
    fetchAcademicStructure();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFaculty();
  };

  // Preview or fetch next available Staff ID
  const handleFetchNextStaffId = async () => {
    try {
      const res = await api.get('/admin/faculty/next-id');
      if (res.success && res.data?.nextStaffId) {
        setAddStaffId(res.data.nextStaffId);
      }
    } catch (err) {
      console.log('Error fetching next ID:', err);
    }
  };

  const openAddStaffModal = () => {
    setAddFullName('');
    setAddStaffId('');
    setAutoGenId(true);
    setAddDesignation('Assistant Professor');
    setAddQualification('');
    setAddDob('');
    setAddPhone('');
    setAddEmail('');
    setAddAddress('');
    setAddSpecialization('');
    setAddPasswordMode('AUTO');
    setAddCustomPassword('');
    if (departments.length > 0) {
      setAddDepartmentId(departments[0]._id);
    }
    handleFetchNextStaffId();
    setAddModalVisible(true);
  };

  const handleCreateStaff = async () => {
    if (!addFullName.trim()) {
      Alert.alert('Required Field', 'Please enter staff full name.');
      return;
    }
    if (!addDepartmentId) {
      Alert.alert('Required Field', 'Please select academic department.');
      return;
    }
    if (!addQualification.trim()) {
      Alert.alert('Required Field', 'Please enter educational qualification (e.g. M.Sc., Ph.D.).');
      return;
    }
    if (!addEmail.trim() || !addEmail.includes('@')) {
      Alert.alert('Required Field', 'Please enter a valid institutional email address.');
      return;
    }
    if (!addPhone.trim() || addPhone.trim().length < 10) {
      Alert.alert('Required Field', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!autoGenId && !addStaffId.trim()) {
      Alert.alert('Required Field', 'Please enter a unique Staff ID or select Auto-generate.');
      return;
    }
    if (addPasswordMode === 'CUSTOM' && (!addCustomPassword.trim() || addCustomPassword.trim().length < 8)) {
      Alert.alert('Password Requirement', 'Custom initial password must be at least 8 characters long with uppercase, lowercase, and numbers.');
      return;
    }

    setActionLoading(true);
    try {
      const payload: any = {
        fullName: addFullName.trim(),
        departmentId: addDepartmentId,
        designation: addDesignation.trim(),
        qualification: addQualification.trim(),
        email: addEmail.trim().toLowerCase(),
        phone: addPhone.trim(),
        autoGenerateId: autoGenId,
      };

      if (!autoGenId && addStaffId.trim()) {
        payload.employeeId = addStaffId.trim().toUpperCase();
      }
      if (addDob.trim()) payload.dob = addDob.trim();
      if (addAddress.trim()) payload.address = addAddress.trim();
      if (addSpecialization.trim()) payload.specialization = addSpecialization.trim();
      if (addPasswordMode === 'CUSTOM' && addCustomPassword.trim()) {
        payload.password = addCustomPassword.trim();
      }

      const res = await api.post('/admin/faculty', payload);
      if (res.success && res.data) {
        setAddModalVisible(false);
        const tempPassword = res.data.temporaryPassword || (addPasswordMode === 'CUSTOM' ? addCustomPassword.trim() : '');
        setCreatedCredentials({
          staffName: res.data.faculty?.fullName || addFullName.trim(),
          staffId: res.data.faculty?.employeeId || addStaffId.trim(),
          temporaryPassword: tempPassword,
        });
        setShowPasswordText(false);
        setCredentialsModalVisible(true);
        fetchFaculty();
      } else {
        Alert.alert('Error Creating Staff', res.message || 'Failed to create staff member.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create staff account.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDetails = (faculty: any) => {
    setSelectedFaculty(faculty);
    setDetailsModalVisible(true);
  };

  const handleOpenEdit = (faculty: any) => {
    setSelectedFaculty(faculty);
    setEditFullName(faculty.fullName || '');
    setEditDepartmentId(faculty.departmentId?._id || faculty.departmentId || '');
    setEditDesignation(faculty.designation || 'Assistant Professor');
    setEditQualification(faculty.qualification || '');
    setEditDob(faculty.dob ? new Date(faculty.dob).toISOString().split('T')[0] : '');
    setEditPhone(faculty.phone || '');
    setEditEmail(faculty.email || '');
    setEditAddress(faculty.address || '');
    setEditSpecialization(faculty.specialization || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedFaculty) return;
    if (!editFullName.trim()) {
      Alert.alert('Required Field', 'Please enter staff full name.');
      return;
    }

    setActionLoading(true);
    try {
      const payload: any = {
        fullName: editFullName.trim(),
        departmentId: editDepartmentId,
        designation: editDesignation.trim(),
        qualification: editQualification.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim().toLowerCase(),
        address: editAddress.trim(),
        specialization: editSpecialization.trim(),
      };
      if (editDob.trim()) payload.dob = editDob.trim();

      const res = await api.patch(`/admin/faculty/${selectedFaculty._id}`, payload);
      if (res.success) {
        Alert.alert('Success', 'Staff details updated successfully.');
        setEditModalVisible(false);
        fetchFaculty();
      } else {
        Alert.alert('Error', res.message || 'Failed to update staff details.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Update failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenAssign = (faculty: any) => {
    setSelectedFaculty(faculty);
    setAssignmentsList(faculty.assignedClasses ? [...faculty.assignedClasses] : []);
    if (departments.length > 0) {
      setAssignDeptId(faculty.departmentId?._id || departments[0]._id);
    }
    setAssignSemester(1);
    setAssignSection('A');
    setAssignSubjectId('');
    setAssignModalVisible(true);
  };

  const handleAddAssignment = () => {
    if (!assignDeptId) {
      Alert.alert('Select Department', 'Please select department for the assignment.');
      return;
    }
    if (!assignSubjectId) {
      Alert.alert('Select Subject', 'Please select the subject to assign.');
      return;
    }

    const selectedSub = subjects.find((s) => s._id === assignSubjectId);
    const selectedDept = departments.find((d) => d._id === assignDeptId);

    const isAlreadyAssigned = assignmentsList.some(
      (a) =>
        (a.subjectId?._id || a.subjectId) === assignSubjectId &&
        a.semester === assignSemester &&
        a.section === assignSection
    );

    if (isAlreadyAssigned) {
      Alert.alert('Duplicate Assignment', 'This subject, semester, and section are already assigned to this staff member.');
      return;
    }

    const newAssignment = {
      departmentId: selectedDept || assignDeptId,
      semester: assignSemester,
      section: assignSection,
      subjectId: selectedSub || assignSubjectId,
    };

    setAssignmentsList([...assignmentsList, newAssignment]);
  };

  const handleRemoveAssignment = (index: number) => {
    const updated = [...assignmentsList];
    updated.splice(index, 1);
    setAssignmentsList(updated);
  };

  const handleSaveAssignments = async () => {
    if (!selectedFaculty) return;
    setActionLoading(true);
    try {
      const formatted = assignmentsList.map((a) => ({
        departmentId: a.departmentId?._id || a.departmentId,
        semester: a.semester,
        section: a.section,
        subjectId: a.subjectId?._id || a.subjectId,
      }));

      const res = await api.patch(`/admin/faculty/${selectedFaculty._id}/assignments`, {
        assignedClasses: formatted,
      });

      if (res.success) {
        Alert.alert('Success', 'Classes and subjects assigned successfully.');
        setAssignModalVisible(false);
        fetchFaculty();
      } else {
        Alert.alert('Error', res.message || 'Failed to save class assignments.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Assignment failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (faculty: any) => {
    const currentStatus = faculty.userId?.status || 'ACTIVE';
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    Alert.alert(
      'Confirm Status Change',
      `Are you sure you want to change account status for ${faculty.fullName} to ${nextStatus}?\n\n${
        nextStatus === 'SUSPENDED'
          ? 'The staff member will not be able to log in or take attendance.'
          : 'The staff member will be granted portal access.'
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await api.patch(`/admin/users/${faculty.userId?._id}/status`, {
                status: nextStatus,
              });
              if (res.success) {
                Alert.alert('Success', `Account status updated to ${nextStatus}.`);
                fetchFaculty();
              } else {
                Alert.alert('Error', res.message || 'Status update failed.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleResetPassword = async (faculty: any) => {
    Alert.alert(
      'Reset Staff Password',
      `Generate a new secure temporary password for ${faculty.fullName}?\n\nThey will be required to change their password at next login.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Password',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await api.post(`/admin/faculty/${faculty._id}/reset-password`, {});
              if (res.success && res.data) {
                setCreatedCredentials({
                  staffName: faculty.fullName,
                  staffId: faculty.employeeId,
                  temporaryPassword: res.data.temporaryPassword,
                });
                setShowPasswordText(false);
                setCredentialsModalVisible(true);
              } else {
                Alert.alert('Error', res.message || 'Password reset failed.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Password reset failed.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleArchiveStaff = (faculty: any) => {
    Alert.alert(
      'Archive Staff Record',
      `Are you sure you want to archive ${faculty.fullName} (${faculty.employeeId})?\n\nHistorical attendance records and internal marks will remain fully intact.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await api.delete(`/admin/faculty/${faculty._id}?confirm=true`, {
                body: JSON.stringify({ reason: 'Administrative separation / archival' }),
              });
              if (res.success) {
                Alert.alert('Success', 'Staff record safely archived with historical sessions preserved.');
                fetchFaculty();
              } else {
                Alert.alert('Error', res.message || 'Failed to archive staff.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Archival failed.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const filteredFaculty = facultyList.filter((f) => {
    const status = f.userId?.status || 'ACTIVE';
    if (statusFilter !== 'ALL' && status !== statusFilter) return false;

    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      f.fullName?.toLowerCase().includes(query) ||
      f.employeeId?.toLowerCase().includes(query) ||
      f.departmentId?.name?.toLowerCase().includes(query) ||
      f.designation?.toLowerCase().includes(query)
    );
  });

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Staff & Faculty Management"
        subtitle="Government Arts & Science College, Kuthalam"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        {/* Top Action Bar */}
        <View style={styles.topBar}>
          <Button
            title="+ Add New Staff Member"
            variant="primary"
            icon="person-add-outline"
            onPress={openAddStaffModal}
            style={styles.addBtn}
          />
        </View>

        {/* Search Input */}
        <Input
          placeholder="Search by name, Staff ID, department, designation..."
          value={search}
          onChangeText={setSearch}
          leftIcon="search-outline"
        />

        {/* Status Filter Chips */}
        <View style={styles.filterChipRow}>
          {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, statusFilter === filter && styles.filterChipTextActive]}>
                {filter === 'ALL' ? 'All Staff' : filter === 'ACTIVE' ? 'Active' : 'Suspended'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Count Bar */}
        <View style={styles.countRow}>
          <Ionicons name="people-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.countText}>
            Enrolled Staff Members ({filteredFaculty.length} of {facultyList.length})
          </Text>
        </View>

        {/* Loading Skeletons */}
        {loading ? (
          <StaffRosterSkeleton count={4} />
        ) : error && facultyList.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="cloud-offline-outline" size={44} color={theme.colors.error} />
            <Text style={[styles.loadingText, { color: theme.colors.error, marginVertical: 10 }]}>{error}</Text>
            <Button
              title="Retry Roster"
              onPress={() => {
                setLoading(true);
                fetchFaculty();
              }}
              variant="outline"
            />
          </View>
        ) : filteredFaculty.length === 0 ? (
          <EmptyState
            title="No Staff Found"
            description="No staff members match the provided search criteria."
            icon="people-outline"
          />
        ) : (
          filteredFaculty.map((item: any) => {
            const status = item.userId?.status || 'ACTIVE';
            const isActive = status === 'ACTIVE';
            const mustChange = item.userId?.mustChangePassword;

            return (
              <Card key={item._id} style={styles.facultyCard} variant="outlined">
                <View style={styles.facultyHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.fullName ? item.fullName.substring(0, 2).toUpperCase() : 'ST'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.facultyName} numberOfLines={2}>
                        {item.fullName}
                      </Text>
                      <Badge label={status} type={isActive ? 'success' : 'error'} size="small" />
                    </View>
                    <Text style={styles.facultyDesignation} numberOfLines={1}>
                      {item.designation || 'Assistant Professor'} • {item.qualification || 'M.Sc.'}
                    </Text>
                    <Text style={styles.facultyDept} numberOfLines={1}>
                      Staff ID: <Text style={styles.boldText}>{item.employeeId}</Text> •{' '}
                      {item.departmentId?.name || 'Department'}
                    </Text>
                  </View>
                </View>

                {mustChange && (
                  <View style={styles.tempPassBanner}>
                    <Ionicons name="information-circle-outline" size={14} color="#C88308" />
                    <Text style={styles.tempPassText}>Initial Temporary Password Active</Text>
                  </View>
                )}

                <View style={styles.contactRow}>
                  <View style={styles.contactItem}>
                    <Ionicons name="mail-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.contactText} numberOfLines={1}>
                      {item.userId?.email || item.email || 'staff@gasc.edu.in'}
                    </Text>
                  </View>
                  {item.phone ? (
                    <View style={styles.contactItem}>
                      <Ionicons name="call-outline" size={14} color={theme.colors.textSecondary} />
                      <Text style={styles.contactText}>{item.phone}</Text>
                    </View>
                  ) : null}
                </View>

                {item.address ? (
                  <View style={styles.contactItem}>
                    <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.contactText} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                ) : null}

                {item.assignedClasses && item.assignedClasses.length > 0 && (
                  <View style={styles.allocationBox}>
                    <Text style={styles.allocationLabel} numberOfLines={2}>
                      Assigned:{' '}
                      {item.assignedClasses
                        .map(
                          (ac: any) =>
                            `${ac.subjectId?.title || ac.subjectId?.name || 'Subject'} (Sem ${ac.semester} - Sec ${ac.section})`
                        )
                        .join(', ')}
                    </Text>
                  </View>
                )}

                {/* Primary Card Actions */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.cardActionBtn}
                    onPress={() => handleOpenDetails(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="eye-outline" size={14} color={theme.colors.primary} />
                    <Text style={styles.cardActionBtnText}>View</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cardActionBtn}
                    onPress={() => handleOpenEdit(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
                    <Text style={styles.cardActionBtnText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cardActionBtn}
                    onPress={() => handleOpenAssign(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="book-outline" size={14} color={theme.colors.primary} />
                    <Text style={styles.cardActionBtnText}>Assign Classes</Text>
                  </TouchableOpacity>
                </View>

                {/* Secondary Card Actions */}
                <View style={styles.actionRow}>
                  <Button
                    title="Reset Password"
                    variant="outline"
                    size="small"
                    icon="key-outline"
                    onPress={() => handleResetPassword(item)}
                    style={styles.actionBtnLeft}
                  />
                  <Button
                    title={isActive ? 'Suspend' : 'Activate'}
                    variant={isActive ? 'danger' : 'secondary'}
                    size="small"
                    icon={isActive ? 'lock-closed-outline' : 'checkmark-circle-outline'}
                    onPress={() => handleToggleStatus(item)}
                    style={styles.actionBtnRight}
                  />
                  <TouchableOpacity
                    style={styles.archiveIconBtn}
                    onPress={() => handleArchiveStaff(item)}
                    activeOpacity={0.7}
                    accessibilityLabel="Archive staff member"
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Global Activity Spinner */}
      {actionLoading && <LoadingSpinner fullScreen message="Processing staff request..." />}

      {/* MODAL 1: ADD STAFF */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Staff Member</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-outline" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Input
                label="Full Name *"
                placeholder="e.g. Dr. K. Ramanathan"
                value={addFullName}
                onChangeText={setAddFullName}
                leftIcon="person-outline"
              />

              {/* Staff ID Options */}
              <View style={styles.idChoiceBox}>
                <View style={styles.choiceHeaderRow}>
                  <Text style={styles.fieldLabel}>Staff ID *</Text>
                  <TouchableOpacity
                    style={[styles.togglePill, autoGenId && styles.togglePillActive]}
                    onPress={() => {
                      const next = !autoGenId;
                      setAutoGenId(next);
                      if (next) handleFetchNextStaffId();
                    }}
                  >
                    <Ionicons
                      name={autoGenId ? 'checkbox-outline' : 'square-outline'}
                      size={16}
                      color={autoGenId ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={[styles.togglePillText, autoGenId && styles.togglePillTextActive]}>
                      Auto-generate ID
                    </Text>
                  </TouchableOpacity>
                </View>

                {autoGenId ? (
                  <View style={styles.autoIdNotice}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.autoIdNoticeText}>
                      Next Available ID: <Text style={styles.boldText}>{addStaffId || 'GASCK-STF-001'}</Text>
                    </Text>
                  </View>
                ) : (
                  <Input
                    placeholder="e.g. GASCK-STF-001"
                    value={addStaffId}
                    onChangeText={setAddStaffId}
                    autoCapitalize="characters"
                    leftIcon="card-outline"
                  />
                )}
              </View>

              {/* Department Picker */}
              <Text style={styles.fieldLabel}>Department *</Text>
              <View style={styles.deptChipsContainer}>
                {departments.map((dept) => (
                  <TouchableOpacity
                    key={dept._id}
                    style={[styles.deptChip, addDepartmentId === dept._id && styles.deptChipActive]}
                    onPress={() => setAddDepartmentId(dept._id)}
                  >
                    <Text style={[styles.deptChipText, addDepartmentId === dept._id && styles.deptChipTextActive]}>
                      {dept.code} ({dept.name})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Designation *"
                placeholder="e.g. Assistant Professor, Associate Professor"
                value={addDesignation}
                onChangeText={setAddDesignation}
                leftIcon="briefcase-outline"
              />

              <Input
                label="Qualification *"
                placeholder="e.g. M.Sc., M.Phil., Ph.D., NET/SET"
                value={addQualification}
                onChangeText={setAddQualification}
                leftIcon="school-outline"
              />

              <Input
                label="Date of Birth (YYYY-MM-DD)"
                placeholder="e.g. 1985-05-15"
                value={addDob}
                onChangeText={setAddDob}
                leftIcon="calendar-outline"
              />

              <Input
                label="Mobile Number *"
                placeholder="e.g. 9876543210"
                value={addPhone}
                onChangeText={setAddPhone}
                keyboardType="phone-pad"
                leftIcon="call-outline"
              />

              <Input
                label="Institutional Email *"
                placeholder="e.g. staff.member@gasc.edu.in"
                value={addEmail}
                onChangeText={setAddEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="mail-outline"
              />

              <Input
                label="Residential Address"
                placeholder="e.g. 12, Sannathi Street, Kuthalam"
                value={addAddress}
                onChangeText={setAddAddress}
                leftIcon="location-outline"
              />

              <Input
                label="Subject Specialization"
                placeholder="e.g. Data Structures, Tamil Literature"
                value={addSpecialization}
                onChangeText={setAddSpecialization}
                leftIcon="ribbon-outline"
              />

              {/* Initial Password Section */}
              <View style={styles.passwordSection}>
                <Text style={styles.fieldLabel}>Initial Account Password</Text>
                <View style={styles.passwordModeRow}>
                  <TouchableOpacity
                    style={[styles.modeBtn, addPasswordMode === 'AUTO' && styles.modeBtnActive]}
                    onPress={() => setAddPasswordMode('AUTO')}
                  >
                    <Text style={[styles.modeBtnText, addPasswordMode === 'AUTO' && styles.modeBtnTextActive]}>
                      Auto-generate Temp Password
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeBtn, addPasswordMode === 'CUSTOM' && styles.modeBtnActive]}
                    onPress={() => setAddPasswordMode('CUSTOM')}
                  >
                    <Text style={[styles.modeBtnText, addPasswordMode === 'CUSTOM' && styles.modeBtnTextActive]}>
                      Set Custom Password
                    </Text>
                  </TouchableOpacity>
                </View>

                {addPasswordMode === 'CUSTOM' ? (
                  <View style={{ marginTop: 8 }}>
                    <Input
                      placeholder="Minimum 8 chars (upper, lower, digit/special)"
                      value={addCustomPassword}
                      onChangeText={setAddCustomPassword}
                      isPassword
                      leftIcon="lock-closed-outline"
                    />
                    <Text style={styles.passwordHint}>
                      Password must contain at least 8 characters with uppercase, lowercase, and numbers.
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.passwordHint}>
                    A secure, random temporary password will be generated and displayed once upon account creation.
                  </Text>
                )}
              </View>

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setAddModalVisible(false)}
                  style={{ flex: 1, marginRight: 6 }}
                />
                <Button
                  title="Create Staff Account"
                  variant="primary"
                  onPress={handleCreateStaff}
                  loading={actionLoading}
                  style={{ flex: 2, marginLeft: 6 }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 2: CREDENTIALS CREATED DISPLAY (ONE-TIME SECURE VIEW) */}
      <Modal visible={credentialsModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '75%' }]}>
            <View style={styles.credSuccessHeader}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-circle" size={40} color={theme.colors.success} />
              </View>
              <Text style={styles.credTitle}>Staff Account Initialized!</Text>
              <Text style={styles.credSubtitle}>
                Account has been securely generated. Please record and share these initial credentials securely.
              </Text>
            </View>

            <View style={styles.credBox}>
              <View style={styles.credItemRow}>
                <Text style={styles.credLabel}>Staff Name:</Text>
                <Text style={styles.credValue}>{createdCredentials?.staffName}</Text>
              </View>

              <View style={styles.credItemRow}>
                <Text style={styles.credLabel}>Staff ID (Login):</Text>
                <Text style={[styles.credValue, styles.boldText, { color: theme.colors.primary }]}>
                  {createdCredentials?.staffId}
                </Text>
              </View>

              <View style={styles.credItemRow}>
                <Text style={styles.credLabel}>Temporary Password:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.credValue, styles.boldText, { fontFamily: 'monospace' }]}>
                    {showPasswordText
                      ? createdCredentials?.temporaryPassword
                      : '••••••••••••'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowPasswordText(!showPasswordText)}
                    style={{ marginLeft: 8 }}
                  >
                    <Ionicons
                      name={showPasswordText ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.mandatoryChangeAlert}>
              <Ionicons name="shield-outline" size={18} color="#C88308" style={{ marginRight: 8 }} />
              <Text style={styles.mandatoryChangeText}>
                The staff member will be required to change this temporary password upon their first login to access the collegiate portal.
              </Text>
            </View>

            <Button
              title="I Have Securely Shared Credentials"
              variant="primary"
              onPress={() => {
                setCredentialsModalVisible(false);
                setCreatedCredentials(null);
              }}
              style={{ marginTop: 14 }}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL 3: VIEW STAFF DETAILS */}
      <Modal visible={detailsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Staff Member Profile</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <Ionicons name="close-outline" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {selectedFaculty ? (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.profileHeaderBox}>
                  <View style={styles.avatarLarge}>
                    <Text style={styles.avatarLargeText}>
                      {selectedFaculty.fullName?.substring(0, 2).toUpperCase() || 'ST'}
                    </Text>
                  </View>
                  <Text style={styles.profileName}>{selectedFaculty.fullName}</Text>
                  <Text style={styles.profileDesignation}>
                    {selectedFaculty.designation} • {selectedFaculty.qualification}
                  </Text>
                  <View style={{ marginTop: 6 }}>
                    <Badge
                      label={selectedFaculty.userId?.status || 'ACTIVE'}
                      type={(selectedFaculty.userId?.status || 'ACTIVE') === 'ACTIVE' ? 'success' : 'error'}
                    />
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionHeading}>Institutional Data</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Staff ID:</Text>
                    <Text style={styles.detailVal}>{selectedFaculty.employeeId}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Department:</Text>
                    <Text style={styles.detailVal}>{selectedFaculty.departmentId?.name || 'Department'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Date of Birth:</Text>
                    <Text style={styles.detailVal}>
                      {selectedFaculty.dob ? new Date(selectedFaculty.dob).toLocaleDateString() : 'Not recorded'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Specialization:</Text>
                    <Text style={styles.detailVal}>{selectedFaculty.specialization || 'General Faculty'}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionHeading}>Contact Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Email:</Text>
                    <Text style={styles.detailVal}>{selectedFaculty.email}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Mobile Number:</Text>
                    <Text style={styles.detailVal}>{selectedFaculty.phone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Address:</Text>
                    <Text style={styles.detailVal}>{selectedFaculty.address || 'Kuthalam, Mayiladuthurai'}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionHeading}>Assigned Classes & Subjects</Text>
                  {selectedFaculty.assignedClasses && selectedFaculty.assignedClasses.length > 0 ? (
                    selectedFaculty.assignedClasses.map((ac: any, idx: number) => (
                      <View key={idx} style={styles.assignedClassChip}>
                        <Ionicons name="book-outline" size={14} color={theme.colors.primary} />
                        <Text style={styles.assignedClassChipText}>
                          {ac.subjectId?.title || ac.subjectId?.name || 'Subject'} • Sem {ac.semester} (Sec {ac.section})
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyClassText}>No subjects currently assigned to this staff member.</Text>
                  )}
                </View>
              </ScrollView>
            ) : (
              <StaffDetailsSkeleton />
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 4: EDIT STAFF DETAILS */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Staff Details</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close-outline" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Input
                label="Full Name *"
                value={editFullName}
                onChangeText={setEditFullName}
                leftIcon="person-outline"
              />

              <Text style={styles.fieldLabel}>Department *</Text>
              <View style={styles.deptChipsContainer}>
                {departments.map((dept) => (
                  <TouchableOpacity
                    key={dept._id}
                    style={[styles.deptChip, editDepartmentId === dept._id && styles.deptChipActive]}
                    onPress={() => setEditDepartmentId(dept._id)}
                  >
                    <Text style={[styles.deptChipText, editDepartmentId === dept._id && styles.deptChipTextActive]}>
                      {dept.code} ({dept.name})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Designation *"
                value={editDesignation}
                onChangeText={setEditDesignation}
                leftIcon="briefcase-outline"
              />

              <Input
                label="Qualification *"
                value={editQualification}
                onChangeText={setEditQualification}
                leftIcon="school-outline"
              />

              <Input
                label="Date of Birth (YYYY-MM-DD)"
                value={editDob}
                onChangeText={setEditDob}
                leftIcon="calendar-outline"
              />

              <Input
                label="Mobile Number *"
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                leftIcon="call-outline"
              />

              <Input
                label="Email Address *"
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="mail-outline"
              />

              <Input
                label="Residential Address"
                value={editAddress}
                onChangeText={setEditAddress}
                leftIcon="location-outline"
              />

              <Input
                label="Subject Specialization"
                value={editSpecialization}
                onChangeText={setEditSpecialization}
                leftIcon="ribbon-outline"
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setEditModalVisible(false)}
                  style={{ flex: 1, marginRight: 6 }}
                />
                <Button
                  title="Save Changes"
                  variant="primary"
                  onPress={handleSaveEdit}
                  loading={actionLoading}
                  style={{ flex: 2, marginLeft: 6 }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 5: ASSIGN COURSES, CLASSES & SUBJECTS */}
      <Modal visible={assignModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Class & Subject Assignments</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <Ionicons name="close-outline" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalSubtitle}>
                Assign curriculum subjects to {selectedFaculty?.fullName} ({selectedFaculty?.employeeId}).
              </Text>

              {/* Current Assignments List */}
              <Text style={styles.sectionHeading}>Current Portfolio ({assignmentsList.length})</Text>
              {assignmentsList.length === 0 ? (
                <Text style={styles.emptyClassText}>No subjects currently allocated.</Text>
              ) : (
                assignmentsList.map((item, index) => {
                  const subTitle = item.subjectId?.title || item.subjectId?.name || 'Subject';
                  const deptCode = item.departmentId?.code || 'Dept';
                  return (
                    <View key={index} style={styles.assignmentItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.assignmentItemTitle}>{subTitle}</Text>
                        <Text style={styles.assignmentItemMeta}>
                          {deptCode} • Semester {item.semester} • Section {item.section}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveAssignment(index)}
                        style={styles.removeAssignmentBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}

              {/* Add New Assignment Form Box */}
              <View style={styles.addAssignBox}>
                <Text style={styles.addAssignBoxTitle}>Add Subject Allocation</Text>

                <Text style={styles.fieldLabel}>Department</Text>
                <View style={styles.deptChipsContainer}>
                  {departments.map((dept) => (
                    <TouchableOpacity
                      key={dept._id}
                      style={[styles.deptChip, assignDeptId === dept._id && styles.deptChipActive]}
                      onPress={() => {
                        setAssignDeptId(dept._id);
                        setAssignSubjectId('');
                      }}
                    >
                      <Text style={[styles.deptChipText, assignDeptId === dept._id && styles.deptChipTextActive]}>
                        {dept.code}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Semester Selector */}
                <Text style={styles.fieldLabel}>Semester (1 - 6)</Text>
                <View style={styles.filterChipRow}>
                  {[1, 2, 3, 4, 5, 6].map((sem) => (
                    <TouchableOpacity
                      key={sem}
                      style={[styles.semChip, assignSemester === sem && styles.semChipActive]}
                      onPress={() => setAssignSemester(sem)}
                    >
                      <Text style={[styles.semChipText, assignSemester === sem && styles.semChipTextActive]}>
                        Sem {sem}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Section Selector */}
                <Text style={styles.fieldLabel}>Section</Text>
                <View style={styles.filterChipRow}>
                  {['A', 'B'].map((sec) => (
                    <TouchableOpacity
                      key={sec}
                      style={[styles.semChip, assignSection === sec && styles.semChipActive]}
                      onPress={() => setAssignSection(sec)}
                    >
                      <Text style={[styles.semChipText, assignSection === sec && styles.semChipTextActive]}>
                        Sec {sec}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Subject Picker */}
                <Text style={styles.fieldLabel}>Curriculum Subject *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                  {subjects
                    .filter((s) => !assignDeptId || (s.departmentId?._id || s.departmentId) === assignDeptId)
                    .map((sub) => (
                      <TouchableOpacity
                        key={sub._id}
                        style={[styles.subjectChip, assignSubjectId === sub._id && styles.subjectChipActive]}
                        onPress={() => setAssignSubjectId(sub._id)}
                      >
                        <Text
                          style={[
                            styles.subjectChipText,
                            assignSubjectId === sub._id && styles.subjectChipTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {sub.code} - {sub.title || sub.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>

                <Button
                  title="+ Allocate Subject"
                  variant="outline"
                  size="small"
                  onPress={handleAddAssignment}
                  style={{ marginTop: 8 }}
                />
              </View>

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setAssignModalVisible(false)}
                  style={{ flex: 1, marginRight: 6 }}
                />
                <Button
                  title="Save Portfolio"
                  variant="primary"
                  onPress={handleSaveAssignments}
                  loading={actionLoading}
                  style={{ flex: 2, marginLeft: 6 }}
                />
              </View>
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
    paddingBottom: 40,
  },
  topBar: {
    marginBottom: 12,
  },
  addBtn: {
    width: '100%',
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: theme.typography.families.primaryBold,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
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
  facultyCard: {
    padding: 14,
    marginBottom: 12,
  },
  facultyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.tint,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 16,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  facultyName: {
    flex: 1,
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  facultyDesignation: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 1,
  },
  facultyDept: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  boldText: {
    fontFamily: theme.typography.families.primaryBold,
  },
  tempPassBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginVertical: 4,
    gap: 6,
  },
  tempPassText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: '#C88308',
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  allocationBox: {
    backgroundColor: theme.colors.tint,
    padding: 8,
    borderRadius: theme.borderRadius.sm,
    marginVertical: 6,
  },
  allocationLabel: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.primary,
  },
  cardActionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: 8,
    marginTop: 6,
    gap: 8,
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F6F0',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 6,
    gap: 4,
    minHeight: 36,
  },
  cardActionBtnText: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 11,
    color: theme.colors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
    gap: 6,
  },
  actionBtnLeft: {
    flex: 1,
  },
  actionBtnRight: {
    flex: 1,
  },
  archiveIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingBottom: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 17,
    color: theme.colors.text,
  },
  modalSubtitle: {
    fontFamily: theme.typography.families.primary,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  modalScroll: {
    maxHeight: 500,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: theme.typography.families.primarySemiBold,
    fontSize: 12,
    color: theme.colors.text,
    marginBottom: 6,
    marginTop: 4,
  },
  idChoiceBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
  },
  choiceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  togglePillActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.tint,
  },
  togglePillText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  togglePillTextActive: {
    color: theme.colors.primary,
    fontFamily: theme.typography.families.primaryBold,
  },
  autoIdNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
  },
  autoIdNoticeText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.primary,
  },
  deptChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  deptChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  deptChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  deptChipText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  deptChipTextActive: {
    color: '#FFFFFF',
    fontFamily: theme.typography.families.primaryBold,
  },
  passwordSection: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: 8,
  },
  passwordModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  modeBtnText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
    fontFamily: theme.typography.families.primaryBold,
  },
  passwordHint: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  // Credentials Created Modal Styles
  credSuccessHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  successIconCircle: {
    marginBottom: 8,
  },
  credTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 18,
    color: theme.colors.primary,
  },
  credSubtitle: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  credBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  credItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  credLabel: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  credValue: {
    fontFamily: theme.typography.families.primarySemiBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  mandatoryChangeAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  mandatoryChangeText: {
    flex: 1,
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: '#8D6E63',
  },
  // Profile Details Modal
  profileHeaderBox: {
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarLargeText: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 22,
    color: theme.colors.primary,
  },
  profileName: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 16,
    color: theme.colors.text,
  },
  profileDesignation: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  detailSection: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  detailSectionHeading: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 13,
    color: theme.colors.primary,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailKey: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  detailVal: {
    fontFamily: theme.typography.families.primarySemiBold,
    fontSize: 12,
    color: theme.colors.text,
    maxWidth: '65%',
    textAlign: 'right',
  },
  assignedClassChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.tint,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginVertical: 3,
  },
  assignedClassChipText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.primary,
  },
  emptyClassText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  // Class Assignment Styles
  sectionHeading: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 14,
    color: theme.colors.text,
    marginTop: 6,
    marginBottom: 6,
  },
  assignmentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
  },
  assignmentItemTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 13,
    color: theme.colors.text,
  },
  assignmentItemMeta: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  removeAssignmentBtn: {
    padding: 6,
  },
  addAssignBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  addAssignBoxTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 13,
    color: theme.colors.primary,
    marginBottom: 6,
  },
  semChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  semChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  semChipText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  semChipTextActive: {
    color: '#FFFFFF',
    fontFamily: theme.typography.families.primaryBold,
  },
  subjectChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
  },
  subjectChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  subjectChipText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  subjectChipTextActive: {
    color: '#FFFFFF',
    fontFamily: theme.typography.families.primaryBold,
  },
});
