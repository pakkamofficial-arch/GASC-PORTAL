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
import { api } from '../../services/api';

export const AdminSecurityScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [securityData, setSecurityData] = useState<any>(null);
  const [inventory, setInventory] = useState<any>(null);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<any>(null);

  const fetchSecurityOverview = async () => {
    try {
      const res = await api.get('/admin/security/overview');
      if (res.success && res.data) {
        setSecurityData(res.data);
      }

      const invRes = await api.get('/admin/security/cleanup/inventory');
      if (invRes.success && invRes.data) {
        setInventory(invRes.data);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load security overview.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSecurityOverview();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSecurityOverview();
  };

  const handleDryRun = async () => {
    try {
      const res = await api.get('/admin/security/cleanup/inventory');
      if (res.success && res.data) {
        setInventory(res.data);
        Alert.alert(
          'Dry Run Verification Complete',
          `Demo accounts identified: ${res.data.demoUsersCount}\nPreserved Primary Admin: ${res.data.preservedPrimaryAdminId}\nNo changes were made to the database.`
        );
      }
    } catch (err: any) {
      Alert.alert('Dry Run Failed', err.message || 'Unable to scan records.');
    }
  };

  const handleExecuteCleanup = () => {
    Alert.alert(
      'Confirm Demo Data Removal',
      'This will create a pre-wipe backup JSON file and remove only verified demo/synthetic records. Legitimate college records and the Primary Administrator will be strictly preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Execute Cleanup & Backup',
          style: 'destructive',
          onPress: async () => {
            setCleaningUp(true);
            try {
              const res = await api.post('/admin/security/cleanup/execute', { dryRun: false });
              if (res.success && res.data) {
                setCleanupResult(res.data);
                Alert.alert('Cleanup Succeeded', res.data.message);
                fetchSecurityOverview();
              } else {
                Alert.alert('Cleanup Notice', res.message || 'Cleanup operation completed.');
              }
            } catch (err: any) {
              Alert.alert('Cleanup Error', err.message || 'Failed to execute cleanup.');
            } finally {
              setCleaningUp(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Security & System Hardening"
        subtitle="Primary Admin Model, E2EE Integrity & Clean State"
        showBack={true}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {loading ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loaderText}>Verifying system security constraints...</Text>
          </View>
        ) : (
          <>
            {/* Section 1: Single Primary Administrator */}
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="key" size={20} color={theme.colors.primary} />
                <Text style={styles.cardTitle}>Single Authoritative Admin / Principal</Text>
                <Badge label="Database Enforced" variant="success" />
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Immutable Root ID:</Text>
                <Text style={styles.infoValueHighlight}>
                  {securityData?.primaryAdministrator?.immutableId || 'GASC-ROOT-ADM-001'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Login Identifier:</Text>
                <Text style={styles.infoValue}>
                  {securityData?.primaryAdministrator?.identifier || 'ADMIN001'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Uniqueness Guarantee:</Text>
                <Text style={styles.infoValue}>MongoDB Partial Unique Index (`isPrimaryAdmin: true`)</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Role Display:</Text>
                <Badge label="Admin / Principal" variant="success" />
              </View>

              <Text style={styles.explanationText}>
                The database strictly enforces that exactly one primary Admin / Principal account exists.
                Concurrent initialization race conditions and unauthorized promotions are prevented at the database level.
              </Text>
            </Card>

            {/* Section 2: End-to-End Encryption Protocol */}
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="shield-checkmark" size={20} color={theme.colors.success} />
                <Text style={styles.cardTitle}>End-to-End Encryption (E2EE)</Text>
                <Badge label="Audited Protocol" variant="info" />
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cryptographic Standard:</Text>
                <Text style={styles.infoValue}>TweetNaCl XSalsa20-Poly1305 + Curve25519</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Server Storage Policy:</Text>
                <Text style={styles.infoValue}>Ciphertext + 24-byte Nonce only</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Decrypted Server Access:</Text>
                <Text style={[styles.infoValue, { color: theme.colors.error, fontFamily: theme.typography.fonts.semibold }]}>
                  Strictly Prohibited (Zero-Knowledge)
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Devices with Public Keys:</Text>
                <Text style={styles.infoValue}>{securityData?.e2eeStatus?.usersWithKeys || 0} enrolled</Text>
              </View>

              <Text style={styles.explanationText}>
                Keys are generated and stored exclusively on client devices. Messages and document attachments are
                encrypted client-side before transmission. The backend cannot read conversation contents.
              </Text>
            </Card>

            {/* Section 3: Demo Data Cleanup & Pre-Wipe Backup */}
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="trash-bin-outline" size={20} color={theme.colors.warning} />
                <Text style={styles.cardTitle}>Demo Accounts & Test Records Cleanup</Text>
                <Badge
                  label={inventory?.demoUsersCount > 0 ? `${inventory?.demoUsersCount} Demo Accounts` : 'Clean State'}
                  variant={inventory?.demoUsersCount > 0 ? 'warning' : 'success'}
                />
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Identified Demo Users:</Text>
                <Text style={styles.infoValue}>{inventory?.demoUsersCount || 0}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Demo Student Profiles:</Text>
                <Text style={styles.infoValue}>{inventory?.demoStudentsCount || 0}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Demo Faculty Profiles:</Text>
                <Text style={styles.infoValue}>{inventory?.demoFacultyCount || 0}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Protected Primary Admin:</Text>
                <Text style={styles.infoValueHighlight}>
                  [{inventory?.preservedPrimaryAdminId || 'GASC-ROOT-ADM-001'}] (Preserved)
                </Text>
              </View>

              {cleanupResult && (
                <View style={styles.backupBox}>
                  <Text style={styles.backupTitle}>Pre-Wipe Backup Created:</Text>
                  <Text style={styles.backupFile}>{cleanupResult.backupPath}</Text>
                </View>
              )}

              <View style={styles.buttonRow}>
                <Button
                  title="Dry Run Inventory"
                  variant="outline"
                  onPress={handleDryRun}
                  style={styles.actionBtn}
                />
                <Button
                  title={cleaningUp ? 'Backing Up & Cleaning...' : 'Execute Cleanup'}
                  variant="primary"
                  onPress={handleExecuteCleanup}
                  disabled={cleaningUp}
                  style={styles.actionBtn}
                />
              </View>
            </Card>

            {/* Section 4: Security Audit Logs */}
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.cardTitle}>Security Audit Logs</Text>
                <Badge label="Immutable" variant="neutral" />
              </View>
              <Text style={styles.explanationText}>
                All administrative credential operations, role changes, backup events, and cleanup executions are
                recorded in an immutable audit ledger.
              </Text>
              <Button
                title="View Full Audit Log Trail"
                variant="outline"
                onPress={() => navigation.navigate('AdminAuditLogs')}
                style={{ marginTop: 8 }}
              />
            </Card>
          </>
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
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: theme.typography.fonts.semibold,
    color: theme.colors.primaryDark,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F0',
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: theme.typography.fonts.regular,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: theme.typography.fonts.medium,
    color: theme.colors.text,
  },
  infoValueHighlight: {
    fontSize: 13,
    fontFamily: theme.typography.fonts.semibold,
    color: theme.colors.primary,
  },
  explanationText: {
    fontSize: 12,
    fontFamily: theme.typography.fonts.regular,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 10,
    backgroundColor: '#F8FAF8',
    padding: 10,
    borderRadius: 8,
  },
  backupBox: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  backupTitle: {
    fontSize: 11,
    fontFamily: theme.typography.fonts.semibold,
    color: theme.colors.primaryDark,
  },
  backupFile: {
    fontSize: 10,
    fontFamily: theme.typography.fonts.regular,
    color: theme.colors.primary,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: theme.typography.fonts.regular,
    color: theme.colors.textSecondary,
  },
});
