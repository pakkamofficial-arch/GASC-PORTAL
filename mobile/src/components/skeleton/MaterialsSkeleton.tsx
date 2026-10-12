import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Skeleton } from './Skeleton';
import { SkeletonCard } from './SkeletonCard';
import { SkeletonText } from './SkeletonText';

export interface MaterialsSkeletonProps {
  count?: number;
  scrollable?: boolean;
}

export const MaterialsSkeleton: React.FC<MaterialsSkeletonProps> = ({ count = 3, scrollable = false }) => {
  const items = Array.from({ length: count }, (_, i) => i + 1);

  const contentNode = (
    <View style={scrollable ? undefined : styles.content}>
      {/* Material Note Cards */}
      {items.map((item) => (
        <SkeletonCard key={item} style={styles.card}>
          <View style={styles.cardHeader}>
            <Skeleton width={40} height={40} borderRadius={8} style={styles.iconBox} />
            <View style={{ flex: 1 }}>
              <Skeleton width="80%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton width="50%" height={12} borderRadius={3} style={{ marginBottom: 4 }} />
              <Skeleton width="40%" height={11} borderRadius={3} />
            </View>
            <Skeleton width={70} height={20} borderRadius={10} />
          </View>

          <SkeletonText lines={2} lineHeight={12} spacing={6} lastLineWidth="60%" />

          <View style={styles.metaRow}>
            <Skeleton width="35%" height={12} borderRadius={3} />
            <Skeleton width="20%" height={12} borderRadius={3} />
          </View>

          <Skeleton width="100%" height={36} borderRadius={6} style={{ marginTop: 10 }} />
        </SkeletonCard>
      ))}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Skeleton width="55%" height={16} borderRadius={4} />
          <Skeleton width="40%" height={12} borderRadius={3} style={{ marginTop: 4 }} />
        </View>
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
  sectionHeader: {
    marginBottom: 14,
  },
  card: {
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconBox: {
    marginRight: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
});
