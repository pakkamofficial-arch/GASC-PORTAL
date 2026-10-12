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
import { Header, Card, Badge, Button, Input, SectionHeader, EmptyState } from '../../components';

export const AdminTemplatesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [templates, setTemplates] = useState<any[]>([]);

  // Edit / Preview Modal
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateTitle, setTemplateTitle] = useState<string>('');
  const [templateContent, setTemplateContent] = useState<string>('');
  const [signatoryTitle, setSignatoryTitle] = useState<string>('');
  const [signatoryName, setSignatoryName] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get('/admin/templates');
      if (res.success && res.data) {
        setTemplates(res.data.templates || []);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load document templates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTemplates();
  };

  const openEditModal = (tpl: any) => {
    setEditingTemplate(tpl);
    setTemplateTitle(tpl.title);
    setTemplateContent(tpl.contentTemplate);
    setSignatoryTitle(tpl.signatoryTitle || 'Principal');
    setSignatoryName(tpl.signatoryName || 'Dr. Principal, M.Sc., Ph.D.');
    setModalVisible(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateTitle.trim() || !templateContent.trim()) {
      Alert.alert('Required', 'Please fill title and template text content.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/admin/templates', {
        templateType: editingTemplate?.templateType || 'BONAFIDE',
        title: templateTitle.trim(),
        version: (editingTemplate?.version || 1) + 1,
        contentTemplate: templateContent.trim(),
        signatoryTitle: signatoryTitle.trim(),
        signatoryName: signatoryName.trim(),
        isActive: true,
      });

      if (res.success) {
        Alert.alert('Success', 'Template version updated and published successfully.');
        setModalVisible(false);
        fetchTemplates();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update document template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading document templates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Document Templates"
        subtitle="Manage official certificate formats, placeholders & signatories"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SectionHeader
          title="Official Document Standards"
          subtitle="Bonafide, Conduct, and Transfer Certificate layouts"
        />

        {templates.length === 0 ? (
          <EmptyState
            title="No Templates Configured"
            message="No certificate templates found in database."
            icon="document-text-outline"
          />
        ) : (
          templates.map((tpl) => (
            <Card key={tpl._id} style={styles.templateCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{tpl.title}</Text>
                  <Text style={styles.cardSub}>
                    Type: {tpl.templateType} • Version {tpl.version}
                  </Text>
                </View>
                <Badge label={tpl.isActive ? 'Active' : 'Inactive'} type={tpl.isActive ? 'success' : 'neutral'} />
              </View>

              <Text style={styles.previewLabel}>Effective Template Content:</Text>
              <View style={styles.contentPreviewBox}>
                <Text style={styles.contentPreviewText}>{tpl.contentTemplate}</Text>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaKey}>Signatory Title:</Text>
                  <Text style={styles.metaVal}>{tpl.signatoryTitle || 'Principal'}</Text>
                </View>
                <View style={styles.metaCol}>
                  <Text style={styles.metaKey}>Signatory Name:</Text>
                  <Text style={styles.metaVal}>{tpl.signatoryName || 'Dr. Principal'}</Text>
                </View>
              </View>

              {tpl.requiredFields && tpl.requiredFields.length > 0 && (
                <View style={styles.placeholdersContainer}>
                  <Text style={styles.placeholdersTitle}>Configured Placeholders:</Text>
                  <View style={styles.chipsRow}>
                    {tpl.requiredFields.map((field: string, idx: number) => (
                      <View key={idx} style={styles.fieldChip}>
                        <Text style={styles.fieldChipText}>{`{${field}}`}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <Button
                title="Configure & Version Template"
                onPress={() => openEditModal(tpl)}
                variant="outline"
                size="small"
                icon={<Ionicons name="construct-outline" size={16} color={theme.colors.primary} />}
                style={styles.editBtn}
              />
            </Card>
          ))
        )}
      </ScrollView>

      {/* Template Edit & Versioning Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configure Document Template</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} accessibilityRole="button">
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
              <Input
                label="Template Title"
                value={templateTitle}
                onChangeText={setTemplateTitle}
                placeholder="e.g. Standard Bonafide Certificate Template"
              />

              <Input
                label="Signatory Title"
                value={signatoryTitle}
                onChangeText={setSignatoryTitle}
                placeholder="e.g. Principal / Head of Institution"
              />

              <Input
                label="Authorized Signatory Name"
                value={signatoryName}
                onChangeText={setSignatoryName}
                placeholder="e.g. Dr. S. Principal, M.Sc., Ph.D."
              />

              <Input
                label="Content Template & Placeholders"
                value={templateContent}
                onChangeText={setTemplateContent}
                placeholder="Enter template text with placeholders..."
                multiline
                numberOfLines={6}
                style={{ height: 120, textAlignVertical: 'top' }}
              />

              <View style={styles.hintBox}>
                <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.hintText}>
                  Supported placeholders: {'{STUDENT_NAME}'}, {'{REGISTER_NO}'}, {'{COURSE_NAME}'}, {'{YEAR}'}, {'{ACADEMIC_YEAR}'}, {'{PURPOSE}'}.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1, marginRight: theme.spacing.sm }}
              />
              <Button
                title="Publish New Version"
                onPress={handleSaveTemplate}
                loading={saving}
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
  templateCard: {
    padding: theme.spacing.base,
    marginBottom: theme.spacing.base,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primaryDark,
  },
  cardSub: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  previewLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  contentPreviewBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm + 2,
    marginBottom: theme.spacing.sm,
  },
  contentPreviewText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
    lineHeight: theme.typography.lineHeights.normal,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  metaCol: {
    flex: 1,
  },
  metaKey: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  metaVal: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  placeholdersContainer: {
    marginBottom: theme.spacing.sm,
  },
  placeholdersTitle: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  fieldChip: {
    backgroundColor: theme.colors.tint,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
  },
  fieldChipText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 11,
    color: theme.colors.primary,
  },
  editBtn: {
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
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.tint,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.xs,
    marginBottom: theme.spacing.base,
  },
  hintText: {
    flex: 1,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
});
