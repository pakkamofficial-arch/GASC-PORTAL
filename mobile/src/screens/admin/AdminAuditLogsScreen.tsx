import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { api } from '../../services/api';

export const AdminAuditLogsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/admin/audit-logs');
      if (res.success && res.data) {
        setLogs(res.data.logs || []);
      }
    } catch (err) {
      console.log('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Security Audit Trail"
        subtitle="Institutional Action Logs"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Immutable System Audit Logs</Text>

        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 20 }} />
        ) : logs.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No audit entries recorded.</Text>
          </Card>
        ) : (
          logs.map((log) => (
            <Card key={log._id} style={styles.logCard}>
              <View style={styles.logRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionText}>{log.action.replace(/_/g, ' ')}</Text>
                  <Text style={styles.entityText}>
                    Target: {log.targetEntity} {log.entityId ? `(#${log.entityId.substring(0, 8)})` : ''}
                  </Text>
                  <Text style={styles.userText}>
                    Operator: {log.performedBy?.identifier || 'System'} ({log.performedBy?.role || 'SYSTEM'})
                  </Text>
                  <Text style={styles.timeText}>
                    {new Date(log.timestamp).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </Text>
                </View>
                <Badge label={log.action.split('_')[0]} type="info" />
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
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 10,
  },
  logCard: {
    padding: 12,
    marginVertical: 4,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  entityText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 2,
  },
  userText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  timeText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
