import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Skeleton } from './Skeleton';
import { SkeletonAvatar } from './SkeletonAvatar';
import { SkeletonCard } from './SkeletonCard';
import { SkeletonText } from './SkeletonText';

export interface StaffRosterSkeletonProps {
  count?: number;
  scrollable?: boolean;
}

export const StaffRosterSkeleton: React.FC<StaffRosterSkeletonProps> = ({ count = 3, scrollable = false }) => {
  const items = Array.from({ length: count }, (_, i) => i + 1);

  const contentNode = (
    <View style={scrollable ? undefined : styles.content}>
      {/* Search Input Placeholder */}
      <Skeleton width="100%" height={44} borderRadius={8} style={{ marginBottom: 12 }} />

      {/* Horizontal Department Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        {[80, 110, 95, 120, 105].map((w, idx) => (
          <Skeleton key={idx} width={w} height={32} borderRadius={16} style={{ marginRight: 8 }} />
        ))}
      </ScrollView>

      {/* Roster Cards */}
      {items.map((item) => (
        <SkeletonCard key={item} style={styles.facultyCard}>
          <View style={styles.cardHeader}>
            <SkeletonAvatar size={44} style={styles.avatar} />
            <View style={styles.headerInfo}>
              <View style={styles.nameBadgeRow}>
                <Skeleton width="60%" height={16} borderRadius={4} />
                <Skeleton width={60} height={20} borderRadius={10} />
              </View>
              <Skeleton width="45%" height={12} borderRadius={3} style={{ marginTop: 6 }} />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Skeleton width="40%" height={12} borderRadius={3} />
            <Skeleton width="45%" height={12} borderRadius={3} />
          </View>

          <View style={styles.buttonRow}>
            <Skeleton width="48%" height={34} borderRadius={6} />
            <Skeleton width="48%" height={34} borderRadius={6} />
          </View>
        </SkeletonCard>
      ))}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {contentNode}
      </ScrollView>
    );
  }

  return contentNode;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  chipsScroll: {
    marginBottom: 16,
  },
  facultyCard: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
