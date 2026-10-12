import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header } from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isAi?: boolean;
  isError?: boolean;
}

const DEFAULT_WELCOME_TEXT =
  'Welcome to GASC Connect AI Assistant. I can help you use the college application, understand its features, and troubleshoot application errors. What would you like help with?';

export const AIChatScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const role = user?.role === 'STAFF' || user?.role === 'FACULTY' ? 'STAFF' : user?.role || 'STUDENT';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: DEFAULT_WELCOME_TEXT,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastUserPrompt, setLastUserPrompt] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Suggested prompt pills
  const promptSuggestions = [
    'Who developed GASC Connect?',
    'How do I check my attendance?',
    'How do I access study materials?',
    'How do I use the class chat?',
    'How do I download an available certificate?',
    'Why is my message not sending?',
    ...(role === 'STUDENT'
      ? ['What is my attendance percentage?', 'Show latest circulars']
      : role === 'STAFF'
      ? ['Show my timetable today', 'Which attendance sessions have I logged?']
      : ['Student count by department', 'Published circulars summary']),
  ];

  // Fetch isolated chat history from server on mount
  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get('/ai/chat/history');
      if (res.success && res.data?.messages && res.data.messages.length > 0) {
        setMessages(res.data.messages);
      }
    } catch {
      // Retain default welcome message on offline/fallback
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || loading) return;

    setLastUserPrompt(query);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: query });
      if (res.success && res.data) {
        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: res.data.response || res.data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAi: res.data.source === 'AI',
          isError: false,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `e-${Date.now()}`,
          sender: 'assistant',
          text: res.message || 'Unable to retrieve answer. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        sender: 'assistant',
        text: err.message || 'Network error occurred while contacting AI Assistant. Please check connection.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    Alert.alert('Clear Conversation', 'Do you want to reset your private chat history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete('/ai/chat/history');
          } catch {
            // Ignore server deletion failure on local clear
          }
          setMessages([
            {
              id: `welcome-${Date.now()}`,
              sender: 'assistant',
              text: DEFAULT_WELCOME_TEXT,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        },
      },
    ]);
  };

  const handleCopy = (text: string) => {
    Alert.alert('Message Copied', 'Response text selected for reference.');
  };

  const handleRetry = () => {
    if (lastUserPrompt && !loading) {
      handleSend(lastUserPrompt);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="AI College Assistant"
        subtitle="Government Arts & Science College, Kuthalam"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={handleClearChat}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Clear conversation history"
          >
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      {/* Security & Privacy Banner */}
      <View style={styles.privacyBanner}>
        <Ionicons name="shield-checkmark" size={13} color={theme.colors.primary} style={{ marginRight: 6 }} />
        <Text style={styles.privacyBannerText}>
          Private & Role-Scoped: Answers only from verified college records.
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => {
            const isUser = item.sender === 'user';
            return (
              <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
                {!isUser ? (
                  <View style={[styles.assistantAvatar, item.isError && styles.errorAvatar]}>
                    <Ionicons name={item.isError ? 'alert' : 'school'} size={14} color="#FFFFFF" />
                  </View>
                ) : null}
                <View
                  style={[
                    styles.bubble,
                    isUser
                      ? styles.userBubble
                      : item.isError
                      ? styles.errorBubble
                      : styles.assistantBubble,
                  ]}
                >
                  {!isUser ? (
                    <View style={styles.assistantHeader}>
                      <Text style={styles.assistantName}>GASC Assistant</Text>
                      {item.isAi ? (
                        <View style={styles.aiTag}>
                          <Text style={styles.aiTagText}>AI Model</Text>
                        </View>
                      ) : (
                        <View style={styles.dbTag}>
                          <Text style={styles.dbTagText}>Verified Records</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={() => handleCopy(item.text)}
                        style={styles.copyBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="copy-outline" size={12} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
                    {item.text}
                  </Text>
                  <View style={styles.timeRow}>
                    {item.isError && (
                      <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={handleRetry}
                        disabled={loading}
                      >
                        <Ionicons name="refresh" size={11} color={theme.colors.error} style={{ marginRight: 3 }} />
                        <Text style={styles.retryText}>Retry</Text>
                      </TouchableOpacity>
                    )}
                    <Text style={[styles.timeText, isUser ? styles.userTime : styles.assistantTime]}>
                      {item.timestamp}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            loading ? (
              <View style={styles.loadingRow}>
                <View style={styles.assistantAvatar}>
                  <Ionicons name="school" size={14} color="#FFFFFF" />
                </View>
                <View style={[styles.bubble, styles.assistantBubble, styles.loadingBubble]}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Consulting GASC Knowledge Base...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Suggestion Chips */}
        <View style={styles.suggestionsContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={promptSuggestions}
            keyExtractor={(s, idx) => `sug-${idx}`}
            contentContainerStyle={styles.suggestionsList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionChip}
                onPress={() => handleSend(item)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons name="sparkles-outline" size={12} color={theme.colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.suggestionText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask about attendance, timetable, chat, or errors..."
            placeholderTextColor={theme.colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || loading}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={16} color="#FFFFFF" />
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
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  privacyBannerText: {
    fontSize: 11,
    color: '#2E7D32',
    fontFamily: theme.typography.families.primaryMedium,
  },
  clearBtn: {
    padding: 6,
    borderRadius: theme.borderRadius.sm,
  },
  messageList: {
    padding: 14,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 4,
  },
  errorAvatar: {
    backgroundColor: theme.colors.error,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 2,
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomLeftRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  errorBubble: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
    borderBottomLeftRadius: 2,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  assistantName: {
    fontFamily: theme.typography.families.primaryBold,
    fontSize: 11,
    color: theme.colors.primaryDark,
    marginRight: 6,
  },
  aiTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  aiTagText: {
    fontSize: 9,
    fontFamily: theme.typography.families.primaryBold,
    color: theme.colors.primary,
  },
  dbTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  dbTagText: {
    fontSize: 9,
    fontFamily: theme.typography.families.primaryBold,
    color: '#1565C0',
  },
  copyBtn: {
    marginLeft: 'auto',
    padding: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.typography.families.primary,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: theme.colors.text,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    fontFamily: theme.typography.families.primary,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  assistantTime: {
    color: theme.colors.textSecondary,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  retryText: {
    fontSize: 10,
    color: theme.colors.error,
    fontFamily: theme.typography.families.primaryBold,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.families.primary,
  },
  suggestionsContainer: {
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  suggestionsList: {
    paddingHorizontal: 12,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontFamily: theme.typography.families.primaryMedium,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.typography.families.primary,
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#B2DFDB',
  },
});
