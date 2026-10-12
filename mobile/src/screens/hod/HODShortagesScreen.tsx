import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header, Card, Badge, Input, SectionHeader, EmptyState } from '../../components';
import { api } from '../../services/api';

export const HODShortagesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [shortages, setShortages] = useState<any[]>([]);
  const [threshold, setThreshold] = useState<string>('75');
  const [search, setSearch] = useState<string>('');

  const fetchShortages = useCallback(async () => {
    try {
      const res = await api.get(`/hod/shortages?threshold=${threshold}`);
      if (res.success && res.data) {
        setShortages(res.data.students || []);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load attendance shortages');
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  useEffect(() => {
    fetchShortages();
  }, [fetchShortages]);

  const filtered = shortages.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.fullName.toLowerCase().includes(q) || s.registerNo.toLowerCase().includes(q);
  });

  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert('No Contact', 'No contact phone number is recorded for this student.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Call Failed', `Cannot dial ${phoneNumber} on this device.`);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Attendance Shortage Watch"
        subtitle={`Students below ${threshold}% attendance requirement`}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Info Box */}
        <View style={styles.alertBanner}>
          <Ionicons name="information-circle-outline" size={20} color="#C88308" style={{ marginRight: 8 }} />
          <Text style={styles.alertText}>
            Under university regulations, students with attendance under 75% require formal condonation or departmental intervention before semester examinations.
          </Text>
        </View>

        <Input
          label="Search by Register Number or Name"
          value={search}
          onChangeText={setSearch}
          placeholder="e.g. 23UCS or Murugan"
          leftIcon="search-outline"
        />

        <SectionHeader
          title={`Identified Shortages (${filtered.length})`}
          subtitle="Department students requiring academic follow-up"
        />

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 24 }} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Zero Shortage Alerts"
            message="No students in this department currently fall below the required attendance threshold."
            icon="checkmark-done-circle-outline"
          />
        ) : (
          filtered.map((st) => (
            <Card key={st.studentId} style={styles.studentCard} variant="outlined">
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stName}>{st.fullName}</Text>
                  <Text style={styles.stReg}>
                    Reg: <Text style={styles.bold}>{st.registerNo}</Text> • Year {st.year} (Sec {st.section})
                  </Text>
                  <Text style={styles.stClasses}>
                    Classes: {st.attendedClasses} attended out of {st.totalClasses} held
                  </Text>
                  {st.guardianPhone ? (
                    <Text style={styles.stPhone}>Guardian Phone: {st.guardianPhone}</Text>
                  ) : null}
                </View>

                <View style={styles.badgeCol}>
                  <Badge label={`${st.attendancePercentage}%`} type="error" />
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => handleCall(st.guardianPhone || st.phone)}
                    accessibilityLabel="Call guardian"
                  >
                    <Ionicons name="call" size={14} color="#FFFFFF" />
                    <Text style={styles.callText}>Call</Text>
                  </TouchableOpacity>
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: theme.borderRadius.sm,
    padding: 12,
    marginBottom: 12,
  },
  alertText: {
    flex: 1,
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: '#8D6E63',
    lineHeight: 16,
  },
  studentCard: {
    padding: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stName: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  stReg: {
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 2,
  },
  stClasses: {
    fontFamily: theme.typography.families.primary,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  stPhone: {
    fontFamily: theme.typography.families.primary,
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  bold: {
    fontFamily: theme.typography.families.primaryBold,
  },
  badgeCol: {
    alignItems: 'flex-end',
    gap: 8,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  callText: {
    color: '#FFFFFF',
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: 11,
  },
});
