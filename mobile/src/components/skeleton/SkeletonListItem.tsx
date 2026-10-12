import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Skeleton } from './Skeleton';
import { SkeletonAvatar } from './SkeletonAvatar';
import { SkeletonText } from './SkeletonText';

export interface SkeletonListItemProps {
  hasAvatar?: boolean;
  avatarSize?: number;
  lines?: number;
  style?: ViewStyle;
}

export const SkeletonListItem: React.FC<SkeletonListItemProps> = ({
  hasAvatar = true,
  avatarSize = 42,
  lines = 2,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {hasAvatar && <SkeletonAvatar size={avatarSize} style={styles.avatar} />}
      <View style={styles.content}>
        <SkeletonText lines={lines} lineHeight={13} spacing={6} lastLineWidth="50%" />
      </View>
      <Skeleton width={18} height={18} borderRadius={9} style={styles.trailing} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  trailing: {
    marginLeft: 10,
  },
});
