import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { theme } from '../../theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { api } from '../../services/api';

export const AdminBonafideScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/certificates');
      if (res.success && res.data) {
        setRequests(res.data.requests || []);
      }
    } catch (err) {
      console.log('Error fetching bonafide requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocx = (cert: any) => {
    const downloadUrl = `${api.getBaseUrl()}/certificates/${cert._id}/download-docx`;
    Alert.alert(
      'Official Bonafide Document (.DOCX)',
      `Certificate No: ${cert.certificateNumber || 'ISSUED'}\nStudent: ${cert.studentId?.fullName || ''} (${cert.studentId?.registerNo || ''})\n\nWord document generated from original template.\n\nDownload Link:\n${downloadUrl}`
    );
  };

  const handleDownloadPdf = (cert: any) => {
    const downloadUrl = `${api.getBaseUrl()}/certificates/${cert._id}/download`;
    Alert.alert(
      'Official PDF Copy',
      `Certificate No: ${cert.certificateNumber || 'ISSUED'}\nStudent: ${cert.studentId?.fullName || ''} (${cert.studentId?.registerNo || ''})\n\nDownload Link:\n${downloadUrl}`
    );
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await api.post(`/certificates/${id}/approve`);
      if (res.success) {
        Alert.alert(
          'Certificate Issued',
          `Approved successfully.\nGenerated Certificate No: ${res.data?.certificateNumber}`
        );
        fetchRequests();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    Alert.prompt
      ? Alert.prompt(
          'Reject Bonafide Request',
          'Enter administrative reason for rejection:',
          async (reason) => {
            if (!reason) return;
            setProcessingId(id);
            try {
              const res = await api.post(`/certificates/${id}/reject`, { reason });
              if (res.success) {
                Alert.alert('Rejected', 'Request rejected.');
                fetchRequests();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setProcessingId(null);
            }
          }
        )
      : (async () => {
          setProcessingId(id);
          try {
            const res = await api.post(`/certificates/${id}/reject`, {
              reason: 'Incomplete university enrollment verification',
            });
            if (res.success) {
              Alert.alert('Rejected', 'Request marked rejected.');
              fetchRequests();
            }
          } catch (err: any) {
            Alert.alert('Error', err.message);
          } finally {
            setProcessingId(null);
          }
        })();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Bonafide Certificate Approvals"
        subtitle="Principal Desk & Verification"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Student Applications ({requests.length})</Text>

        {loading ? (
          <LoadingSpinner message="Loading bonafide applications..." />
        ) : requests.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No pending bonafide requests.</Text>
          </Card>
        ) : (
          requests.map((r) => {
            const st = r.studentId || {};
            const isProcessing = processingId === r._id;
            const isPendingApproval = r.status === 'SUBMITTED' || r.status === 'PENDING' || r.status === 'UNDER_REVIEW';
            const isIssued = r.status === 'APPROVED' || r.status === 'ISSUED';

            return (
              <Card key={r._id} style={styles.requestCard} elevated>
                <View style={styles.reqHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stName}>{st.fullName || 'Student'}</Text>
                    <Text style={styles.stReg}>
                      Reg No: {st.registerNo} • {st.departmentId?.name} (Sem {st.currentSemester})
                    </Text>
                  </View>
                  <Badge label={r.status} type={isIssued ? 'success' : r.status === 'REJECTED' ? 'error' : 'warning'} />
                </View>

                <View style={styles.purposeBox}>
                  <Text style={styles.purposeLabel}>Applied Purpose:</Text>
                  <Text style={styles.purposeValue}>{r.purpose ? r.purpose.replace(/_/g, ' ') : 'General'}</Text>
                  {r.additionalDetails ? (
                    <Text style={styles.detailsText}>Notes: {r.additionalDetails}</Text>
                  ) : null}
                </View>

                {r.certificateNumber ? (
                  <View style={styles.approvedBox}>
                    <Text style={styles.certRef}>Issued Ref: {r.certificateNumber}</Text>
                  </View>
                ) : null}

                {isPendingApproval && (
                  <View style={styles.btnRow}>
                    <Button
                      title="Reject"
                      variant="danger"
                      onPress={() => handleReject(r._id)}
                      loading={isProcessing}
                      style={{ flex: 1, marginRight: 6, height: 40 }}
                    />
                    <Button
                      title="Approve & Issue Certificate"
                      onPress={() => handleApprove(r._id)}
                      loading={isProcessing}
                      style={{ flex: 2, marginLeft: 6, height: 40 }}
                    />
                  </View>
                )}

                {isIssued && (
                  <View style={styles.downloadGroup}>
                    <Button
                      title="Download Official Bonafide (.DOCX)"
                      onPress={() => handleDownloadDocx(r)}
                      variant="primary"
                      size="sm"
                      style={{ marginTop: 8 }}
                    />
                    <Button
                      title="Download PDF Copy"
                      onPress={() => handleDownloadPdf(r)}
                      variant="outline"
                      size="sm"
                      style={{ marginTop: 6 }}
                    />
                  </View>
                )}
              </Card>
            );
          })
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
  requestCard: {
    padding: 14,
    marginVertical: 6,
  },
  reqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingBottom: 8,
    marginBottom: 8,
  },
  stName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  stReg: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  purposeBox: {
    marginVertical: 4,
  },
  purposeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  purposeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 1,
  },
  detailsText: {
    fontSize: 11,
    color: theme.colors.text,
    marginTop: 2,
  },
  approvedBox: {
    marginTop: 6,
    padding: 6,
    backgroundColor: theme.colors.tint,
    borderRadius: 4,
  },
  certRef: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
  },
  downloadGroup: {
    marginTop: 6,
  },
});
