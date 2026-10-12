import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
}) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primaryDark} />
      
      {/* Official Government of Tamil Nadu Institutional Banner */}
      <View style={styles.topBar}>
        <Image
          source={require('../../assets/branding/college-logo.png')}
          style={styles.govEmblem}
          resizeMode="contain"
          accessibilityLabel="College Official Logo"
        />
        <View style={styles.govInfo}>
          <View style={styles.govRow}>
            <Text style={styles.govTamil}>தமிழ்நாடு அரசு</Text>
            <Text style={styles.govDivider}>|</Text>
            <Text style={styles.govTitle}>GOVERNMENT OF TAMIL NADU</Text>
          </View>
          <Text style={styles.collegeName} numberOfLines={1}>
            Govt. Arts & Science College, Kuthalam
          </Text>
          <Text style={styles.affiliation} numberOfLines={1}>
            Affiliated with Annamalai University (அறிவே ஆற்றல்)
          </Text>
        </View>
      </View>

      {/* Primary Screen Header */}
      <View style={styles.mainHeader}>
        <View style={styles.leftRow}>
          {showBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <View style={styles.titleWrap}>
            <Text style={styles.screenTitle} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.screenSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primaryDark,
  },
  topBar: {
    backgroundColor: theme.colors.primaryDark,
    paddingVertical: 6,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  govEmblem: {
    width: 38,
    height: 38,
    marginRight: 10,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  govInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  govRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  govTamil: {
    fontFamily: theme.typography.fonts.tamilSemiBold,
    color: '#DCE7DC',
    fontSize: 10,
    fontWeight: '600',
  },
  govDivider: {
    color: '#7FA87F',
    marginHorizontal: 6,
    fontSize: 9,
  },
  govTitle: {
    fontFamily: theme.typography.fonts.bold,
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  collegeName: {
    fontFamily: theme.typography.fonts.semibold,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  affiliation: {
    fontFamily: theme.typography.fonts.regular,
    color: '#B2D0B2',
    fontSize: 9,
    marginTop: 1,
  },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleWrap: {
    flex: 1,
  },
  backButton: {
    marginRight: 12,
    width: 34,
    height: 34,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontFamily: theme.typography.fonts.bold,
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
  },
  screenSubtitle: {
    fontFamily: theme.typography.fonts.regular,
    color: '#E4EDE4',
    fontSize: theme.typography.sizes.xs,
    marginTop: 1,
  },
  rightAction: {
    marginLeft: 12,
  },
});
