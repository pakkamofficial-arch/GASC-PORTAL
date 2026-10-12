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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header, Card, Badge, Button, SectionHeader, EmptyState } from '../../components';
import { api } from '../../services/api';

export const StudentFeesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [feeAccounts, setFeeAccounts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFees = async () => {
    try {
      const res = await api.get('/payments/my-fees');
      if (res.success && res.data) {
        setFeeAccounts(res.data.feeAccounts || []);
        setPayments(res.data.paymentHistory || []);
      }
    } catch (err) {
      console.log('Error fetching fees:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFees();
  };

  const handlePayFee = async (account: any) => {
    if (account.balanceAmount <= 0) {
      Alert.alert('Notice', 'No outstanding balance for this semester.');
      return;
    }

    setPaying(true);
    try {
      // 1. Create Order with Idempotency Key
      const idempotencyKey = `mobile_pay_${account._id}_${Date.now()}`;
      const orderRes = await api.post('/payments/orders', {
        feeAccountId: account._id,
        amount: account.balanceAmount,
        idempotencyKey,
      });

      if (!orderRes.success || !orderRes.data?.order) {
        throw new Error(orderRes.message || 'Failed to initialize payment');
      }

      const order = orderRes.data.order;

      // 2. Verified Sandbox Mock Payment (Clear Sandbox Label)
      const txnId = `TXN_SANDBOX_${Date.now()}_GASC`;
      const verifyRes = await api.post('/payments/verify', {
        orderId: order.orderId,
        transactionId: txnId,
        paymentMethod: 'UPI / NetBanking (Sandbox)',
      });

      if (verifyRes.success) {
        Alert.alert(
          'Sandbox Payment Verified',
          `Amount: ₹${order.amount}\nReceipt No: ${verifyRes.data?.receiptNumber || 'REC-VERIFIED'}\nMode: Institutional Sandbox\n\nYour institutional fee account balance has been updated.`
        );
        fetchFees();
      }
    } catch (err: any) {
      Alert.alert('Payment Error', err.message || 'Payment processing failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Fees & Payments"
        subtitle="Government Fee Portal & Receipts"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Government Welfare Policy Notice */}
        <Card style={styles.govNoticeCard} variant="outlined">
          <View style={styles.govNoticeHeader}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.govNoticeTitle}>Tamil Nadu Higher Education Welfare Policy</Text>
          </View>
          <Text style={styles.govNoticeText}>
            Under Government of Tamil Nadu policy, undergraduate tuition fees are fully exempted for state government college students. Only nominal special lab and university examination fees apply.
          </Text>
        </Card>

        <SectionHeader
          title="Current Fee Statements"
          subtitle="Semester fee breakdown & concessions"
          icon="wallet-outline"
        />

        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 24 }} />
        ) : feeAccounts.length === 0 ? (
          <EmptyState
            icon="wallet-outline"
            title="No Fee Accounts Found"
            description="Fee records for your semester have not been generated yet."
          />
        ) : (
          feeAccounts.map((acc, idx) => (
            <Card key={acc._id || idx} style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <View>
                  <Text style={styles.semTitle}>
                    Semester {acc.semester} ({acc.academicYear})
                  </Text>
                  <Text style={styles.regNoText}>Fee Account ID: {acc._id.substring(acc._id.length - 8)}</Text>
                </View>
                <Badge
                  label={acc.status}
                  type={acc.status === 'PAID' ? 'success' : acc.status === 'PARTIAL' ? 'warning' : 'error'}
                />
              </View>

              {/* Breakdown Ledger Table */}
              <View style={styles.ledgerTable}>
                <View style={styles.ledgerRow}>
                  <Text style={styles.ledgerLabel}>Base Prescribed Fee</Text>
                  <Text style={styles.ledgerVal}>₹{acc.baseAmount}</Text>
                </View>

                {acc.concessionAmount > 0 ? (
                  <View style={styles.ledgerRow}>
                    <Text style={[styles.ledgerLabel, { color: theme.colors.success }]}>
                      Government Concession ({acc.concessionReason || 'Welfare'})
                    </Text>
                    <Text style={[styles.ledgerVal, { color: theme.colors.success }]}>
                      - ₹{acc.concessionAmount}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.ledgerRow}>
                  <Text style={styles.ledgerLabel}>Net Payable Fee</Text>
                  <Text style={[styles.ledgerVal, styles.boldVal]}>₹{acc.netPayable}</Text>
                </View>

                <View style={styles.ledgerRow}>
                  <Text style={styles.ledgerLabel}>Amount Paid</Text>
                  <Text style={[styles.ledgerVal, { color: theme.colors.success }]}>
                    ₹{acc.paidAmount}
                  </Text>
                </View>

                <View style={[styles.ledgerRow, styles.totalRow]}>
                  <Text style={styles.balanceLabel}>Outstanding Balance</Text>
                  <Text style={styles.balanceVal}>₹{acc.balanceAmount}</Text>
                </View>
              </View>

              {acc.balanceAmount > 0 && (
                <Button
                  title={`Pay Outstanding ₹${acc.balanceAmount} (Sandbox Mode)`}
                  onPress={() => handlePayFee(acc)}
                  loading={paying}
                  icon={<Ionicons name="card-outline" size={16} color="#FFFFFF" />}
                  style={{ marginTop: 12 }}
                />
              )}
            </Card>
          ))
        )}

        {/* Payment History & Verified Receipts */}
        <SectionHeader
          title="Payment Receipts History"
          subtitle="Verified payment transactions"
          icon="receipt-outline"
        />

        {payments.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="No Payment Records"
            description="Verified receipts for processed payments will be archived here."
          />
        ) : (
          payments.map((p, idx) => (
            <Card key={p._id || idx} style={styles.receiptCard}>
              <View style={styles.receiptTop}>
                <View>
                  <Text style={styles.receiptTxn}>Receipt Ref: {p.receiptUrl || p.transactionId}</Text>
                  <Text style={styles.receiptDate}>
                    Date: {new Date(p.verifiedAt || p.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.receiptMethod}>Payment Mode: {p.paymentMethod || 'UPI / NetBanking'}</Text>
                </View>
                <View style={styles.receiptRight}>
                  <Text style={styles.receiptAmt}>₹{p.amount}</Text>
                  <Badge label="VERIFIED" type="success" />
                </View>
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
    paddingBottom: 36,
  },
  govNoticeCard: {
    backgroundColor: '#FAFCFA',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    marginBottom: 6,
    padding: 14,
  },
  govNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  govNoticeTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
  },
  govNoticeText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  accountCard: {
    padding: 16,
    marginVertical: 4,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingBottom: 8,
    marginBottom: 8,
  },
  semTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
  },
  regNoText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  ledgerTable: {
    marginVertical: 4,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  ledgerLabel: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  ledgerVal: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
  },
  boldVal: {
    fontFamily: theme.typography.fonts.bold,
    color: theme.colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: 8,
    marginTop: 4,
  },
  balanceLabel: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  balanceVal: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.error,
  },
  receiptCard: {
    padding: 14,
    marginVertical: 4,
  },
  receiptTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  receiptTxn: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: 12,
    color: theme.colors.text,
  },
  receiptDate: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  receiptMethod: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  receiptRight: {
    alignItems: 'flex-end',
  },
  receiptAmt: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary,
    marginBottom: 4,
  },
});
