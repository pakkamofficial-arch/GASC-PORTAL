import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header } from '../../components/Header';
import { Badge } from '../../components/Badge';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { e2eeService } from '../../services/e2ee.service';
import { chatSocketService } from '../../services/chat-socket.service';
import { ChatMessageItem } from '../../types';

export const ChatConversationScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { conversationId, name, type, isAnnouncementOnly } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessageItem | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const decryptAndFormatMessages = useCallback(
    async (rawMessages: any[]): Promise<ChatMessageItem[]> => {
      const decryptedList: ChatMessageItem[] = [];
      for (const msg of rawMessages) {
        let text = msg.decryptedText;
        if (!text && msg.ciphertext && msg.nonce) {
          try {
            text = await e2eeService.decryptMessage(conversationId, msg.ciphertext, msg.nonce);
          } catch {
            text = '[Encrypted payload — Verification required]';
          }
        }
        decryptedList.push({ ...msg, decryptedText: text });
      }
      return decryptedList;
    },
    [conversationId]
  );

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/chat/conversations/${conversationId}/messages?limit=60`);
      if (res.success && res.data) {
        const decrypted = await decryptAndFormatMessages(res.data);
        setMessages(decrypted);
      }
    } catch (err: any) {
      console.log('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, decryptAndFormatMessages]);

  useEffect(() => {
    fetchMessages();

    chatSocketService.connect();
    chatSocketService.joinConversation(conversationId);

    const unsubscribe = chatSocketService.onMessage(async (newMsg: any) => {
      if (newMsg.conversationId === conversationId) {
        const [decrypted] = await decryptAndFormatMessages([newMsg]);
        setMessages((prev) => {
          // Avoid duplicate messages
          if (prev.some((m) => m._id === decrypted._id)) return prev;
          return [...prev, decrypted];
        });
      }
    });

    return () => {
      chatSocketService.leaveConversation(conversationId);
      unsubscribe();
    };
  }, [conversationId, fetchMessages, decryptAndFormatMessages]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    if (isAnnouncementOnly && user?.role !== 'ADMIN') {
      Alert.alert('Announcement Channel', 'Only the Admin / Principal can post in this channel.');
      return;
    }

    setSending(true);
    try {
      // Step 1: Encrypt plaintext on device
      const encrypted = await e2eeService.encryptMessage(conversationId, trimmed);

      // Step 2: Post encrypted ciphertext & nonce to server
      const payload = {
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        keyVersion: encrypted.keyVersion,
        replyTo: replyTo?._id,
      };

      const res = await api.post(`/chat/conversations/${conversationId}/messages`, payload);

      if (res.success && res.data) {
        const [decryptedNew] = await decryptAndFormatMessages([res.data]);
        setMessages((prev) => {
          if (prev.some((m) => m._id === decryptedNew._id)) return prev;
          return [...prev, decryptedNew];
        });
        setInputText('');
        setReplyTo(null);
      } else {
        Alert.alert('Delivery Failed', res.message || 'Unable to post encrypted message.');
      }
    } catch (err: any) {
      Alert.alert('Encryption Error', err.message || 'Failed to encrypt message on device.');
    } finally {
      setSending(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge label="Admin / Principal" variant="danger" />;
      case 'FACULTY':
      case 'STAFF':
        return <Badge label="Faculty" variant="info" />;
      case 'STUDENT':
        return <Badge label="Student" variant="success" />;
      default:
        return null;
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessageItem }) => {
    const isMe = item.senderId === user?.id;

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {!isMe && (
            <View style={styles.senderHeader}>
              <Text style={styles.senderName}>{item.senderName || item.senderIdentifier}</Text>
              {getRoleBadge(item.senderRole)}
            </View>
          )}

          {item.replyTo ? (
            <View style={styles.replyPreviewInBubble}>
              <Text style={styles.replyInBubbleText} numberOfLines={1}>
                Replying to earlier message
              </Text>
            </View>
          ) : null}

          <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
            {item.decryptedText || '[Decrypting message...]'}
          </Text>

          {item.attachments && item.attachments.length > 0 && (
            <View style={styles.attachmentList}>
              {item.attachments.map((att, idx) => (
                <View key={att.attachmentId || idx} style={styles.attachmentBubble}>
                  <Ionicons name="document-lock-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.attachmentText}>Encrypted Document ({(att.fileSize / 1024).toFixed(0)} KB)</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.timeRow}>
            <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
              {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
            {isMe && (
              <Ionicons
                name={item.readBy && item.readBy.length > 1 ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.readBy && item.readBy.length > 1 ? '#4FC3F7' : '#C8E6C9'}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={name}
        subtitle="End-to-End Encrypted Channel"
        showBack={true}
        onBack={() => navigation.goBack()}
      />

      {/* Verified E2EE Pill */}
      <View style={styles.e2eePillWrap}>
        <View style={styles.e2eePill}>
          <Ionicons name="lock-closed" size={12} color={theme.colors.primaryDark} />
          <Text style={styles.e2eePillText}>
            E2EE Active: Messages encrypted on device (TweetNaCl XSalsa20-Poly1305)
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loaderText}>Establishing secure channel & decrypting history...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-checkmark-outline" size={48} color={theme.colors.primary} />
              <Text style={styles.emptyTitle}>Encrypted Channel Initialized</Text>
              <Text style={styles.emptySub}>
                Send the first message. All communication in this channel is encrypted end-to-end.
              </Text>
            </View>
          }
        />
      )}

      {/* Reply Banner */}
      {replyTo && (
        <View style={styles.replyBar}>
          <View style={styles.replyBarTextWrap}>
            <Text style={styles.replyBarLabel}>Replying to {replyTo.senderName}:</Text>
            <Text style={styles.replyBarSnippet} numberOfLines={1}>
              {replyTo.decryptedText}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={
              isAnnouncementOnly && user?.role !== 'ADMIN'
                ? 'Only the Admin / Principal can post in this channel'
                : 'Type encrypted message...'
            }
            placeholderTextColor={theme.colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!isAnnouncementOnly || user?.role === 'ADMIN'}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  e2eePillWrap: {
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: '#E8F5E9',
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  e2eePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  e2eePillText: {
    fontSize: 11,
    fontFamily: theme.typography.fonts.medium,
    color: theme.colors.primaryDark,
  },
  messageList: {
    padding: 16,
    gap: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontFamily: theme.typography.fonts.semibold,
    color: theme.colors.primaryDark,
  },
  messageText: {
    fontSize: 14,
    fontFamily: theme.typography.fonts.regular,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: theme.colors.text,
  },
  replyPreviewInBubble: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    padding: 6,
    borderRadius: 6,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  replyInBubbleText: {
    fontSize: 11,
    fontFamily: theme.typography.fonts.regular,
    color: theme.colors.textSecondary,
  },
  attachmentList: {
    marginTop: 6,
    gap: 4,
  },
  attachmentBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: 6,
    borderRadius: 6,
  },
  attachmentText: {
    fontSize: 11,
    fontFamily: theme.typography.fonts.medium,
    color: theme.colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    fontFamily: theme.typography.fonts.regular,
  },
  timeTextMe: {
    color: '#C8E6C9',
  },
  timeTextOther: {
    color: theme.colors.textMuted,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: theme.typography.fonts.regular,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: theme.typography.fonts.semibold,
    color: theme.colors.primaryDark,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    fontFamily: theme.typography.fonts.regular,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#C8E6C9',
  },
  replyBarTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  replyBarLabel: {
    fontSize: 11,
    fontFamily: theme.typography.fonts.semibold,
    color: theme.colors.primary,
  },
  replyBarSnippet: {
    fontSize: 11,
    fontFamily: theme.typography.fonts.regular,
    color: theme.colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: theme.typography.fonts.regular,
    color: theme.colors.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
});
