import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header, Card, Badge, Button, SectionHeader, EmptyState } from '../../components';
import { MaterialsSkeleton } from '../../components/skeleton';
import { api } from '../../services/api';

export const StudentMaterialsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMaterials = async () => {
    try {
      setError(null);
      const res = await api.get('/materials');
      if (res.success && res.data) {
        setMaterials(res.data.materials || []);
      } else {
        setError(res.message || 'Unable to load study materials.');
      }
    } catch (err: any) {
      console.log('Error fetching study materials:', err);
      setError(err.message || 'Network error fetching study materials.');
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

  const handleOpenMaterial = (mat: any) => {
    let resolvedUrl = mat.fileUrl || '';
    if (mat._id && (!resolvedUrl || resolvedUrl.startsWith('/api/v1/materials/download'))) {
      const origin = api.getBaseUrl().replace('/api/v1', '');
      resolvedUrl = resolvedUrl ? `${origin}${resolvedUrl}` : `${api.getBaseUrl()}/materials/download/${mat._id}`;
    } else if (resolvedUrl && !resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://')) {
      const origin = api.getBaseUrl().replace('/api/v1', '');
      resolvedUrl = `${origin}${resolvedUrl}`;
    }

    if (resolvedUrl) {
      Alert.alert(
        'Study Material Access',
        `Title: ${mat.title}\nFile: ${mat.fileName || 'Course Material'}\n\nAccess verified course note document.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download / View',
            onPress: () => {
              Linking.openURL(resolvedUrl).catch(() => {
                Alert.alert('Notice', 'Cannot open URL on this device.');
              });
            },
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Study Materials & Notes"
        subtitle="Department Notes, Syllabi & Lecture Guides"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SectionHeader
          title="Curated Lecture Materials"
          subtitle="Materials uploaded by your course faculty"
          icon="library-outline"
        />

        {loading ? (
          <MaterialsSkeleton count={4} />
        ) : error && materials.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 24 }}>
            <Ionicons name="cloud-offline-outline" size={42} color={theme.colors.error} />
            <Text style={{ color: theme.colors.error, marginVertical: 8, textAlign: 'center' }}>{error}</Text>
            <Button title="Retry Materials" onPress={() => { setLoading(true); fetchMaterials(); }} variant="outline" />
          </View>
        ) : materials.length === 0 ? (
          <EmptyState
            icon="library-outline"
            title="No Study Materials Uploaded"
            description="Your course faculty have not uploaded study notes or unit guides for this semester yet."
          />
        ) : (
          materials.map((item, idx) => (
            <Card key={item._id || idx} style={styles.materialCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <Ionicons name="document-text" size={24} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.matTitle}>{item.title}</Text>
                  <Text style={styles.subjectText}>
                    {item.subjectId?.title || 'Subject'} • Sem {item.semester}
                  </Text>
                  <Text style={styles.facultyText}>
                    Uploaded by: {item.uploadedBy?.fullName || 'Department Faculty'}
                  </Text>
                </View>
                <Badge label={item.unitOrTopic || 'UNIT NOTES'} type="info" />
              </View>

              {item.description ? (
                <Text style={styles.descText}>{item.description}</Text>
              ) : null}

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="attach-outline" size={13} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={styles.metaText}>{item.fileName || 'Document.pdf'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="cloud-outline" size={13} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={styles.metaText}>{(item.fileSize / 1024).toFixed(0)} KB</Text>
                </View>
              </View>

              <Button
                title="View & Download Note"
                onPress={() => handleOpenMaterial(item)}
                variant="outline"
                size="sm"
                icon={<Ionicons name="download-outline" size={15} color={theme.colors.primary} />}
                style={{ marginTop: 8 }}
              />
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
    paddingBottom: 36,
  },
  materialCard: {
    padding: 14,
    marginVertical: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  matTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
  },
  subjectText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  facultyText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 11,
    color: theme.colors.primary,
    marginTop: 1,
  },
  descText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
    lineHeight: 18,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 8,
    borderRadius: theme.borderRadius.sm,
    marginVertical: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
});
