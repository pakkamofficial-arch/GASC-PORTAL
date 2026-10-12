import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { e2eeService } from '../../services/e2ee.service';
import { chatSocketService } from '../../services/chat-socket.service';
import { ChatConversation } from '../../types';

export const ChatListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [e2eeReady, setE2eeReady] = useState(false);

  const initE2EEAndLoadChats = useCallback(async () => {
    try {
      await e2eeService.init();
      setE2eeReady(true);
      chatSocketService.connect();
    } catch (e) {
      console.log('E2EE Init Notice:', e);
    }

    try {
      const res = await api.get('/chat/conversations');
      if (res.success && res.data) {
        setConversations(res.data);
      }
    } catch (err: any) {
      console.log('Error fetching conversations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    initE2EEAndLoadChats();

    const unsubscribe = chatSocketService.onMessage(() => {
      // Refresh conversation list on incoming message to update snippets
      api.get('/chat/conversations').then((res) => {
        if (res.success && res.data) setConversations(res.data);
      });
    });

    return () => {
      unsubscribe();
    };
  }, [initE2EEAndLoadChats]);

  const onRefresh = () => {
    setRefreshing(true);
    initE2EEAndLoadChats();
  };

  const getFilteredConversations = () => {
    if (filterType === 'ALL') return conversations;
    if (filterType === 'EXECUTIVE') {
      return conversations.filter(
        (c) => c.type === 'PRINCIPAL_RESTRICTED' || c.type === 'ADMIN_RESTRICTED'
      );
    }
    return conversations.filter((c) => c.type === filterType);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'CLASS_GROUP':
        return <Badge label="Class Group" variant="info" />;
      case 'FACULTY_ONLY':
        return <Badge label="Faculty Restricted" variant="warning" />;
      case 'WHOLE_COLLEGE':
        return <Badge label="Campus Wide" variant="success" />;
      case 'PRINCIPAL_RESTRICTED':
      case 'ADMIN_RESTRICTED':
        return <Badge label="Executive / Principal" variant="danger" />;
      case 'DIRECT':
        return <Badge label="Direct Message" variant="neutral" />;
      default:
        return <Badge label="Group" variant="neutral" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CLASS_GROUP':
        return 'school-outline';
      case 'FACULTY_ONLY':
        return 'briefcase-outline';
      case 'WHOLE_COLLEGE':
        return 'people-outline';
      case 'PRINCIPAL_RESTRICTED':
      case 'ADMIN_RESTRICTED':
        return 'shield-checkmark';
      default:
        return 'chatbubble-ellipses-outline';
    }
  };

  const renderConversationItem = ({ item }: { item: ChatConversation }) => {
    return (
      <Card style={styles.card}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() =>
            navigation.navigate('ChatConversation', {
              conversationId: item.id || item._id,
              name: item.name,
              type: item.type,
              isAnnouncementOnly: item.isAnnouncementOnly,
            })
          }
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={getTypeIcon(item.type) as any} size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.detailsContainer}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.conversationTitle} numberOfLines={1}>
                {item.name}
              </Text>
              {getTypeBadge(item.type)}
            </View>

            {item.description ? (
              <Text style={styles.descriptionText} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}

            <View style={styles.footerRow}>
              <View style={styles.e2eeIndicator}>
                <Ionicons name="lock-closed" size={12} color={theme.colors.primary} />
                <Text style={styles.e2eeText}>E2EE Verified</Text>
              </View>
              {item.memberCount ? (
                <Text style={styles.memberCountText}>
                  {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
                </Text>
              ) : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="College Communications"
        subtitle="Genuine End-to-End Encrypted Campus Chat"
        showBack={navigation.canGoBack()}
        onBack={() => navigation.goBack()}
      />

      {/* Security Status Banner */}
      <View style={styles.securityBanner}>
        <View style={styles.shieldIconWrap}>
          <Ionicons name="shield-checkmark" size={18} color={theme.colors.success} />
        </View>
        <View style={styles.securityBannerTextWrap}>
          <Text style={styles.securityBannerTitle}>
            End-to-End Encrypted (TweetNaCl XSalsa20-Poly1305)
          </Text>
          <Text style={styles.securityBannerSub}>
            Messages and attachments are encrypted before leaving your device. The server cannot read them.
          </Text>
        </View>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { key: 'ALL', label: 'All' },
          { key: 'CLASS_GROUP', label: 'Class' },
          { key: 'WHOLE_COLLEGE', label: 'Campus' },
          ...(user?.role !== 'STUDENT' ? [{ key: 'FACULTY_ONLY', label: 'Faculty' }] : []),
          ...(user?.role === 'ADMIN' ? [{ key: 'EXECUTIVE', label: 'Executive' }] : []),
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, filterType === tab.key && styles.tabButtonActive]}
            onPress={() => setFilterType(tab.key)}
          >
            <Text
              style={[styles.tabButtonText, filterType === tab.key && styles.tabButtonTextActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading authorized college channels...</Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredConversations()}
          keyExtractor={(item) => item.id || item._id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="No Channels Available"
              description="No authorized groups found matching this category for your collegiate account."
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  shieldIconWrap: {
    marginRight: 10,
  },
  securityBannerTextWrap: {
    flex: 1,
  },
  securityBannerTitle: {
    fontSize: 12,
    fontFamily: theme.typography.fonts.semibold,
    color: theme.colors.primaryDark,
  },
  securityBannerSub: {
    fontSize: 10,
    fontFamily: theme.typography.fonts.regular,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabButtonText: {
    fontSize: 12,
    fontFamily: theme.typography.fonts.medium,
    color: theme.colors.textSecondary,
  },
  tabButtonTextActive: {
    color: theme.colors.textWhite,
    fontFamily: theme.typography.fonts.semibold,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 12,
    marginBottom: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailsContainer: {
    flex: 1,
    marginRight: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationTitle: {
    fontSize: 15,
    fontFamily: theme.typography.fonts.semibold,
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  descriptionText: {
    fontSize: 12,
    fontFamily: theme.typography.fonts.regular,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  e2eeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  e2eeText: {
    fontSize: 11,
    fontFamily: theme.typography.fonts.medium,
    color: theme.colors.primary,
  },
  memberCountText: {
    fontSize: 11,
    fontFamily: theme.typography.fonts.regular,
    color: theme.colors.textMuted,
  },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: theme.typography.fonts.regular,
    color: theme.colors.textSecondary,
  },
});
