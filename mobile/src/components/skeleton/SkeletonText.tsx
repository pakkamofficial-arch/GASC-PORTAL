import React from 'react';
import { View, StyleSheet, DimensionValue } from 'react-native';
import { Skeleton } from './Skeleton';

export interface SkeletonTextProps {
  lines?: number;
  lineHeight?: number;
  lastLineWidth?: DimensionValue;
  width?: DimensionValue;
  spacing?: number;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 1,
  lineHeight = 14,
  lastLineWidth = '60%',
  width = '100%',
  spacing = 8,
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: lines }).map((_, idx) => {
        const isLast = idx === lines - 1;
        const currentWidth = isLast && lines > 1 ? lastLineWidth : width;
        return (
          <Skeleton
            key={idx}
            width={currentWidth}
            height={lineHeight}
            borderRadius={lineHeight / 3}
            style={idx < lines - 1 ? { marginBottom: spacing } : undefined}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
