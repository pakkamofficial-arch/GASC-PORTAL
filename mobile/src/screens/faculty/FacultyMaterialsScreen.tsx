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
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import { EmptyState } from '../../components/EmptyState';
import { MaterialsSkeleton } from '../../components/skeleton';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const FacultyMaterialsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'LIST' | 'UPLOAD'>('LIST');
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Upload state
  const [title, setTitle] = useState('');
  const [unitOrTopic, setUnitOrTopic] = useState('');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [selectedClassIdx, setSelectedClassIdx] = useState(0);
  const [uploading, setUploading] = useState(false);

  const assignedClasses = profile?.assignedClasses || [];
  const currentAssignedClass = assignedClasses[selectedClassIdx];

  const fetchMaterials = async () => {
    try {
      setError(null);
      const res = await api.get('/materials');
      if (res.success && res.data) {
        setMaterials(res.data.materials || []);
      } else {
        setError(res.message || 'Unable to retrieve faculty materials repository.');
      }
    } catch (err: any) {
      console.log('Error fetching materials:', err);
      setError(err.message || 'Network error fetching materials repository.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMaterials();
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Please provide a title for the study material.');
      return;
    }
    if (!currentAssignedClass) {
      Alert.alert('Validation', 'Please select a teaching allocation class.');
      return;
    }

    const resolvedFileName = fileName.trim() || `${title.trim().toLowerCase().replace(/\s+/g, '-')}.pdf`;
    const resolvedUrl = fileUrl.trim() || `https://gasc-repo.internal/materials/${Date.now()}_${resolvedFileName}`;

    setUploading(true);
    try {
      const deptId = currentAssignedClass.departmentId._id || currentAssignedClass.departmentId;
      const subId = currentAssignedClass.subjectId._id || currentAssignedClass.subjectId;

      const payload = {
        title: title.trim(),
        description: description.trim(),
        departmentId: deptId,
        semester: Number(currentAssignedClass.semester),
        subjectId: subId,
        unitOrTopic: unitOrTopic.trim() || 'General Unit',
        fileName: resolvedFileName,
        fileUrl: resolvedUrl,
        fileSize: 2048576, // 2 MB
      };

      const res = await api.post('/materials', payload);
      if (res.success) {
        Alert.alert('Success', 'Study material uploaded and made available to students.');
        setTitle('');
        setUnitOrTopic('');
        setDescription('');
        setFileName('');
        setFileUrl('');
        setActiveTab('LIST');
        fetchMaterials();
      } else {
        Alert.alert('Failed', res.message || 'Could not upload study material.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to publish study material.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (materialId: string, titleStr: string) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to remove "${titleStr}"? Students will no longer be able to download it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.delete(`/materials/${materialId}`);
              if (res.success) {
                Alert.alert('Deleted', 'Material removed successfully.');
                fetchMaterials();
              } else {
                Alert.alert('Error', res.message || 'Failed to delete material.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete material.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Study Materials & Notes"
        subtitle="Department Repository • GASC Kuthalam"
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'LIST' && styles.tabItemActive]}
          onPress={() => setActiveTab('LIST')}
        >
          <Ionicons
            name="library-outline"
            size={16}
            color={activeTab === 'LIST' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'LIST' && styles.tabTextActive]}>
            Published Notes ({materials.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'UPLOAD' && styles.tabItemActive]}
          onPress={() => setActiveTab('UPLOAD')}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={16}
            color={activeTab === 'UPLOAD' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'UPLOAD' && styles.tabTextActive]}>
            Upload Material
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {activeTab === 'LIST' ? (
          loading ? (
            <MaterialsSkeleton count={4} />
          ) : error && materials.length === 0 ? (
            <View style={styles.centerBox}>
              <Ionicons name="cloud-offline-outline" size={44} color={theme.colors.error} />
              <Text style={[styles.loadingText, { color: theme.colors.error, marginVertical: 10 }]}>{error}</Text>
              <Button title="Retry Repository" onPress={() => { setLoading(true); fetchMaterials(); }} variant="outline" />
            </View>
          ) : materials.length === 0 ? (
            <EmptyState
              title="No Study Materials Yet"
              message="Upload lecture notes, unit guides, and reference material for your enrolled batches."
              icon="folder-open-outline"
              actionLabel="Upload First Material"
              onAction={() => setActiveTab('UPLOAD')}
            />
          ) : (
            materials.map((item: any) => (
              <Card key={item._id} style={styles.materialCard} variant="outlined">
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.materialTitle}>{item.title}</Text>
                    <Text style={styles.subjectMeta}>
                      {item.subjectId?.title || 'Subject'} • {item.unitOrTopic || 'Unit'} • Sem {item.semester}
                    </Text>
                  </View>
                  <Badge label="OFFICIAL" type="success" size="small" />
                </View>

                {item.description ? (
                  <Text style={styles.descText} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                <View style={styles.fileRow}>
                  <View style={styles.fileIconBox}>
                    <Ionicons name="document-text" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileNameText} numberOfLines={1}>
                      {item.fileName || 'Lecture_Notes.pdf'}
                    </Text>
                    <Text style={styles.fileSizeText}>
                      {(item.fileSize / (1024 * 1024)).toFixed(1)} MB • Uploaded {new Date(item.createdAt).toLocaleDateString('en-IN')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item._id, item.title)}
                    accessibilityLabel="Delete material"
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )
        ) : (
          /* UPLOAD TAB */
          <Card style={styles.formCard} variant="outlined">
            <Text style={styles.formTitle}>Publish Syllabus Material</Text>
            <Text style={styles.formSubtitle}>
              Make lecture notes, question banks, or reference guides available to students.
            </Text>

            {/* Teaching Allocation Selector */}
            <Text style={styles.fieldLabel}>Select Subject & Semester *</Text>
            {assignedClasses.length === 0 ? (
              <Text style={styles.warningText}>No classes currently allocated to your profile.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classScroll}>
                {assignedClasses.map((ac: any, idx: number) => {
                  const isSelected = selectedClassIdx === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.classChip, isSelected && styles.classChipSelected]}
                      onPress={() => setSelectedClassIdx(idx)}
                    >
                      <Text style={[styles.classChipTitle, isSelected && styles.classChipTitleSelected]}>
                        {ac.subjectId?.title || 'Subject'}
                      </Text>
                      <Text style={[styles.classChipSub, isSelected && styles.classChipSubSelected]}>
                        Sem {ac.semester} • {ac.departmentId?.code}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <Input
              label="Material Title *"
              placeholder="e.g. Unit 3: Normalization & Relational Algebra"
              value={title}
              onChangeText={setTitle}
            />

            <Input
              label="Unit / Chapter / Topic"
              placeholder="e.g. Unit 3 or Module 2"
              value={unitOrTopic}
              onChangeText={setUnitOrTopic}
            />

            <Input
              label="Description / Summary"
              placeholder="Key concepts covered, textbook references, sample exam questions..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <Input
              label="File Name"
              placeholder="e.g. DBMS_Unit3_LectureNotes.pdf"
              value={fileName}
              onChangeText={setFileName}
            />

            <Input
              label="Resource Document URL (Optional / Storage Link)"
              placeholder="https://... (or leave empty for internal repository)"
              value={fileUrl}
              onChangeText={setFileUrl}
            />

            <Button
              title="Publish Study Material"
              variant="primary"
              icon="cloud-upload-outline"
              loading={uploading}
              onPress={handleUpload}
              style={{ marginTop: 12 }}
            />
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
    paddingVertical: 6,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    marginHorizontal: 4,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: theme.colors.tint,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    fontFamily: theme.typography.families.primaryBold,
    color: theme.colors.primary,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: 36,
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
  materialCard: {
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  materialTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  subjectMeta: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  descText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18,
    marginVertical: 4,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.tint,
    padding: 10,
    borderRadius: theme.borderRadius.sm,
    marginTop: 8,
  },
  fileIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  fileNameText: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.text,
  },
  fileSizeText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
  },
  formCard: {
    padding: 14,
  },
  formTitle: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 2,
  },
  formSubtitle: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  fieldLabel: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 6,
  },
  classScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  classChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  classChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.tint,
  },
  classChipTitle: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.text,
  },
  classChipTitleSelected: {
    color: theme.colors.primary,
    fontFamily: theme.typography.families.primaryBold,
  },
  classChipSub: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  classChipSubSelected: {
    color: theme.colors.primary,
  },
  warningText: {
    fontFamily: theme.typography.families.primary,
    fontSize: 12,
    color: theme.colors.warning,
    marginBottom: 10,
  },
});
